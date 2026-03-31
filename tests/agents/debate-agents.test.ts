import { describe, expect, it } from "vitest";

import type {
  CandidatePlan,
  DebateReview,
  OccurrenceContext
} from "../../src/lib/types/decision";
import type {
  CourseDetailInput,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";

import { reviewCandidatesAsAcademicGuardian } from "../../src/lib/agents/academic-guardian";
import { reviewCandidatesAsExecutionRealist } from "../../src/lib/agents/execution-realist";
import { normalizeStructuredCandidateFields } from "../../src/lib/agents/structurer";
import { buildDebateInput } from "../../src/lib/debate/protocol";
import { reviewCandidatesAsTimeMaximizer } from "../../src/lib/agents/time-maximizer";

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
  semesterPhase = "normal_release",
  courseOverrides = {},
  profileOverrides = {},
  shortTermOverrides = {}
}: {
  courseName: string;
  semesterPhase?: OccurrenceContext["semester_phase"];
  courseOverrides?: Partial<CourseDetailInput>;
  profileOverrides?: Partial<UserProfileInput>;
  shortTermOverrides?: Partial<ShortTermModifiersInput>;
}): OccurrenceContext {
  const course: TimetableCourseInput = {
    course_name: courseName,
    time_slots: [{ day_of_week: 1, time: "第一.二节" }],
    location: "Campus"
  };

  const userProfile = baseProfile(profileOverrides);
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
      date: "2026-04-07",
      time_slot: "08:00-09:35"
    }
  };
}

function makeCandidates(): CandidatePlan[] {
  return [
    {
      candidate_id: "time_priority",
      items: [
        {
          course_id: "Core Theory",
          action: "skip",
          occurrence: { date: "2026-04-07", time_slot: "08:00-09:35" },
          execution_note: "Skip to preserve a large study block."
        },
        {
          course_id: "Heavy Commute Seminar",
          action: "skip",
          occurrence: { date: "2026-04-08", time_slot: "13:00-14:35" },
          execution_note: "Skip to recover travel time."
        }
      ],
      summary_note: "Most free time"
    },
    {
      candidate_id: "balanced",
      items: [
        {
          course_id: "Core Theory",
          action: "substitute_attendance",
          occurrence: { date: "2026-04-07", time_slot: "08:00-09:35" },
          execution_note: "Use substitute attendance to preserve some safety."
        },
        {
          course_id: "Heavy Commute Seminar",
          action: "substitute_attendance",
          occurrence: { date: "2026-04-08", time_slot: "13:00-14:35" },
          execution_note: "Reduce burden without fully skipping."
        }
      ],
      summary_note: "Middle ground"
    },
    {
      candidate_id: "execution_friendly",
      items: [
        {
          course_id: "Core Theory",
          action: "attend_full",
          occurrence: { date: "2026-04-07", time_slot: "08:00-09:35" },
          execution_note: "Attend to stay fully covered."
        },
        {
          course_id: "Heavy Commute Seminar",
          action: "attend_full",
          occurrence: { date: "2026-04-08", time_slot: "13:00-14:35" },
          execution_note: "Attend to avoid awkward, expensive workaround paths."
        }
      ],
      summary_note: "Least friction"
    }
  ];
}

function makeContexts(): OccurrenceContext[] {
  return [
    makeContext({
      courseName: "Core Theory",
      semesterPhase: "final_tightening",
      courseOverrides: {
        course_target_level: "high_score_needed",
        personal_fail_risk: "easy_to_fail",
        key_session_types: ["exam_hint_or_material_session"],
        score_loss_per_recorded_absence: 8,
        max_recorded_absences: 2,
        fail_threshold_absences: 2
      }
    }),
    makeContext({
      courseName: "Heavy Commute Seminar",
      courseOverrides: {
        substitute_attendance_cost_override: 120,
        sign_in_then_leave_feasibility: "no",
        escape_feasibility_tier: "hard",
        escape_environment_tags: ["awkward_exit_path"],
        attendance_modes: ["paper_sign_in_before_class"],
        field_confidence: "low",
        absence_rule_confidence: "low"
      },
      profileOverrides: {
        execution_pressure: "high",
        sign_in_then_leave_willingness: false,
        prefer_large_blocks: true,
        prefer_skip_early_classes: true,
        preferred_time_use_cases: ["study"]
      },
      shortTermOverrides: {
        temporary_goal_shift: "protect interview prep",
        weather_modifier: "heavy rain"
      }
    })
  ];
}

