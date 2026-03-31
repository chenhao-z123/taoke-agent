import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetLlmProviderForTests,
  setLlmProviderForTests
} from "../../src/lib/llm/provider";
import * as langfuseObservability from "../../src/lib/observability/langfuse";
import { extractCourseDetailDraft } from "../../src/server/actions/extract-course-detail-draft";

afterEach(() => {
  resetLlmProviderForTests();
  vi.restoreAllMocks();
});

describe("extractCourseDetailDraft", () => {
  it("extracts a validated course-detail draft for one course", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        draft: {
          course_name_ref: "Intro Math",
          course_class: "core",
          attendance_modes: ["paper_sign_in_before_class"],
          field_confidence: "medium",
          absence_rule_confidence: "medium",
          key_session_types: ["exam_hint_or_material_session"],
          sign_in_then_leave_feasibility: "maybe"
        },
        warnings: [],
        missing_fields: ["personal_fail_risk"]
      })
    });

    const result = await extractCourseDetailDraft({
      course_name_ref: "Intro Math",
      raw_text: "Paper sign-in before class. Exam hints near finals."
    });

    expect(result.draft.course_name_ref).toBe("Intro Math");
    expect(result.draft.attendance_modes).toEqual(["paper_sign_in_before_class"]);
    expect(result.missing_fields).toContain("personal_fail_risk");
  });

  it("rejects invalid course-detail draft output before returning it", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        draft: {
          course_name_ref: "Intro Math",
          attendance_modes: ["not_a_real_mode"]
        },
        warnings: [],
        missing_fields: []
      })
    });

    await expect(
      extractCourseDetailDraft({
        course_name_ref: "Intro Math",
        raw_text: "Bad output"
      })
    ).rejects.toThrow();
  });

  it("flushes Langfuse tracing after course detail extraction", async () => {
    const flushSpy = vi.spyOn(langfuseObservability, "flushLangfuseTracing");

    setLlmProviderForTests({
      generateObject: async () => ({
        draft: {
          course_name_ref: "Intro Math",
          course_class: "core",
          attendance_modes: ["paper_sign_in_before_class"],
          field_confidence: "medium",
          absence_rule_confidence: "medium",
          key_session_types: ["exam_hint_or_material_session"],
          sign_in_then_leave_feasibility: "maybe"
        },
        warnings: [],
        missing_fields: []
      })
    });

    await extractCourseDetailDraft({
      course_name_ref: "Intro Math",
      raw_text: "Paper sign-in before class."
    });

    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});
