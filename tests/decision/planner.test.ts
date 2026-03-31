import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CandidatePlan,
  CandidatePlanItem,
  DebateReview,
  OccurrenceContext
} from "../../src/lib/types/decision";
import type {
  CourseDetailInput,
  RareEventFeedbackInput,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";

import type { DebateInput } from "../../src/lib/debate/protocol";
import type { JudgeSelectionResult } from "../../src/lib/types/decision";
import {
  resetTraceDelegateForTests,
  setTraceDelegateForTests,
  type TraceUpdate
} from "../../src/lib/observability/langfuse";
import * as deterministicAcademicGuardian from "../../src/lib/agents/academic-guardian";
import * as deterministicExecutionRealist from "../../src/lib/agents/execution-realist";
import * as deterministicJudge from "../../src/lib/agents/judge";
import * as deterministicTimeMaximizer from "../../src/lib/agents/time-maximizer";

const llmMocks = vi.hoisted(() => ({
  academicGuardian: vi.fn(),
  timeMaximizer: vi.fn(),
  executionRealist: vi.fn(),
  judge: vi.fn()
}));

vi.mock("../../src/lib/agents/llm-academic-guardian", () => ({
  reviewCandidatesAsAcademicGuardianWithLlm: llmMocks.academicGuardian
}));

vi.mock("../../src/lib/agents/llm-time-maximizer", () => ({
  reviewCandidatesAsTimeMaximizerWithLlm: llmMocks.timeMaximizer
}));

vi.mock("../../src/lib/agents/llm-execution-realist", () => ({
  reviewCandidatesAsExecutionRealistWithLlm: llmMocks.executionRealist
}));

vi.mock("../../src/lib/agents/llm-judge", () => ({
  selectCandidateWithLlmJudge: llmMocks.judge
}));

import { orchestratePlan } from "../../src/lib/decision/planner";

const baseProfile = (
  overrides: Partial<UserProfileInput> = {}
): UserProfileInput => ({
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
  retroactive_remedy_enabled: false,
  ...overrides
});

function makeContext({
  courseName,
  date,
  timeSlot,
  semesterPhase = "normal_release",
  profileOverrides = {},
  courseOverrides = {},
  shortTermOverrides = {}
}: {
  courseName: string;
  date: string;
  timeSlot: string;
  semesterPhase?: OccurrenceContext["semester_phase"];
  profileOverrides?: Partial<UserProfileInput>;
  courseOverrides?: Partial<CourseDetailInput>;
  shortTermOverrides?: Partial<ShortTermModifiersInput>;
}): OccurrenceContext {
  const userProfile = baseProfile(profileOverrides);
  const course: TimetableCourseInput = {
    course_name: courseName,
    time_slots: [{ day_of_week: 1, time: "第一.二节" }],
    location: "Campus"
  };
  const courseDetails: CourseDetailInput = {
    course_name_ref: courseName,
    course_class: "core",
    course_target_level: "pass_only",
    personal_fail_risk: "unlikely_to_fail",
    attendance_modes: ["visual_or_verbal_confirmation"],
    field_confidence: "high",
    absence_rule_confidence: "high",
    sign_in_then_leave_feasibility: "maybe",
    escape_feasibility_tier: "medium",
    ...courseOverrides
  };

  return {
    course,
    course_details: courseDetails,
    user_profile: userProfile,
    planning_mode: userProfile.planning_mode,
    free_time_target: userProfile.free_time_target,
    semester_phase: semesterPhase,
    short_term_modifiers: shortTermOverrides,
    occurrence_week: 5,
    occurrence: {
      date,
      time_slot: timeSlot
    }
  };
}

function buildSafeModeContexts(): OccurrenceContext[] {
  return [
    makeContext({
      courseName: "Morning Elective",
      date: "2026-04-07",
      timeSlot: "08:00-09:35",
      profileOverrides: {
        prefer_large_blocks: true,
        prefer_skip_early_classes: true,
        preferred_time_use_cases: ["study"]
      },
      courseOverrides: {
        course_class: "easy",
        attendance_modes: ["visual_or_verbal_confirmation"],
        sign_in_then_leave_feasibility: "yes",
        escape_feasibility_tier: "easy"
      },
      shortTermOverrides: {
        temporary_goal_shift: "protect study block"
      }
    }),
    makeContext({
      courseName: "Core Theory",
      date: "2026-04-08",
      timeSlot: "13:00-14:35",
      semesterPhase: "final_tightening",
      courseOverrides: {
        course_target_level: "high_score_needed",
        personal_fail_risk: "easy_to_fail",
        key_session_types: ["exam_hint_or_material_session"],
        score_loss_per_recorded_absence: 8,
        max_recorded_absences: 2,
        fail_threshold_absences: 2
      }
    })
  ];
}

function buildTargetModeContexts(): OccurrenceContext[] {
  return [
    makeContext({
      courseName: "Target Course",
      date: "2026-04-09",
      timeSlot: "08:00-09:35",
      profileOverrides: {
        planning_mode: "target_free_time_mode",
        free_time_target: {
          type: "sessions",
          value: 1
        },
        prefer_large_blocks: true,
        prefer_skip_early_classes: true
      },
      courseOverrides: {
        course_class: "easy",
        attendance_modes: ["visual_or_verbal_confirmation"],
        sign_in_then_leave_feasibility: "yes",
        escape_feasibility_tier: "easy"
      },
      shortTermOverrides: {
        temporary_goal_shift: "protect interview prep"
      }
    })
  ];
}

function buildRareEventContexts(): OccurrenceContext[] {
  return [
    makeContext({
      courseName: "Policy Seminar",
      date: "2026-04-05",
      timeSlot: "10:00-11:35"
    }),
    makeContext({
      courseName: "Policy Seminar",
      date: "2026-04-12",
      timeSlot: "10:00-11:35"
    }),
    makeContext({
      courseName: "Other Course",
      date: "2026-04-12",
      timeSlot: "15:00-16:35"
    })
  ];
}

function candidateIds(candidates: CandidatePlan[]): string[] {
  return candidates.map((candidate: CandidatePlan) => candidate.candidate_id);
}

function findItem(
  items: CandidatePlanItem[],
  courseId: string,
  date: string
): CandidatePlanItem | undefined {
  return items.find(
    (item: CandidatePlanItem) =>
      item.course_id === courseId && item.occurrence.date === date
  );
}

describe("orchestratePlan", () => {
  beforeEach(() => {
    llmMocks.academicGuardian.mockReset();
    llmMocks.timeMaximizer.mockReset();
    llmMocks.executionRealist.mockReset();
    llmMocks.judge.mockReset();
    resetTraceDelegateForTests();
  });

  function makeLlmReview(role: DebateReview["agent_role"]): DebateReview {
    return {
      agent_role: role,
      preferred_candidate_ids: ["time_priority", "balanced"],
      strongest_objections: ["Risk"],
      strongest_supports: ["Benefit"],
      warning_flags: []
    };
  }

  it("keeps pushing safe_max_mode through the full feasible candidate set while freer options stay credible", async () => {
    const result = await orchestratePlan({
      occurrences: buildSafeModeContexts()
    });

    expect(result.planning_mode).toBe("safe_max_mode");
    expect(candidateIds(result.candidate_plans)).toEqual([
      "time_priority",
      "balanced",
      "execution_friendly"
    ]);
    expect(candidateIds(result.debated_candidates)).toEqual([
      "time_priority",
      "balanced",
      "execution_friendly"
    ]);
  });

  it("stops target_free_time_mode once acceptable candidates satisfy the target", async () => {
    const result = await orchestratePlan({
      occurrences: buildTargetModeContexts()
    });

    expect(result.planning_mode).toBe("target_free_time_mode");
    expect(result.target_satisfied).toBe(true);
    expect(candidateIds(result.debated_candidates)).not.toContain("execution_friendly");
  });

  it("passes the candidate set through debate and judge selection", async () => {
    const result = await orchestratePlan({
      occurrences: buildSafeModeContexts()
    });

    expect(result.debate_reviews).toHaveLength(3);
    expect(
      result.debate_reviews.map((review: DebateReview) => review.agent_role)
    ).toEqual([
      "academic_guardian",
      "time_maximizer",
      "execution_realist"
    ]);
    expect(candidateIds(result.debated_candidates)).toContain(
      result.judge_result.selected_candidate_id
    );
    expect(result.selected_candidate.candidate_id).toBe(
      result.judge_result.selected_candidate_id
    );
  });

  it("regenerates a changed candidate set before debate when tuning changes", async () => {
    const baseline = await orchestratePlan({
      occurrences: buildSafeModeContexts()
    });
    const conservative = await orchestratePlan({
      occurrences: buildSafeModeContexts(),
      tuning: "more_conservative"
    });

    const baselineAction = findItem(
      baseline.candidate_plans[0]?.items ?? [],
      "Morning Elective",
      "2026-04-07"
    )?.action;
    const conservativeAction = findItem(
      conservative.candidate_plans[0]?.items ?? [],
      "Morning Elective",
      "2026-04-07"
    )?.action;

    expect(baselineAction).toBe("skip");
    expect(conservativeAction).toBe("arrive_then_leave_early");
    expect(candidateIds(conservative.debated_candidates)).toEqual([
      "time_priority",
      "balanced",
      "execution_friendly"
    ]);
  });

  it("applies bounded rare-event replanning only to later related occurrences", async () => {
    const rareEvent: RareEventFeedbackInput = {
      event_type: "teacher_became_stricter",
      occurred_at: "2026-04-05",
      note: "Teacher unexpectedly enforced full attendance."
    };

    const result = await orchestratePlan({
      occurrences: buildRareEventContexts(),
      rare_event_feedback: {
        course_name_ref: "Policy Seminar",
        feedback: rareEvent
      }
    });

    expect(result.rare_event_replan_scope).toEqual({
      course_name_ref: "Policy Seminar",
      affected_occurrence_dates: ["2026-04-12"]
    });
    expect(
      findItem(result.selected_plan_items, "Policy Seminar", "2026-04-12")?.execution_note
    ).toContain("rare event");
    expect(
      findItem(result.selected_plan_items, "Other Course", "2026-04-12")?.execution_note
    ).not.toContain("rare event");
  });

  it("keeps deterministic debate when planning_llm_mode is omitted", async () => {
    const result = await orchestratePlan({
      occurrences: buildSafeModeContexts()
    });

    expect(llmMocks.academicGuardian).not.toHaveBeenCalled();
    expect(llmMocks.timeMaximizer).not.toHaveBeenCalled();
    expect(llmMocks.executionRealist).not.toHaveBeenCalled();
    expect(llmMocks.judge).not.toHaveBeenCalled();
    expect(result.debate_reviews.map((review) => review.agent_role)).toEqual([
      "academic_guardian",
      "time_maximizer",
      "execution_realist"
    ]);
  });

  it("uses LLM debate and judge when planning_llm_mode is debate_and_judge", async () => {
    llmMocks.academicGuardian.mockResolvedValue(
      makeLlmReview("academic_guardian")
    );
    llmMocks.timeMaximizer.mockResolvedValue(makeLlmReview("time_maximizer"));
    llmMocks.executionRealist.mockResolvedValue(
      makeLlmReview("execution_realist")
    );
    llmMocks.judge.mockResolvedValue({
      selected_candidate_id: "balanced",
      rationale: "Best balance",
      confidence: "high"
    } satisfies JudgeSelectionResult);

    const result = await orchestratePlan({
      occurrences: buildSafeModeContexts(),
      planning_llm_mode: "debate_and_judge"
    });

    expect(llmMocks.academicGuardian).toHaveBeenCalledTimes(1);
    expect(llmMocks.timeMaximizer).toHaveBeenCalledTimes(1);
    expect(llmMocks.executionRealist).toHaveBeenCalledTimes(1);
    expect(llmMocks.judge).toHaveBeenCalledTimes(1);
    expect(candidateIds(result.debated_candidates)).toContain(
      result.judge_result.selected_candidate_id
    );
  });

  it("emits a planner orchestration trace in LLM mode", async () => {
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

    llmMocks.academicGuardian.mockResolvedValue(
      makeLlmReview("academic_guardian")
    );
    llmMocks.timeMaximizer.mockResolvedValue(makeLlmReview("time_maximizer"));
    llmMocks.executionRealist.mockResolvedValue(
      makeLlmReview("execution_realist")
    );
    llmMocks.judge.mockResolvedValue({
      selected_candidate_id: "balanced",
      rationale: "Best balance",
      confidence: "high"
    } satisfies JudgeSelectionResult);

    await orchestratePlan({
      occurrences: buildSafeModeContexts(),
      planning_llm_mode: "debate_and_judge"
    });

    expect(observedNames[0]).toBe("planner.orchestrate");
    expect(
      updates.some(
        (update) => update.metadata?.planning_llm_mode === "debate_and_judge"
      )
    ).toBe(true);
  });

  it("filters target_free_time_mode candidates before LLM debate", async () => {
    llmMocks.academicGuardian.mockResolvedValue(
      makeLlmReview("academic_guardian")
    );
    llmMocks.timeMaximizer.mockResolvedValue(makeLlmReview("time_maximizer"));
    llmMocks.executionRealist.mockResolvedValue(
      makeLlmReview("execution_realist")
    );
    llmMocks.judge.mockResolvedValue({
      selected_candidate_id: "time_priority",
      rationale: "Target hit",
      confidence: "medium"
    } satisfies JudgeSelectionResult);

    const result = await orchestratePlan({
      occurrences: buildTargetModeContexts(),
      planning_llm_mode: "debate_and_judge"
    });

    const debateInput = llmMocks.academicGuardian.mock.calls[0]?.[0] as DebateInput;
    const debatedIds = debateInput.candidates.map(
      (candidate) => candidate.candidate_id
    );

    expect(debatedIds).not.toContain("execution_friendly");
    expect(result.debated_candidates.map((candidate) => candidate.candidate_id)).toEqual(
      debatedIds
    );
  });

  it("falls back to deterministic debate when an LLM reviewer throws", async () => {
    llmMocks.academicGuardian.mockRejectedValue(new Error("LLM error"));

    const academicSpy = vi.spyOn(
      deterministicAcademicGuardian,
      "reviewCandidatesAsAcademicGuardian"
    );
    const timeSpy = vi.spyOn(
      deterministicTimeMaximizer,
      "reviewCandidatesAsTimeMaximizer"
    );
    const executionSpy = vi.spyOn(
      deterministicExecutionRealist,
      "reviewCandidatesAsExecutionRealist"
    );
    const judgeSpy = vi.spyOn(deterministicJudge, "selectCandidateWithJudge");

    const result = await orchestratePlan({
      occurrences: buildSafeModeContexts(),
      planning_llm_mode: "debate_and_judge"
    });

    expect(academicSpy).toHaveBeenCalledTimes(1);
    expect(timeSpy).toHaveBeenCalledTimes(1);
    expect(executionSpy).toHaveBeenCalledTimes(1);
    expect(judgeSpy).toHaveBeenCalledTimes(1);
    expect(result.debate_reviews.map((review) => review.agent_role)).toEqual([
      "academic_guardian",
      "time_maximizer",
      "execution_realist"
    ]);
  });

  it("falls back to deterministic judge when the LLM judge throws", async () => {
    llmMocks.academicGuardian.mockResolvedValue(
      makeLlmReview("academic_guardian")
    );
    llmMocks.timeMaximizer.mockResolvedValue(makeLlmReview("time_maximizer"));
    llmMocks.executionRealist.mockResolvedValue(
      makeLlmReview("execution_realist")
    );
    llmMocks.judge.mockRejectedValue(new Error("LLM judge error"));

    const judgeSpy = vi.spyOn(deterministicJudge, "selectCandidateWithJudge");

    const result = await orchestratePlan({
      occurrences: buildSafeModeContexts(),
      planning_llm_mode: "debate_and_judge"
    });

    expect(judgeSpy).toHaveBeenCalledTimes(1);
    expect(result.judge_result.selected_candidate_id).toBe(
      result.selected_candidate.candidate_id
    );
  });

  it("throws when LLM judge selects outside debated candidates", async () => {
    llmMocks.academicGuardian.mockResolvedValue(
      makeLlmReview("academic_guardian")
    );
    llmMocks.timeMaximizer.mockResolvedValue(makeLlmReview("time_maximizer"));
    llmMocks.executionRealist.mockResolvedValue(
      makeLlmReview("execution_realist")
    );
    llmMocks.judge.mockResolvedValue({
      selected_candidate_id: "unknown",
      rationale: "Invalid",
      confidence: "low"
    } satisfies JudgeSelectionResult);

    await expect(
      orchestratePlan({
        occurrences: buildSafeModeContexts(),
        planning_llm_mode: "debate_and_judge"
      })
    ).rejects.toThrow(
      "Judge selected a candidate outside the debated candidate set"
    );
  });
});
