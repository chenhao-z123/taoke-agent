import { afterEach, describe, expect, it } from "vitest";

import {
  debateReviewSchema,
  judgeSelectionResultSchema
} from "../../src/lib/schema/planning-llm";
import {
  resetLlmProviderForTests,
  setLlmProviderForTests
} from "../../src/lib/llm/provider";
import {
  resetTraceDelegateForTests,
  setTraceDelegateForTests
} from "../../src/lib/observability/langfuse";
import type { DebateInput } from "../../src/lib/debate/protocol";
import type {
  CandidatePlan,
  DebateReview,
  JudgeSelectionResult,
  OccurrenceContext
} from "../../src/lib/types/decision";
import type {
  CourseDetailInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";
import { reviewCandidatesAsAcademicGuardianWithLlm } from "../../src/lib/agents/llm-academic-guardian";
import { reviewCandidatesAsExecutionRealistWithLlm } from "../../src/lib/agents/llm-execution-realist";
import { reviewCandidatesAsTimeMaximizerWithLlm } from "../../src/lib/agents/llm-time-maximizer";
import { selectCandidateWithLlmJudge } from "../../src/lib/agents/llm-judge";

afterEach(() => {
  resetLlmProviderForTests();
  resetTraceDelegateForTests();
});

function makeContexts(): OccurrenceContext[] {
  const course: TimetableCourseInput = {
    course_name: "Core Theory",
    time_slots: [{ day_of_week: 1, time: "第一.二节" }],
    location: "Campus"
  };

  const userProfile: UserProfileInput = {
    planning_mode: "safe_max_mode",
    strategy_tier: "balanced",
    risk_tier: "medium",
    execution_pressure: "medium",
    score_buffer_preference: "some",
    prefer_large_blocks: false,
    prefer_skip_early_classes: false,
    prefer_skip_late_classes: false,
    substitute_attendance_enabled: true,
    substitute_attendance_default_cost: 40,
    sign_in_then_leave_willingness: true,
    retroactive_remedy_enabled: false
  };

  const courseDetails: CourseDetailInput = {
    course_name_ref: "Core Theory",
    course_class: "core",
    course_target_level: "pass_only",
    personal_fail_risk: "unlikely_to_fail",
    attendance_modes: ["visual_or_verbal_confirmation"],
    field_confidence: "high",
    absence_rule_confidence: "high",
    sign_in_then_leave_feasibility: "maybe",
    escape_feasibility_tier: "medium"
  };

  return [
    {
      course,
      course_details: courseDetails,
      user_profile: userProfile,
      planning_mode: userProfile.planning_mode,
      free_time_target: userProfile.free_time_target,
      semester_phase: "normal_release",
      occurrence_week: 3,
      occurrence: { date: "2026-03-23", time_slot: "08:00-09:35" }
    }
  ];
}

function makeCandidates(): CandidatePlan[] {
  return [
    {
      candidate_id: "candidate-a",
      items: [
        {
          course_id: "Core Theory",
          action: "attend_full",
          occurrence: { date: "2026-03-23", time_slot: "08:00-09:35" },
          execution_note: "Attend to stay safe."
        }
      ],
      summary_note: "Safe option"
    },
    {
      candidate_id: "candidate-b",
      items: [
        {
          course_id: "Core Theory",
          action: "skip",
          occurrence: { date: "2026-03-23", time_slot: "08:00-09:35" },
          execution_note: "Skip to save time."
        }
      ],
      summary_note: "Time option"
    }
  ];
}

function makeDebateInput(): DebateInput {
  const contexts = makeContexts();

  return {
    contexts,
    candidates: makeCandidates(),
    planning_mode: contexts[0].planning_mode,
    semester_phase: contexts[0].semester_phase,
    short_term_modifiers: contexts[0].short_term_modifiers
  };
}

function makeDebateReview(role: DebateReview["agent_role"]): DebateReview {
  return {
    agent_role: role,
    preferred_candidate_ids: ["candidate-a", "candidate-b"],
    strongest_objections: ["Risk"],
    strongest_supports: ["Benefit"],
    warning_flags: []
  };
}

describe("planning-llm schemas", () => {
  describe("debateReviewSchema", () => {
    it("parses valid debate review", () => {
      const validReview = {
        agent_role: "academic_guardian",
        preferred_candidate_ids: ["candidate-1", "candidate-2"],
        strongest_objections: ["Risk of failure"],
        strongest_supports: ["Saves time"],
        warning_flags: ["High risk"]
      };

      const result = debateReviewSchema.safeParse(validReview);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.agent_role).toBe("academic_guardian");
        expect(result.data.preferred_candidate_ids).toEqual(["candidate-1", "candidate-2"]);
        expect(result.data.strongest_objections).toEqual(["Risk of failure"]);
        expect(result.data.strongest_supports).toEqual(["Saves time"]);
        expect(result.data.warning_flags).toEqual(["High risk"]);
      }
    });

    it("parses valid debate review with all agent roles", () => {
      const roles = ["academic_guardian", "time_maximizer", "execution_realist"] as const;

      for (const role of roles) {
        const validReview = {
          agent_role: role,
          preferred_candidate_ids: ["candidate-1"],
          strongest_objections: ["Objection"],
          strongest_supports: ["Support"],
          warning_flags: []
        };

        const result = debateReviewSchema.safeParse(validReview);
        expect(result.success).toBe(true);
      }
    });

    it("fails when agent_role is invalid", () => {
      const invalidReview = {
        agent_role: "invalid_role",
        preferred_candidate_ids: ["candidate-1"],
        strongest_objections: ["Objection"],
        strongest_supports: ["Support"],
        warning_flags: []
      };

      const result = debateReviewSchema.safeParse(invalidReview);
      expect(result.success).toBe(false);
    });

    it("fails when required fields are missing", () => {
      const incompleteReview = {
        agent_role: "academic_guardian",
        preferred_candidate_ids: ["candidate-1"]
        // missing strongest_objections, strongest_supports, warning_flags
      };

      const result = debateReviewSchema.safeParse(incompleteReview);
      expect(result.success).toBe(false);
    });

    it("parses with optional missing_info_notes field", () => {
      const reviewWithOptional = {
        agent_role: "time_maximizer",
        preferred_candidate_ids: ["candidate-1"],
        strongest_objections: ["Objection"],
        strongest_supports: ["Support"],
        warning_flags: ["Warning"],
        missing_info_notes: ["Need more data"]
      };

      const result = debateReviewSchema.safeParse(reviewWithOptional);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.missing_info_notes).toEqual(["Need more data"]);
      }
    });

    it("parses when optional missing_info_notes is omitted", () => {
      const reviewWithoutOptional = {
        agent_role: "execution_realist",
        preferred_candidate_ids: ["candidate-1"],
        strongest_objections: ["Objection"],
        strongest_supports: ["Support"],
        warning_flags: ["Warning"]
      };

      const result = debateReviewSchema.safeParse(reviewWithoutOptional);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.missing_info_notes).toBeUndefined();
      }
    });
  });

  describe("judgeSelectionResultSchema", () => {
    it("parses valid judge selection result", () => {
      const validResult = {
        selected_candidate_id: "candidate-1",
        rationale: "Best balance of factors",
        confidence: "high"
      };

      const result = judgeSelectionResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selected_candidate_id).toBe("candidate-1");
        expect(result.data.rationale).toBe("Best balance of factors");
        expect(result.data.confidence).toBe("high");
      }
    });

    it("parses with all confidence levels", () => {
      const confidences = ["low", "medium", "high"] as const;

      for (const confidence of confidences) {
        const validResult = {
          selected_candidate_id: "candidate-1",
          rationale: "Test rationale",
          confidence
        };

        const result = judgeSelectionResultSchema.safeParse(validResult);
        expect(result.success).toBe(true);
      }
    });

    it("fails when selected_candidate_id is missing", () => {
      const invalidResult = {
        rationale: "Test rationale",
        confidence: "high"
        // missing selected_candidate_id
      };

      const result = judgeSelectionResultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it("fails when confidence is invalid", () => {
      const invalidResult = {
        selected_candidate_id: "candidate-1",
        rationale: "Test rationale",
        confidence: "invalid_confidence"
      };

      const result = judgeSelectionResultSchema.safeParse(invalidResult);
      expect(result.success).toBe(false);
    });

    it("parses with optional fallback_candidate_id", () => {
      const resultWithFallback = {
        selected_candidate_id: "candidate-1",
        rationale: "Primary choice",
        confidence: "high",
        fallback_candidate_id: "candidate-2"
      };

      const result = judgeSelectionResultSchema.safeParse(resultWithFallback);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fallback_candidate_id).toBe("candidate-2");
      }
    });

    it("parses when optional fallback_candidate_id is omitted", () => {
      const resultWithoutFallback = {
        selected_candidate_id: "candidate-1",
        rationale: "Primary choice",
        confidence: "high"
      };

      const result = judgeSelectionResultSchema.safeParse(resultWithoutFallback);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fallback_candidate_id).toBeUndefined();
      }
    });

    it("parses with optional user_facing_summary", () => {
      const resultWithSummary = {
        selected_candidate_id: "candidate-1",
        rationale: "Internal rationale",
        confidence: "medium",
        user_facing_summary: "User-friendly explanation"
      };

      const result = judgeSelectionResultSchema.safeParse(resultWithSummary);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user_facing_summary).toBe("User-friendly explanation");
      }
    });

    it("parses when optional user_facing_summary is omitted", () => {
      const resultWithoutSummary = {
        selected_candidate_id: "candidate-1",
        rationale: "Internal rationale",
        confidence: "medium"
      };

      const result = judgeSelectionResultSchema.safeParse(resultWithoutSummary);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user_facing_summary).toBeUndefined();
      }
    });

    it("parses with all optional fields present", () => {
      const fullResult = {
        selected_candidate_id: "candidate-1",
        rationale: "Complete rationale",
        confidence: "high",
        fallback_candidate_id: "candidate-2",
        user_facing_summary: "Summary for user"
      };

      const result = judgeSelectionResultSchema.safeParse(fullResult);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fallback_candidate_id).toBe("candidate-2");
        expect(result.data.user_facing_summary).toBe("Summary for user");
      }
    });
  });
});

