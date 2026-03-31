import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetLlmProviderForTests,
  setLlmProviderForTests
} from "../../src/lib/llm/provider";
import {
  resetLangfuseDiagnosticsForTests,
  resetTraceDelegateForTests,
  setTraceDelegateForTests,
  type TraceUpdate
} from "../../src/lib/observability/langfuse";
import * as langfuseObservability from "../../src/lib/observability/langfuse";
import { extractImportedTimetable } from "../../src/server/actions/extract-imported-timetable";

afterEach(() => {
  resetLlmProviderForTests();
  resetTraceDelegateForTests();
  resetLangfuseDiagnosticsForTests();
  vi.restoreAllMocks();
});

beforeEach(() => {
  setTraceDelegateForTests({
    withObservation: async (_name, _options, callback) =>
      callback({
        update: () => {}
      })
  });
});

describe("extractImportedTimetable", () => {
  it("extracts timetable courses from a screenshot request", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Computer Networks",
            time_slots: [
              {
                day_of_week: 4,
                start_time: "10:00",
                end_time: "11:35"
              }
            ],
            location: "Lab 302"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      image_data_url: "data:image/png;base64,ZmFrZS1zY3JlZW5zaG90"
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]?.course_name).toBe("Computer Networks");
  });

  it("emits semantic trace steps for screenshot extraction", async () => {
    const observedNames: string[] = [];
    const updates: TraceUpdate[] = [];
    setTraceDelegateForTests({
      withObservation: async (name, _options, callback) => {
        observedNames.push(name);
        return callback({
          update: (update) => {
            updates.push(update);
          }
        });
      }
    });

    let callCount = 0;
    setLlmProviderForTests({
      generateObject: async () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            raw_text: "Mon 9:00-10:00 Linear Algebra Room 204",
            warnings: []
          };
        }

        return {
          courses: [
            {
              course_name: "Linear Algebra",
              time_slots: [
                {
                  day_of_week: 1,
                  start_time: "09:00",
                  end_time: "10:00"
                }
              ],
              location: "Room 204"
            }
          ],
          malformed_rows: [],
          warnings: []
        };
      }
    });

    await extractImportedTimetable({
      image_data_url: "data:image/png;base64,ZmFrZS1zY3JlZW5zaG90"
    });

    expect(observedNames).toEqual([
      "timetable.extract",
      "timetable.screenshot_stage1",
      "timetable.screenshot_stage2"
    ]);
    expect(updates.some((update) => update.output)).toBe(true);
  });

  it("exposes debug raw output on successful extraction", async () => {
    const rawResult = {
      courses: [
        {
          course_name: "Database Systems",
          time_slots: [
            {
              day_of_week: 2,
              start_time: "08:00",
              end_time: "09:35"
            }
          ],
          location: "Room 210"
        }
      ],
      malformed_rows: [],
      warnings: []
    };

    setLlmProviderForTests({
      generateObject: async () => rawResult
    });

    const result = await extractImportedTimetable({
      raw_text: "Database Systems Tuesday 08:00-09:35"
    });

    expect(result.courses).toHaveLength(1);
    expect((result as { raw_output?: string }).raw_output).toBe(
      JSON.stringify(rawResult, null, 2)
    );
  });

  it("performs staged screenshot extraction and preserves warnings", async () => {
    const requests: Array<{
      userImageDataUrl?: string;
      userPrompt: string;
      systemPrompt: string;
    }> = [];

    setLlmProviderForTests({
      generateObject: async (request) => {
        requests.push({
          userImageDataUrl: request.userImageDataUrl,
          userPrompt: request.userPrompt,
          systemPrompt: request.systemPrompt
        });

        if (requests.length === 1) {
          return {
            raw_text: "Mon 9:00-10:00 Linear Algebra Room 204",
            warnings: ["Low contrast screenshot"]
          };
        }

        return {
          courses: [
            {
              course_name: "Linear Algebra",
              time_slots: [
                {
                  day_of_week: 1,
                  start_time: "09:00",
                  end_time: "10:00"
                }
              ],
              location: "Room 204"
            }
          ],
          malformed_rows: [],
          warnings: ["Ambiguous week range"]
        };
      }
    });

    const result = await extractImportedTimetable({
      image_data_url: "data:image/png;base64,ZmFrZS1zY3JlZW5zaG90"
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]?.userImageDataUrl).toBe(
      "data:image/png;base64,ZmFrZS1zY3JlZW5zaG90"
    );
    expect(requests[0]?.systemPrompt).toContain("top to bottom");
    expect(requests[0]?.systemPrompt).toContain("table");
    expect(requests[1]?.userImageDataUrl).toBeUndefined();
    expect(requests[1]?.userPrompt).toContain(
      "Mon 9:00-10:00 Linear Algebra Room 204"
    );
    expect(result.warnings).toEqual([
      "Low contrast screenshot",
      "Ambiguous week range"
    ]);
  });

  it("treats blank raw_text as absent when screenshot input is provided", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Computer Networks",
            time_slots: [
              {
                day_of_week: 4,
                start_time: "10:00",
                end_time: "11:35"
              }
            ],
            location: "Lab 302"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "",
      image_data_url: "data:image/png;base64,ZmFrZS1zY3JlZW5zaG90"
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]?.course_name).toBe("Computer Networks");
  });

  it("extracts timetable courses into validated structured JSON", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Linear Algebra",
            time_slots: [
              {
                day_of_week: 1,
                time: "09:00-10:30"
              }
            ],
            location: "Room 204",
            teacher_name: "Dr. Wang",
            week_range: {
              start_week: 5,
              end_week: 12
            },
            course_type_or_credit: "elective"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "Linear Algebra Monday 09:00 Room 204"
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]?.course_name).toBe("Linear Algebra");
    expect(result.malformed_rows).toEqual([]);
  });

  it("normalizes OCR weekday text and non-HH:MM times before validation", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Computer Networks",
            time_slots: [
              {
                day_of_week: 4,
                time: "10:00-11:35"
              }
            ],
            location: "Lab 302"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "Data Structures Tuesday 9am-11:35 Room 105"
    });

    expect(result.courses[0]?.time_slots[0]).toEqual({
      day_of_week: 2,
      start_time: "09:00",
      end_time: "11:35"
    });
  });

  it("normalizes chinese weekday text and short time format before validation", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Operating Systems",
            time_slots: [
              {
                day_of_week: "周二",
                start_time: "9:00",
                end_time: "10:35"
              }
            ],
            location: "Room 305"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "Operating Systems 周二 9:00-10:35 Room 305"
    });

    expect(result.courses[0]?.time_slots[0]).toEqual({
      day_of_week: 2,
      start_time: "09:00",
      end_time: "10:35"
    });
  });

  it("rejects invalid top-level timetable output before returning it", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: "not-an-array",
        malformed_rows: [],
        warnings: []
      })
    });

    await expect(
      extractImportedTimetable({
        raw_text: "Broken Course"
      })
    ).rejects.toThrow();
  });

  it("includes a readable summary and raw payload when LLM output is invalid", async () => {
    const rawOutput = {
      courses: "not-an-array",
      malformed_rows: [],
      warnings: ["BAD_OUTPUT_MARKER"]
    };

    setLlmProviderForTests({
      generateObject: async () => rawOutput
    });

    let caughtError: unknown;

    try {
      await extractImportedTimetable({
        raw_text: "Broken Course"
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);

    const message = (caughtError as Error).message;
    expect(message).toContain("Invalid timetable extraction result");
    expect(message).toContain("BAD_OUTPUT_MARKER");
  });

  it("normalizes string week_range and blank course_type_or_credit from LLM output", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Advanced Physics",
            time_slots: [
              {
                day_of_week: 2,
                start_time: "14:00",
                end_time: "15:35"
              }
            ],
            week_range: "1-16周",
            course_type_or_credit: ""
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "Advanced Physics Tuesday 14:00"
    });

    expect(result.courses[0]?.week_range).toEqual({
      start_week: 1,
      end_week: 16
    });
    expect(result.courses[0]?.course_type_or_credit).toBeUndefined();
  });

  it("keeps courses with valid core fields even when optional fields are malformed", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Advanced Physics",
            time_slots: [
              {
                day_of_week: 2,
                start_time: "14:00",
                end_time: "15:35"
              }
            ],
            week_range: "unknown weeks",
            location: "   ",
            teacher_name: 42,
            course_type_or_credit: "  "
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "Advanced Physics Tuesday 14:00"
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]).toMatchObject({
      course_name: "Advanced Physics",
      time_slots: [
        {
          day_of_week: 2,
          start_time: "14:00",
          end_time: "15:35"
        }
      ],
      week_range: undefined,
      location: undefined,
      teacher_name: undefined,
      course_type_or_credit: undefined
    });
  });

  it("keeps valid courses and demotes invalid rows into malformed_rows instead of throwing", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Algorithms",
            time_slots: [
              {
                day_of_week: 1,
                start_time: "08:00",
                end_time: "09:35"
              }
            ]
          },
          {
            course_name: "Broken Course",
            time_slots: []
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: "Algorithms Monday 08:00\nBroken Course"
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]?.course_name).toBe("Algorithms");
    expect(result.malformed_rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: expect.stringContaining("Broken Course"),
          reason: expect.stringContaining("time_slots")
        })
      ])
    );
  });

  it("rejects requests without raw text or screenshot input", async () => {
    await expect(
      extractImportedTimetable({
        related_context: "just context"
      })
    ).rejects.toThrow();
  });

  it("flushes Langfuse tracing after a successful extraction", async () => {
    const flushSpy = vi.spyOn(langfuseObservability, "flushLangfuseTracing");

    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Compiler Design",
            time_slots: [
              {
                day_of_week: 1,
                start_time: "10:00",
                end_time: "11:35"
              }
            ],
            location: "Room 402"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    await extractImportedTimetable({
      raw_text: "Compiler Design Monday 10:00-11:35 Room 402"
    });

    expect(flushSpy).toHaveBeenCalledTimes(1);
  });

  it("extracts timetable from table-structured raw text with first column headers", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        courses: [
          {
            course_name: "Math 101",
            time_slots: [
              {
                day_of_week: 1,
                start_time: "09:00",
                end_time: "10:30"
              }
            ],
            location: "Room 201"
          },
          {
            course_name: "Physics 102", 
            time_slots: [
              {
                day_of_week: 2,
                start_time: "09:00",
                end_time: "10:30"
              }
            ],
            location: "Lab 302"
          }
        ],
        malformed_rows: [],
        warnings: []
      })
    });

    const result = await extractImportedTimetable({
      raw_text: `Period | Monday      | Tuesday      
1-2    | Math 101    | Physics 102  
       | Room 201    | Lab 302      `
    });

    expect(result.courses).toHaveLength(2);
    expect(result.courses[0]?.course_name).toBe("Math 101");
    expect(result.courses[0]?.time_slots[0]?.day_of_week).toBe(1);
    expect(result.courses[1]?.course_name).toBe("Physics 102");
    expect(result.courses[1]?.time_slots[0]?.day_of_week).toBe(2);
  });

  it("flushes Langfuse tracing after a failed extraction", async () => {
    const flushSpy = vi.spyOn(langfuseObservability, "flushLangfuseTracing");

    setLlmProviderForTests({
      generateObject: async () => ({
        courses: "not-an-array",
        malformed_rows: [],
        warnings: []
      })
    });

    await expect(
      extractImportedTimetable({
        raw_text: "Broken Course"
      })
    ).rejects.toThrow();

    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});