function expectStructuredReview(review: DebateReview, role: DebateReview["agent_role"]) {
  expect(review.agent_role).toBe(role);
  expect(review.preferred_candidate_ids).toHaveLength(3);
  expect(review.strongest_objections.length).toBeGreaterThan(0);
  expect(review.strongest_supports.length).toBeGreaterThan(0);
  expect(review.warning_flags).toBeDefined();
  expect(review.preferred_candidate_ids).toEqual(
    expect.arrayContaining(["time_priority", "balanced", "execution_friendly"])
  );
}

describe("normalizeStructuredCandidateFields", () => {
  it("extracts structured fields and contradiction signals from messy notes", () => {
    const result = normalizeStructuredCandidateFields({
      raw_notes: [
        "Teacher says attendance is random, but last two weeks had full roll calls.",
        "Class might be skippable except before the final when hints are common.",
        "I think sign in then leave works, but the room is small and exits are awkward."
      ]
    });

    expect(result.normalized_fields).toEqual(
      expect.objectContaining({
        attendance_modes: expect.arrayContaining(["random_full_roll_call"]),
        key_session_types: expect.arrayContaining(["pre_final_session"])
      })
    );
    expect(result.contradiction_signals.length).toBeGreaterThan(0);
  });
});

describe("debate role agents", () => {
  it("returns structured academic review output", () => {
    const review = reviewCandidatesAsAcademicGuardian(
      buildDebateInput({
        contexts: makeContexts(),
        candidates: makeCandidates()
      })
    );

    expectStructuredReview(review, "academic_guardian");
    expect(review.preferred_candidate_ids[0]).toBe("execution_friendly");
  });

  it("returns structured time-maximizer review output", () => {
    const review = reviewCandidatesAsTimeMaximizer(
      buildDebateInput({
        contexts: makeContexts(),
        candidates: makeCandidates()
      })
    );

    expectStructuredReview(review, "time_maximizer");
    expect(review.preferred_candidate_ids[0]).toBe("time_priority");
  });

  it("returns structured execution-realist review output", () => {
    const review = reviewCandidatesAsExecutionRealist(
      buildDebateInput({
        contexts: makeContexts(),
        candidates: makeCandidates()
      })
    );

    expectStructuredReview(review, "execution_realist");
    expect(review.preferred_candidate_ids[0]).toBe("execution_friendly");
  });

  it("does not invent candidate ids outside the provided candidate set", () => {
    const input = buildDebateInput({
      contexts: makeContexts(),
      candidates: makeCandidates()
    });
    const allowedIds = input.candidates.map(
      (candidate: CandidatePlan) => candidate.candidate_id
    );

    const reviews = [
      reviewCandidatesAsAcademicGuardian(input),
      reviewCandidatesAsTimeMaximizer(input),
      reviewCandidatesAsExecutionRealist(input)
    ];

    for (const review of reviews) {
      expect(
        review.preferred_candidate_ids.every((id: string) => allowedIds.includes(id))
      ).toBe(true);
    }
  });

  it("surfaces missing-info notes when low-confidence fields materially affect evaluation", () => {
    const review = reviewCandidatesAsAcademicGuardian(
      buildDebateInput({
        contexts: makeContexts(),
        candidates: makeCandidates()
      })
    );

    expect(review.missing_info_notes).toEqual(
      expect.arrayContaining([expect.stringContaining("confidence")])
    );
  });
});