describe("planning-llm wrappers", () => {
  it("calls provider and returns parsed academic guardian review", async () => {
    let capturedPrompt = "";

    setLlmProviderForTests({
      generateObject: async ({ systemPrompt, userPrompt }) => {
        capturedPrompt = `${systemPrompt}\n${userPrompt}`;
        return makeDebateReview("academic_guardian");
      }
    });

    const result = await reviewCandidatesAsAcademicGuardianWithLlm(makeDebateInput());

    expect(result.agent_role).toBe("academic_guardian");
    expect(capturedPrompt).toContain("candidate-a");
    expect(capturedPrompt).toContain("candidate-b");
    expect(capturedPrompt.toLowerCase()).toContain("academic guardian");
    expect(capturedPrompt.toLowerCase()).toContain("do not invent");
  });

  it("emits semantic wrapper and provider traces for academic guardian", async () => {
    const observedNames: string[] = [];
    setTraceDelegateForTests({
      withObservation: async (name, _options, callback) => {
        observedNames.push(name);
        return callback({
          update: () => {}
        });
      }
    });

    setLlmProviderForTests({
      generateObject: async () => makeDebateReview("academic_guardian")
    });

    await reviewCandidatesAsAcademicGuardianWithLlm(makeDebateInput());

    expect(observedNames).toContain("planner.agent.academic_guardian");
  });

  it("calls provider and returns parsed time maximizer review", async () => {
    let capturedPrompt = "";

    setLlmProviderForTests({
      generateObject: async ({ systemPrompt, userPrompt }) => {
        capturedPrompt = `${systemPrompt}\n${userPrompt}`;
        return makeDebateReview("time_maximizer");
      }
    });

    const result = await reviewCandidatesAsTimeMaximizerWithLlm(makeDebateInput());

    expect(result.agent_role).toBe("time_maximizer");
    expect(capturedPrompt).toContain("candidate-a");
    expect(capturedPrompt).toContain("candidate-b");
    expect(capturedPrompt.toLowerCase()).toContain("time maximizer");
    expect(capturedPrompt.toLowerCase()).toContain("do not invent");
  });

  it("calls provider and returns parsed execution realist review", async () => {
    let capturedPrompt = "";

    setLlmProviderForTests({
      generateObject: async ({ systemPrompt, userPrompt }) => {
        capturedPrompt = `${systemPrompt}\n${userPrompt}`;
        return makeDebateReview("execution_realist");
      }
    });

    const result = await reviewCandidatesAsExecutionRealistWithLlm(makeDebateInput());

    expect(result.agent_role).toBe("execution_realist");
    expect(capturedPrompt).toContain("candidate-a");
    expect(capturedPrompt).toContain("candidate-b");
    expect(capturedPrompt.toLowerCase()).toContain("execution realist");
    expect(capturedPrompt.toLowerCase()).toContain("do not invent");
  });

  it("rejects invalid debate review output from provider", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        agent_role: "academic_guardian",
        preferred_candidate_ids: ["candidate-a"],
        strongest_supports: ["Support"],
        warning_flags: []
      })
    });

    await expect(
      reviewCandidatesAsAcademicGuardianWithLlm(makeDebateInput())
    ).rejects.toThrow();
  });

  it("calls provider and returns parsed judge selection", async () => {
    let capturedPrompt = "";

    setLlmProviderForTests({
      generateObject: async ({ systemPrompt, userPrompt }) => {
        capturedPrompt = `${systemPrompt}\n${userPrompt}`;
        const result: JudgeSelectionResult = {
          selected_candidate_id: "candidate-b",
          rationale: "Best tradeoff",
          confidence: "medium",
          fallback_candidate_id: "candidate-a",
          user_facing_summary: "Balanced choice."
        };
        return result;
      }
    });

    const result = await selectCandidateWithLlmJudge({
      debate_input: makeDebateInput(),
      reviews: [
        makeDebateReview("academic_guardian"),
        makeDebateReview("time_maximizer"),
        makeDebateReview("execution_realist")
      ]
    });

    expect(result.selected_candidate_id).toBe("candidate-b");
    expect(capturedPrompt).toContain("candidate-a");
    expect(capturedPrompt).toContain("candidate-b");
    expect(capturedPrompt.toLowerCase()).toContain("selected_candidate_id");
    expect(capturedPrompt.toLowerCase()).toContain("do not invent");
  });

  it("rejects invalid judge output from provider", async () => {
    setLlmProviderForTests({
      generateObject: async () => ({
        rationale: "Missing selected candidate",
        confidence: "high"
      })
    });

    await expect(
      selectCandidateWithLlmJudge({
        debate_input: makeDebateInput(),
        reviews: [makeDebateReview("academic_guardian")]
      })
    ).rejects.toThrow();
  });
});
