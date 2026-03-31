import type { TimetableCourseInput } from "@/lib/types/input";

import { getLlmProvider } from "@/lib/llm/provider";
import { withTraceObservation } from "@/lib/observability/langfuse";
import { courseDetailDraftExtractionResultSchema } from "@/lib/schema/extraction";

const COURSE_DETAIL_SYSTEM_PROMPT = `You extract course-detail draft fields into strict JSON.
Return one object with keys: draft, warnings, missing_fields.
The draft object must use internal backend field names exactly.
Only include fields you can infer from the text; omit uncertain fields instead of guessing.
Preserve course_name_ref exactly as given.
Do not fabricate required user-judgment fields when the text does not support them.`;

function formatTimetableContext(course: TimetableCourseInput | undefined): string {
  if (!course) {
    return "No structured timetable context provided.";
  }

  return JSON.stringify(course, null, 2);
}

export async function extractCourseDetailDraftFromLlm(input: {
  course_name_ref: string;
  raw_text: string;
  timetable_context?: TimetableCourseInput;
}) {
  return withTraceObservation(
    "course_detail.extract",
    {
      initialUpdate: {
        input: {
          course_name_ref: input.course_name_ref,
          raw_text_length: input.raw_text.length,
          has_timetable_context: Boolean(input.timetable_context)
        }
      }
    },
    async (trace) => {
      const provider = getLlmProvider();
      const rawResult = await provider.generateObject({
        schemaName: "CourseDetailDraftExtractionResult",
        schemaDescription: "Return only strict JSON for one course detail draft.",
        responseSchema: courseDetailDraftExtractionResultSchema,
        systemPrompt: COURSE_DETAIL_SYSTEM_PROMPT,
        userPrompt: `Extract a structured course-detail draft for the course named ${input.course_name_ref}.\n\nTimetable context:\n${formatTimetableContext(
          input.timetable_context
        )}\n\nRaw course text:\n${input.raw_text}`
      });

      const parsed = courseDetailDraftExtractionResultSchema.parse(rawResult);
      trace.update({
        output: {
          warning_count: parsed.warnings.length,
          missing_field_count: parsed.missing_fields.length
        }
      });

      return parsed;
    }
  );
}
