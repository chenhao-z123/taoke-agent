import { z } from "zod";

import { getLlmProvider } from "@/lib/llm/provider";
import { withTraceObservation } from "@/lib/observability/langfuse";
import {
  extractedCourseTypeOrCreditSchema,
  extractedTimeSlotSchema,
  extractedWeekRangeSchema,
  optionalNonEmptyStringSchema,
  timetableExtractionResultSchema
} from "@/lib/schema/extraction";

const TIMETABLE_SYSTEM_PROMPT = `You extract timetable data into strict JSON.
Use these field names exactly: courses, malformed_rows, warnings.
Each course must use internal keys: course_name, time_slots, location, teacher_name, week_range, course_type_or_credit.
Each time slot must use day_of_week (0=Sun, 1=Mon, ... 6=Sat) and time (e.g., "第一.二节", "第三节课", "9:00-10:30").
When processing table-structured input with row headers (time periods) and column headers (weekdays),
combine the appropriate row and column headers with each course entry to determine the correct day_of_week and time string.
If a row cannot be parsed confidently, put it into malformed_rows with row and reason instead of inventing values.`;

const SCREENSHOT_STAGE1_SYSTEM_PROMPT = `You extract readable timetable text from screenshots or spreadsheet tables.
Return strict JSON with raw_text and warnings.
Read the input like a timetable table: scan top to bottom and left to right.
Use table structure, headers, and aligned cells instead of linear order alone.
When the table has row headers in the first column (like time periods) and column headers in the first row (like weekdays),
preserve the complete table structure with all cells (including empty ones) separated by " | ".
This preserves the relationship between row headers and column headers for accurate course mapping.
raw_text should be a clean, line-separated transcription of the timetable content.
warnings should mention any OCR uncertainty, merged-cell ambiguity, or missing context.`;

const screenshotStage1Schema = z.object({
  raw_text: z.string().default(""),
  warnings: z.array(z.string()).default([])
});

