import { describe, expect, it } from "vitest";

import type {
  CourseDetailInput,
  FreeTimeTarget,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";
import type { OccurrenceContext } from "../../src/lib/types/decision";

import { estimatePressures } from "../../src/lib/decision/pressures";

const baseCourse = (): TimetableCourseInput => ({
  course_name: "Software Engineering",
  time_slots: [{ day_of_week: 1, time: "第一.二节" }],
  location: "North Campus"
});

const baseDetails = (): CourseDetailInput => ({
  course_name_ref: "Software Engineering",
  course_class: "core",
  course_target_level: "pass_only",
  personal_fail_risk: "unlikely_to_fail",
  attendance_modes: ["unclear_or_irregular"],
  field_confidence: "high",
  absence_rule_confidence: "high",
  sign_in_then_leave_feasibility: "maybe",
  escape_feasibility_tier: "medium"
});

const baseProfile = (): UserProfileInput => ({
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
});

const baseShortTerm = (): ShortTermModifiersInput => ({
  weather_modifier: "light rain"
});

type Task6OccurrenceContext = OccurrenceContext & {
  planning_mode: UserProfileInput["planning_mode"];
  free_time_target?: FreeTimeTarget;
  occurrence_week: number;
};

const makeContext = (
  overrides: Partial<Task6OccurrenceContext> = {}
): Task6OccurrenceContext => ({
  course: baseCourse(),
  course_details: baseDetails(),
  user_profile: baseProfile(),
  planning_mode: "safe_max_mode",
  free_time_target: undefined,
  semester_phase: "normal_release",
  short_term_modifiers: baseShortTerm(),
  occurrence_week: 4,
  occurrence: {
    date: "2026-04-01",
    time_slot: "08:00-09:35"
  },
  ...overrides
});

describe("estimatePressures", () => {
  it("raises academic pressure for important risky courses in tightening phases", () => {
    const pressures = estimatePressures(
      makeContext({
        semester_phase: "final_tightening",
        course_details: {
          ...baseDetails(),
          course_target_level: "high_score_needed",
          personal_fail_risk: "easy_to_fail",
          score_loss_per_recorded_absence: 8,
          max_recorded_absences: 2,
          fail_threshold_absences: 2
        }
      })
    );

    expect(pressures.academic).toBe("high");
  });

  it("raises catch pressure when attendance checks are frequent", () => {
    const pressures = estimatePressures(
      makeContext({
        course_details: {
          ...baseDetails(),
          attendance_modes: ["full_roll_call_every_session"],
          full_roll_call_frequency_tier: "high"
        }
      })
    );

    expect(pressures.catch).toBe("high");
  });

  it("raises free-time value pressure for early classes during high-value short-term periods", () => {
    const pressures = estimatePressures(
      makeContext({
        user_profile: {
          ...baseProfile(),
          prefer_large_blocks: true,
          prefer_skip_early_classes: true,
          preferred_time_use_cases: ["study", "internship"]
        },
        short_term_modifiers: {
          weather_modifier: "heavy rain",
          temporary_goal_shift: "protect interview prep",
          upcoming_events: ["internship interview"],
          body_state: "tired"
        }
      })
    );

    expect(pressures.free_time_value).toBe("high");
  });

  it("raises execution-cost pressure when attendance options are awkward and expensive", () => {
    const pressures = estimatePressures(
      makeContext({
        user_profile: {
          ...baseProfile(),
          execution_pressure: "high",
          substitute_attendance_default_cost: 90,
          sign_in_then_leave_willingness: false
        },
        course_details: {
          ...baseDetails(),
          substitute_attendance_cost_override: 120,
          sign_in_then_leave_feasibility: "no",
          escape_feasibility_tier: "hard",
          escape_environment_tags: ["awkward_exit_path", "teacher_has_wide_line_of_sight"]
        }
      })
    );

    expect(pressures.execution_cost).toBe("high");
  });
});
