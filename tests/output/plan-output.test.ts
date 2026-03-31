import { describe, expect, it } from "vitest";

import type { OccurrenceContext } from "../../src/lib/types/decision";
import type {
  CourseDetailInput,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";
import type { PlanningWindow } from "../../src/lib/types/output";

import { orchestratePlan } from "../../src/lib/decision/planner";
import { mapPlanToOutput } from "../../src/lib/output/plan-output";
import type { ActionPlanItemOutput } from "../../src/lib/types/output";

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
    location: "Main Hall",
    teacher_name: "Dr. Chen"
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

function buildContexts(): OccurrenceContext[] {
  return [
    makeContext({
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
      },
      shortTermOverrides: {
        temporary_goal_shift: "stabilize schedule"
      }
    }),
    makeContext({
      courseName: "Policy Seminar",
      date: "2026-04-12",
      timeSlot: "10:00-11:35",
      profileOverrides: {
        prefer_large_blocks: true,
        prefer_skip_early_classes: true,
        preferred_time_use_cases: ["study"]
      },
      courseOverrides: {
        field_confidence: "low",
        absence_rule_confidence: "low",
        attendance_modes: ["paper_sign_in_before_class"],
        substitute_attendance_cost_override: 120,
        sign_in_then_leave_feasibility: "no",
        escape_feasibility_tier: "hard"
      },
      shortTermOverrides: {
        temporary_goal_shift: "protect interview prep",
        weather_modifier: "heavy rain"
      }
    })
  ];
}

const planningWindow: PlanningWindow = {
  start_date: "2026-04-06",
  end_date: "2026-04-12",
  view: "this_week"
};

describe("mapPlanToOutput", () => {
  it("maps planner results into the required plan wrapper fields", async () => {
    const plannerResult = await orchestratePlan({
      occurrences: buildContexts()
    });

    const output = mapPlanToOutput({
      plan_id: "plan-test-001",
      planning_window: planningWindow,
      planner_result: plannerResult
    });

    expect(output.plan_id).toBe("plan-test-001");
    expect(output.planning_window).toEqual(planningWindow);
    expect(output.strategy_snapshot).toEqual({
      strategy_tier: "balanced",
      risk_tier: "medium",
      semester_phase: "exploration",
      short_term_modifiers: { temporary_goal_shift: "stabilize schedule" }
    });
    expect(output.plan_items.length).toBe(plannerResult.selected_plan_items.length);
    expect(output.tuning_controls).toEqual({
      more_conservative: expect.objectContaining({ hint: expect.any(String) }),
      more_aggressive: expect.objectContaining({ hint: expect.any(String) })
    });
  });

  it("maps required plan item fields and execution note", async () => {
    const output = mapPlanToOutput({
      plan_id: "plan-test-002",
      planning_window: planningWindow,
      planner_result: await orchestratePlan({
        occurrences: buildContexts()
      })
    });

    expect(output.plan_items[0]).toEqual(
      expect.objectContaining({
        plan_item_id: expect.any(String),
        course_id: "Mandatory Lab",
        date: "2026-04-06",
        time_slot: "08:00-09:35",
        attendance_status: "attend_full",
        execution_note: expect.any(String)
      })
    );
  });

  it("surfaces optional execution support and context fields", async () => {
    const output = mapPlanToOutput({
      plan_id: "plan-test-003",
      planning_window: planningWindow,
      planner_result: await orchestratePlan({
        occurrences: buildContexts(),
        rare_event_feedback: {
          course_name_ref: "Policy Seminar",
          feedback: {
            event_type: "teacher_became_stricter",
            occurred_at: "2026-04-05",
            note: "Unexpected stricter attendance."
          }
        }
      })
    });

    const mandatoryLab = output.plan_items.find(
      (item: ActionPlanItemOutput) => item.course_id === "Mandatory Lab"
    );
    const policySeminar = output.plan_items.find(
      (item: ActionPlanItemOutput) => item.course_id === "Policy Seminar"
    );

    expect(mandatoryLab).toEqual(
      expect.objectContaining({
        must_attend_reason: expect.stringContaining("first session"),
        phase_context_note: expect.stringContaining("exploration"),
        short_term_override_note: expect.stringContaining("stabilize schedule"),
        event_feedback_allowed: true
      })
    );
    expect(policySeminar).toEqual(
      expect.objectContaining({
        estimated_substitute_cost: 120,
        risk_level: expect.any(String),
        decision_confidence: expect.any(String),
        missing_info_summary: expect.stringContaining("confidence"),
        rare_event_replan_note: expect.stringContaining("rare event")
      })
    );
  });

  it("surfaces judge rationale, debate summary, missing-info prompt, and available views", async () => {
    const output = mapPlanToOutput({
      plan_id: "plan-test-004",
      planning_window: planningWindow,
      planner_result: await orchestratePlan({
        occurrences: buildContexts()
      })
    });

    expect(output.selected_candidate_id).toBeTruthy();
    expect(output.judge_short_rationale).toContain("manageable");
    expect(output.judge_summary).toContain(output.selected_candidate_id ?? "");
    expect(output.debate_summary).toContain("academic_guardian");
    expect(output.missing_info_prompt).toContain("confidence");
    expect(output.available_time_views).toEqual(["today", "this_week", "current_phase"]);
  });
});
