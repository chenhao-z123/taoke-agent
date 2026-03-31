import { describe, expect, it } from "vitest";

import { semesterPlanInputSchema } from "../../src/lib/schema/input";

describe("semesterPlanInputSchema", () => {
  it("accepts a minimal valid input payload", () => {
    const result = semesterPlanInputSchema.safeParse({
      timetable_import: {
        courses: [
          {
            course_name: "Intro Math",
            time_slots: [
              {
                day_of_week: 1,
                time: "第一.二节"
              }
            ],
            location: "Room 101",
            teacher_name: "Dr. Liu",
            week_range: {
              start_week: 1,
              end_week: 16
            },
            course_type_or_credit: "core-3"
          }
        ]
      },
      user_profile: {
        planning_mode: "safe_max_mode",
        strategy_tier: "balanced",
        risk_tier: "medium",
        execution_pressure: "medium",
        score_buffer_preference: "some",
        prefer_large_blocks: true,
        prefer_skip_early_classes: false,
        prefer_skip_late_classes: false,
        substitute_attendance_enabled: true,
        sign_in_then_leave_willingness: true,
        retroactive_remedy_enabled: false
      },
      semester_phase_config: {
        phase_template: [
          {
            start_week: 1,
            end_week: 2,
            phase: "exploration"
          }
        ]
      },
      course_details: [
        {
          course_name_ref: "Intro Math",
          course_class: "core",
          course_target_level: "pass_only",
          personal_fail_risk: "possible_to_fail",
          attendance_modes: ["full_roll_call_every_session"]
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown planning mode values", () => {
    const result = semesterPlanInputSchema.safeParse({
      timetable_import: { courses: [] },
      user_profile: {
        planning_mode: "unsupported_mode",
        strategy_tier: "balanced",
        risk_tier: "medium",
        execution_pressure: "medium",
        score_buffer_preference: "some",
        prefer_large_blocks: false,
        prefer_skip_early_classes: false,
        prefer_skip_late_classes: false,
        substitute_attendance_enabled: false,
        sign_in_then_leave_willingness: false,
        retroactive_remedy_enabled: false
      },
      semester_phase_config: {
        phase_template: [
          {
            start_week: 1,
            end_week: 2,
            phase: "exploration"
          }
        ]
      },
      course_details: []
    });

    expect(result.success).toBe(false);
  });

  it("rejects course details missing required fields", () => {
    const result = semesterPlanInputSchema.safeParse({
      timetable_import: { courses: [] },
      user_profile: {
        planning_mode: "safe_max_mode",
        strategy_tier: "balanced",
        risk_tier: "medium",
        execution_pressure: "medium",
        score_buffer_preference: "some",
        prefer_large_blocks: false,
        prefer_skip_early_classes: false,
        prefer_skip_late_classes: false,
        substitute_attendance_enabled: false,
        sign_in_then_leave_willingness: false,
        retroactive_remedy_enabled: false
      },
      semester_phase_config: {
        phase_template: [
          {
            start_week: 1,
            end_week: 2,
            phase: "exploration"
          }
        ]
      },
      course_details: [
        {
          course_name_ref: "Intro Math",
          course_target_level: "pass_only",
          personal_fail_risk: "possible_to_fail",
          attendance_modes: ["full_roll_call_every_session"]
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("requires a free_time_target in target_free_time_mode", () => {
    const result = semesterPlanInputSchema.safeParse({
      timetable_import: { courses: [] },
      user_profile: {
        planning_mode: "target_free_time_mode",
        strategy_tier: "balanced",
        risk_tier: "medium",
        execution_pressure: "medium",
        score_buffer_preference: "some",
        prefer_large_blocks: false,
        prefer_skip_early_classes: false,
        prefer_skip_late_classes: false,
        substitute_attendance_enabled: false,
        sign_in_then_leave_willingness: false,
        retroactive_remedy_enabled: false
      },
      semester_phase_config: {
        phase_template: [
          {
            start_week: 1,
            end_week: 2,
            phase: "exploration"
          }
        ]
      },
      course_details: []
    });

    expect(result.success).toBe(false);
  });

  it("requires special_reason_note for special courses", () => {
    const result = semesterPlanInputSchema.safeParse({
      timetable_import: { courses: [] },
      user_profile: {
        planning_mode: "safe_max_mode",
        strategy_tier: "balanced",
        risk_tier: "medium",
        execution_pressure: "medium",
        score_buffer_preference: "some",
        prefer_large_blocks: false,
        prefer_skip_early_classes: false,
        prefer_skip_late_classes: false,
        substitute_attendance_enabled: false,
        sign_in_then_leave_willingness: false,
        retroactive_remedy_enabled: false
      },
      semester_phase_config: {
        phase_template: [
          {
            start_week: 1,
            end_week: 2,
            phase: "exploration"
          }
        ]
      },
      course_details: [
        {
          course_name_ref: "Chemistry Lab",
          course_class: "special",
          course_target_level: "pass_only",
          personal_fail_risk: "possible_to_fail",
          attendance_modes: ["full_roll_call_every_session"],
          special_course_kind: "lab_or_experiment"
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