export async function extractTimetableFromLlm(input: {
  raw_text?: string;
  image_data_url?: string;
  related_context?: string;
}) {
  const serializeRawResult = (rawResult: unknown) => {
    try {
      return JSON.stringify(rawResult, null, 2);
    } catch (error) {
      return String(rawResult);
    }
  };

  const parseTimetableResult = (rawResult: unknown) => {
    const strict = timetableExtractionResultSchema.safeParse(rawResult);
    if (strict.success) {
      return {
        ...strict.data,
        raw_output: serializeRawResult(rawResult)
      };
    }

    if (!rawResult || typeof rawResult !== "object" || Array.isArray(rawResult)) {
      const serializedPayload = serializeRawResult(rawResult);
      throw new Error(`Invalid timetable extraction result. RAW_OUTPUT: ${serializedPayload}`);
    }

    const payload = rawResult as Record<string, unknown>;
    if (!Array.isArray(payload.courses)) {
      const serializedPayload = serializeRawResult(rawResult);
      throw new Error(`Invalid timetable extraction result. RAW_OUTPUT: ${serializedPayload}`);
    }

    const warnings = Array.isArray(payload.warnings)
      ? payload.warnings.filter((warning): warning is string => typeof warning === "string")
      : [];
    const malformedRows = Array.isArray(payload.malformed_rows)
      ? payload.malformed_rows.flatMap((row) => {
          const parsedRow = z
            .object({ row: z.string().min(1), reason: z.string().min(1) })
            .safeParse(row);
          return parsedRow.success ? [parsedRow.data] : [];
        })
      : [];

    const courses = payload.courses.flatMap((rawCourse) => {
      if (!rawCourse || typeof rawCourse !== "object" || Array.isArray(rawCourse)) {
        malformedRows.push({
          row: serializeRawResult(rawCourse),
          reason: "Course entry is not an object"
        });
        return [];
      }

      const course = rawCourse as Record<string, unknown>;
      const courseName =
        typeof course.course_name === "string" ? course.course_name.trim() : undefined;
      const rawTimeSlots = Array.isArray(course.time_slots) ? course.time_slots : [];
      const parsedTimeSlots = rawTimeSlots.flatMap((slot) => {
        const parsedSlot = extractedTimeSlotSchema.safeParse(slot);
        return parsedSlot.success ? [parsedSlot.data] : [];
      });

      const issues: string[] = [];
      if (!courseName) {
        issues.push("course_name is required");
      }
      if (parsedTimeSlots.length === 0) {
        issues.push("time_slots must contain at least one valid entry");
      }

      if (issues.length > 0) {
        malformedRows.push({
          row: serializeRawResult(rawCourse),
          reason: issues.join("; ")
        });
        return [];
      }

      const finalizedCourseName = courseName;

      const location = optionalNonEmptyStringSchema.safeParse(course.location);
      const teacherName = optionalNonEmptyStringSchema.safeParse(course.teacher_name);
      const weekRange = extractedWeekRangeSchema.safeParse(course.week_range);
      const courseTypeOrCredit = extractedCourseTypeOrCreditSchema.safeParse(
        course.course_type_or_credit
      );

      return [
        timetableExtractionResultSchema.shape.courses.element.parse({
          course_name: finalizedCourseName,
          time_slots: parsedTimeSlots,
          location: location.success ? location.data : undefined,
          teacher_name: teacherName.success ? teacherName.data : undefined,
          week_range: weekRange.success ? weekRange.data : undefined,
          course_type_or_credit: courseTypeOrCredit.success
            ? courseTypeOrCredit.data
            : undefined
        })
      ];
    });

    return {
      courses,
      malformed_rows: malformedRows,
      warnings,
      raw_output: serializeRawResult(rawResult)
    };
  };
  const provider = getLlmProvider();
  const relatedContextSection = input.related_context
    ? `\n\nRelated context:\n${input.related_context}`
    : "";
  const hasRawText = Boolean(input.raw_text);
  const shouldUseScreenshotStages = Boolean(input.image_data_url) && !hasRawText;

  return withTraceObservation(
    "timetable.extract",
    {
      initialUpdate: {
        input: {
          has_raw_text: hasRawText,
          has_image_input: Boolean(input.image_data_url),
          has_related_context: Boolean(input.related_context)
        }
      }
    },
    async (trace) => {
      if (shouldUseScreenshotStages) {
        const stage1Result = await withTraceObservation(
          "timetable.screenshot_stage1",
          {
            initialUpdate: {
              input: {
                has_image_input: true,
                has_related_context: Boolean(input.related_context)
              }
            }
          },
          async (stageTrace) => {
            const rawResult = await provider.generateObject({
              schemaName: "TimetableScreenshotExtraction",
              schemaDescription: "Return only strict JSON for screenshot transcription.",
              responseSchema: screenshotStage1Schema,
              systemPrompt: SCREENSHOT_STAGE1_SYSTEM_PROMPT,
              userPrompt: `Extract raw timetable text from the attached screenshot.${relatedContextSection}`,
              userImageDataUrl: input.image_data_url
            });

            const parsed = screenshotStage1Schema.parse(rawResult);
            
            // Log raw_text for debugging
            console.debug("[timetable-llm] Stage 1 extracted raw_text length:", parsed.raw_text.length);
            
            if (!parsed.raw_text || parsed.raw_text.trim().length === 0) {
              console.warn("[timetable-llm] Stage 1 extracted empty raw_text - this may cause Stage 2 to fail");
            }
            
            stageTrace.update({
              output: {
                raw_text_length: parsed.raw_text.length,
                warning_count: parsed.warnings.length
              }
            });
            return parsed;
          }
        );

        const stage2Result = await withTraceObservation(
          "timetable.screenshot_stage2",
          {
            initialUpdate: {
              input: {
                raw_text_length: stage1Result.raw_text.length,
                stage1_warning_count: stage1Result.warnings.length
              }
            }
          },
          async (stageTrace) => {
            const stage2UserPrompt = `Extract structured timetable data from the following raw text transcribed from a screenshot:\n\n${stage1Result.raw_text}${relatedContextSection}`;
            
            // Log Stage 2 prompt for debugging
            console.debug("[timetable-llm] Stage 2 user prompt length:", stage2UserPrompt.length);
            
            const rawResult = await provider.generateObject({
              schemaName: "TimetableExtractionResult",
              schemaDescription: "Return only strict JSON for timetable extraction.",
              responseSchema: timetableExtractionResultSchema,
              systemPrompt: TIMETABLE_SYSTEM_PROMPT,
              userPrompt: stage2UserPrompt
            });

            const parsed = parseTimetableResult(rawResult);
            stageTrace.update({
              output: {
                course_count: parsed.courses.length,
                malformed_row_count: parsed.malformed_rows.length,
                warning_count: parsed.warnings.length
              }
            });
            return parsed;
          }
        );

        const result = {
          ...stage2Result,
          warnings: [...stage1Result.warnings, ...stage2Result.warnings]
        };

        trace.update({
          output: {
            course_count: result.courses.length,
            malformed_row_count: result.malformed_rows.length,
            warning_count: result.warnings.length
          }
        });

        return result;
      }

      const contentDescription = hasRawText
        ? `the following raw text:\n\n${input.raw_text}`
        : "the attached timetable screenshot";

      const parsed = await withTraceObservation(
        "timetable.direct_extraction",
        {
          initialUpdate: {
            input: {
              has_raw_text: hasRawText,
              has_image_input: Boolean(input.image_data_url)
            }
          }
        },
        async (stageTrace) => {
          const rawResult = await provider.generateObject({
            schemaName: "TimetableExtractionResult",
            schemaDescription: "Return only strict JSON for timetable extraction.",
            responseSchema: timetableExtractionResultSchema,
            systemPrompt: TIMETABLE_SYSTEM_PROMPT,
            userPrompt: `Extract structured timetable data from ${contentDescription}${relatedContextSection}`,
            userImageDataUrl: hasRawText ? undefined : input.image_data_url
          });

          const parsedResult = parseTimetableResult(rawResult);
          stageTrace.update({
            output: {
              course_count: parsedResult.courses.length,
              malformed_row_count: parsedResult.malformed_rows.length,
              warning_count: parsedResult.warnings.length
            }
          });
          return parsedResult;
        }
      );

      trace.update({
        output: {
          course_count: parsed.courses.length,
          malformed_row_count: parsed.malformed_rows.length,
          warning_count: parsed.warnings.length
        }
      });

      return parsed;
    }
  );
}