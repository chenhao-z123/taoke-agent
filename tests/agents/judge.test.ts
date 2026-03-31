import { describe, expect, it } from "vitest";

import type { CandidatePlan, DebateReview, OccurrenceContext } from "../../src/lib/types/decision";
import type { CourseDetailInput, TimetableCourseInput, UserProfileInput } from "../../src/lib/types/input";

import { selectCandidateWithJudge } from "../../src/lib/agents/judge";
import { buildDebateInput } from "../../src/lib/debate/protocol";

function makeContext(courseName: string): OccurrenceContext {
  const userProfile: UserProfileInput = {
    planning_mode: "safe_max_mode",
    strategy_tier: "balanced",
    risk_tier: "medium",
    execution_pressure: "medium",
    score_buffer_preference: "some",
    prefer_large_blocks: true,
    prefer_skip_early_classes: true,
    prefer_skip_late_classes: false,
    substitute_attendance_enabled: true,
    substitute_attendance_default_cost: 40,
    sign_in_then_leave_willingness: true,
    retroactive_remedy_enabled: false
  };

  const course: TimetableCourseInput = {
    course_name: courseName,
    time_slots: [{ day_of_week: 1, time: "第一.二节" }]
  };

  const courseDetails: CourseDetailInput = {
    course_name_ref: courseName,
    course_class: "core",
    course_target_level: "pass_only",
    personal_fail_risk: "possible_to_fail",
    attendance_modes: ["visual_or_verbal_confirmation"],
    field_confidence: "high",
    absence_rule_confidence: "high",
    sign_in_then_leave_feasibility: "maybe",
    escape_feasibility_tier: "medium"
  };

  return {
    course,
    course_details: courseDetails,
    user_profile: userProfile,
    planning_mode: userProfile.planning_mode,
    free_time_target: undefined,
    semester_phase: "normal_release",
    short_term_modifiers: undefined,
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
          execution_note: "Skip to maximize free time."
        }
      ]
    },
    {
      candidate_id: "balanced",
      items: [
        {
          course_id: "Core Theory",
          action: "substitute_attendance",
          occurrence: { date: "2026-04-07", time_slot: "08:00-09:35" },
          execution_note: "Use substitute attendance for balance."
        }
      ]
    },
    {
      candidate_id: "execution_friendly",
      items: [
        {
          course_id: "Core Theory",
          action: "attend_full",
          occurrence: { date: "2026-04-07", time_slot: "08:00-09:35" },
          execution_note: "Attend to minimize execution friction."
        }
      ]
    }
  ];
}

function makeReviews(): DebateReview[] {
  return [
    {
      agent_role: "academic_guardian",
      preferred_candidate_ids: ["execution_friendly", "balanced", "time_priority"],
      strongest_objections: ["time_priority risks academic downside"],
      strongest_supports: ["execution_friendly protects the course buffer"],
      warning_flags: ["high academic downside if too aggressive"]
    },
    {
      agent_role: "time_maximizer",
      preferred_candidate_ids: ["time_priority", "balanced", "execution_friendly"],
      strongest_objections: ["execution_friendly wastes free time"],
      strongest_supports: ["time_priority frees the most usable time"],
      warning_flags: []
    },
    {
      agent_role: "execution_realist",
      preferred_candidate_ids: ["balanced", "execution_friendly", "time_priority"],
      strongest_objections: ["time_priority is too brittle to execute"],
      strongest_supports: ["balanced keeps friction manageable"],
      warning_flags: ["time_priority may be hard to carry out consistently"]
    }
  ];
}

describe("selectCandidateWithJudge", () => {
  it("selects only from the provided candidate set", () => {
    const input = buildDebateInput({
      contexts: [makeContext("Core Theory")],
      candidates: makeCandidates()
    });
    const result = selectCandidateWithJudge({
      debate_input: input,
      reviews: makeReviews()
    });

    expect(
      input.candidates.map((candidate: CandidatePlan) => candidate.candidate_id)
    ).toContain(
      result.selected_candidate_id
    );
  });

  it("uses debate output to prefer a candidate with manageable objections", () => {
    const result = selectCandidateWithJudge({
      debate_input: buildDebateInput({
        contexts: [makeContext("Core Theory")],
        candidates: makeCandidates()
      }),
      reviews: makeReviews()
    });

    expect(result.selected_candidate_id).toBe("balanced");
    expect(result.rationale).toContain("manageable");
  });

  it("does not invent a plan outside the candidate set when producing a fallback", () => {
    const input = buildDebateInput({
      contexts: [makeContext("Core Theory")],
      candidates: makeCandidates()
    });
    const result = selectCandidateWithJudge({
      debate_input: input,
      reviews: makeReviews()
    });

    if (result.fallback_candidate_id) {
      expect(
        input.candidates.map((candidate: CandidatePlan) => candidate.candidate_id)
      ).toContain(
        result.fallback_candidate_id
      );
    }
  });
});
