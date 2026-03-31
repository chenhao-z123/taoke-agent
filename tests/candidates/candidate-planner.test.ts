import { describe, expect, it } from "vitest";

import type {
  CourseDetailInput,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";
import type {
  CandidatePlan,
  CandidatePlanItem,
  OccurrenceContext
} from "../../src/lib/types/decision";

import { generateCandidatePlans } from "../../src/lib/candidates/candidate-planner";

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

const baseShortTerm = (
  overrides: Partial<ShortTermModifiersInput> = {}
): ShortTermModifiersInput => ({
  ...overrides
});

type PlannerTestContext = OccurrenceContext;

function makeOccurrenceContext({
  courseName,
  date,
  timeSlot,
  semesterPhase = "normal_release",
  courseOverrides = {},
  profileOverrides = {},
  shortTermOverrides = {}
}: {
  courseName: string;
  date: string;
  timeSlot: string;
  semesterPhase?: OccurrenceContext["semester_phase"];
  courseOverrides?: Partial<CourseDetailInput>;
  profileOverrides?: Partial<UserProfileInput>;
  shortTermOverrides?: Partial<ShortTermModifiersInput>;
}): PlannerTestContext {
  const course: TimetableCourseInput = {
    course_name: courseName,
    time_slots: [{ day_of_week: 1, time: "第一.二节" }],
    location: "Campus"
  };

  const courseDetails: CourseDetailInput = {
    course_name_ref: courseName,
    course_class: "easy",
    course_target_level: "pass_only",
    personal_fail_risk: "unlikely_to_fail",
    attendance_modes: ["unclear_or_irregular"],
    field_confidence: "high",
    absence_rule_confidence: "high",
    sign_in_then_leave_feasibility: "maybe",
    escape_feasibility_tier: "medium",
    ...courseOverrides
  };

  const userProfile = baseProfile(profileOverrides);

  return {
    course,
    course_details: courseDetails,
    user_profile: userProfile,
    planning_mode: userProfile.planning_mode,
    free_time_target: userProfile.free_time_target,
    semester_phase: semesterPhase,
    short_term_modifiers: baseShortTerm(shortTermOverrides),
    occurrence_week: 5,
    occurrence: {
      date,
      time_slot: timeSlot
    }
  };
}

function buildContexts(): PlannerTestContext[] {
  return [
    makeOccurrenceContext({
      courseName: "Mandatory Lab",
      date: "2026-04-06",
      timeSlot: "08:00-09:35",
      semesterPhase: "exploration",
      courseOverrides: {
        course_class: "special",
        special_reason_note: "First session lab walkthrough",
        key_session_types: ["first_session"],
        attendance_modes: ["full_roll_call_every_session"],
        full_roll_call_frequency_tier: "high"
      }
    }),
    makeOccurrenceContext({
      courseName: "Morning Elective",
      date: "2026-04-07",
      timeSlot: "08:00-09:35",
      courseOverrides: {
        course_class: "easy",
        attendance_modes: ["visual_or_verbal_confirmation"],
        field_confidence: "high",
        absence_rule_confidence: "high",
        sign_in_then_leave_feasibility: "yes",
        escape_feasibility_tier: "easy"
      },
      profileOverrides: {
        prefer_large_blocks: true,
        prefer_skip_early_classes: true,
        preferred_time_use_cases: ["study"]
      },
      shortTermOverrides: {
        temporary_goal_shift: "protect study block"
      }
    }),
    makeOccurrenceContext({
      courseName: "Costly Commute Seminar",
      date: "2026-04-08",
      timeSlot: "13:00-14:35",
      courseOverrides: {
        course_class: "core",
        attendance_modes: ["paper_sign_in_before_class"],
        random_check_frequency_tier: "medium",
        substitute_attendance_cost_override: 120,
        sign_in_then_leave_feasibility: "no",
        escape_feasibility_tier: "hard",
        escape_environment_tags: ["awkward_exit_path"]
      },
      profileOverrides: {
        execution_pressure: "high",
        sign_in_then_leave_willingness: false
      }
    })
  ];
}

describe("generateCandidatePlans", () => {
  it("keeps every candidate inside hard constraints", () => {
    const candidates = generateCandidatePlans({
      occurrences: buildContexts()
    });

    expect(candidates.length).toBeGreaterThanOrEqual(3);

    for (const candidate of candidates) {
      const mandatoryLabItem = candidate.items.find(
        (item: CandidatePlanItem) => item.course_id === "Mandatory Lab"
      );

      expect(mandatoryLabItem?.action).toBe("attend_full");
      expect(mandatoryLabItem?.execution_note).toContain("first session");
    }
  });

  it("keeps the candidate count intentionally small", () => {
    const candidates = generateCandidatePlans({
      occurrences: buildContexts()
    });

    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(candidates.length).toBeLessThanOrEqual(5);
  });

  it("produces distinct time-priority, balanced, and execution-friendly candidates", () => {
    const candidates = generateCandidatePlans({
      occurrences: buildContexts()
    });

    expect(candidates.map((candidate: CandidatePlan) => candidate.candidate_id)).toEqual([
      "time_priority",
      "balanced",
      "execution_friendly"
    ]);

    const timePriority = candidates[0];
    const balanced = candidates[1];
    const executionFriendly = candidates[2];

    expect(
      timePriority?.items.find(
        (item: CandidatePlanItem) => item.course_id === "Morning Elective"
      )?.action
    ).toBe("skip");
    expect(
      balanced?.items.find(
        (item: CandidatePlanItem) => item.course_id === "Morning Elective"
      )?.action
    ).not.toBe("attend_full");
    expect(
      executionFriendly?.items.find(
        (item: CandidatePlanItem) => item.course_id === "Costly Commute Seminar"
      )?.action
    ).toBe("attend_full");
  });

  it("shifts the candidate set in a more conservative direction", () => {
    const baseline = generateCandidatePlans({
      occurrences: buildContexts()
    });
    const conservative = generateCandidatePlans({
      occurrences: buildContexts(),
      tuning: "more_conservative"
    });

    const baselineAction = baseline[0]?.items.find(
      (item: CandidatePlanItem) => item.course_id === "Morning Elective"
    )?.action;
    const conservativeAction = conservative[0]?.items.find(
      (item: CandidatePlanItem) => item.course_id === "Morning Elective"
    )?.action;

    expect(baselineAction).toBe("skip");
    expect(conservativeAction).toBe("arrive_then_leave_early");
  });

  it("shifts the candidate set in a more aggressive direction", () => {
    const baseline = generateCandidatePlans({
      occurrences: buildContexts()
    });
    const aggressive = generateCandidatePlans({
      occurrences: buildContexts(),
      tuning: "more_aggressive"
    });

    const baselineAction = baseline[1]?.items.find(
      (item: CandidatePlanItem) => item.course_id === "Costly Commute Seminar"
    )?.action;
    const aggressiveAction = aggressive[1]?.items.find(
      (item: CandidatePlanItem) => item.course_id === "Costly Commute Seminar"
    )?.action;

    expect(baselineAction).toBe("substitute_attendance");
    expect(aggressiveAction).toBe("skip");
  });
});
