import { z } from "zod";

const fieldConfidenceSchema = z.enum(["high", "medium", "low"]);

const planningModeSchema = z.enum(["safe_max_mode", "target_free_time_mode"]);
const strategyTierSchema = z.enum(["safe", "balanced", "aggressive"]);
const riskTierSchema = z.enum(["low", "medium", "high"]);
const executionPressureSchema = z.enum(["high", "medium", "low"]);
const scoreBufferPreferenceSchema = z.enum(["minimal", "some", "large"]);

const preferredTimeUseCaseSchema = z.enum([
  "study",
  "internship",
  "travel",
  "sleep",
  "gaming",
  "custom"
]);

const freeTimeTargetSchema = z.object({
  type: z.enum(["sessions", "hours", "usable_hours"]),
  value: z.number().finite()
});

const timeSlotSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  time: z.string().min(1)
});

const weekRangeSchema = z
  .object({
    start_week: z.number().int().min(1),
    end_week: z.number().int().min(1)
  })
  .refine(({ start_week, end_week }) => end_week >= start_week, {
    message: "end_week must be greater than or equal to start_week",
    path: ["end_week"]
  });

export const timetableCourseSchema = z.object({
  course_name: z.string().min(1),
  time_slots: z.array(timeSlotSchema).min(1),
  location: z.string().min(1).optional(),
  teacher_name: z.string().min(1).optional(),
  week_range: weekRangeSchema.optional(),
  course_type_or_credit: z.string().min(1).optional()
});

export const timetableImportSchema = z.object({
  courses: z.array(timetableCourseSchema)
});

export const userProfileSchema = z
  .object({
    planning_mode: planningModeSchema,
    free_time_target: freeTimeTargetSchema.optional(),
    strategy_tier: strategyTierSchema,
    risk_tier: riskTierSchema,
    max_recorded_absences_override: z.number().int().min(0).optional(),
    caught_risk_tolerance_note: z.string().min(1).optional(),
    execution_pressure: executionPressureSchema,
    score_buffer_preference: scoreBufferPreferenceSchema,
    prefer_large_blocks: z.boolean(),
    prefer_skip_early_classes: z.boolean(),
    prefer_skip_late_classes: z.boolean(),
    preferred_weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    preferred_time_use_cases: z.array(preferredTimeUseCaseSchema).optional(),
    substitute_attendance_enabled: z.boolean(),
    substitute_attendance_default_cost: z.number().finite().optional(),
    sign_in_then_leave_willingness: z.boolean(),
    retroactive_remedy_enabled: z.boolean()
  })
  .superRefine(({ planning_mode, free_time_target }, ctx) => {
    if (planning_mode === "target_free_time_mode" && !free_time_target) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "free_time_target is required in target_free_time_mode",
        path: ["free_time_target"]
      });
    }
  });

const semesterPhaseSchema = z.enum([
  "exploration",
  "normal_release",
  "midterm_tightening",
  "post_midterm_release",
  "final_tightening"
]);

const semesterPhaseSegmentSchema = z
  .object({
    start_week: z.number().int().min(1),
    end_week: z.number().int().min(1),
    phase: semesterPhaseSchema,
    note: z.string().min(1).optional()
  })
  .refine(({ start_week, end_week }) => end_week >= start_week, {
    message: "end_week must be greater than or equal to start_week",
    path: ["end_week"]
  });

export const semesterPhaseConfigSchema = z.object({
  phase_template: z.array(semesterPhaseSegmentSchema).min(1),
  phase_rule_overrides: z.array(semesterPhaseSegmentSchema).optional()
});

const courseClassSchema = z.enum(["core", "special", "easy"]);
const specialCourseKindSchema = z.enum([
  "lab_or_experiment",
  "physical_education",
  "strict_attendance",
  "awkward_teacher",
  "hard_to_escape",
  "easy_to_fail",
  "other_manual"
]);
const courseTargetLevelSchema = z.enum(["pass_only", "high_score_needed"]);
const personalFailRiskSchema = z.enum([
  "easy_to_fail",
  "possible_to_fail",
  "unlikely_to_fail"
]);
const attendanceModeSchema = z.enum([
  "full_roll_call_every_session",
  "random_student_check_every_session",
  "random_full_roll_call",
  "full_roll_call_when_class_small",
  "paper_sign_in_before_class",
  "location_based_sign_in",
  "qr_code_sign_in",
  "visual_or_verbal_confirmation",
  "unclear_or_irregular",
  "other_manual"
]);
const frequencyTierSchema = z.enum(["low", "medium", "high", "unknown"]);
const signInThenLeaveFeasibilitySchema = z.enum(["no", "maybe", "yes"]);
const escapeFeasibilityTierSchema = z.enum(["easy", "medium", "hard"]);
const escapeEnvironmentTagSchema = z.enum([
  "fixed_seating",
  "no_rear_route",
  "awkward_exit_path",
  "teacher_has_wide_line_of_sight",
  "small_classroom",
  "stairs_or_back_rows_available",
  "custom"
]);
const keySessionTypeSchema = z.enum([
  "first_session",
  "midterm_related_session",
  "pre_final_session",
  "teacher_announced_important_session",
  "small_class_high_risk_session",
  "exam_hint_or_material_session",
  "assignment_check_session",
  "quiz_presentation_or_high_signin_session",
  "other_manual"
]);
const rareEventTypeSchema = z.enum([
  "rare_full_roll_call",
  "rare_random_check",
  "unexpected_sign_in",
  "teacher_became_stricter",
  "other_manual"
]);

const gradingComponentSchema = z.object({
  name: z.string().min(1),
  weight_percent: z.number().finite().optional(),
  weight_note: z.string().min(1).optional()
});

export const rareEventFeedbackSchema = z.object({
  event_type: rareEventTypeSchema,
  note: z.string().min(1).optional(),
  occurred_at: z.string().min(1).optional()
});

export const courseDetailSchema = z
  .object({
    course_name_ref: z.string().min(1),
    course_class: courseClassSchema,
    field_confidence: fieldConfidenceSchema.optional(),
    special_course_kind: specialCourseKindSchema.optional(),
    course_target_level: courseTargetLevelSchema,
    special_reason_note: z.string().min(1).optional(),
    personal_fail_risk: personalFailRiskSchema,
    attendance_modes: z.array(attendanceModeSchema).min(1),
    full_roll_call_frequency_tier: frequencyTierSchema.optional(),
    random_check_frequency_tier: frequencyTierSchema.optional(),
    max_recorded_absences: z.number().int().min(0).optional(),
    fail_threshold_absences: z.number().int().min(0).optional(),
    score_loss_per_recorded_absence: z.number().finite().optional(),
    has_mandatory_sessions: z.boolean().optional(),
    absence_rule_note: z.string().min(1).optional(),
    absence_rule_confidence: fieldConfidenceSchema.optional(),
    grading_components: z.array(gradingComponentSchema).optional(),
    grading_raw_note: z.string().min(1).optional(),
    attendance_requirement_raw_input: z.string().min(1).optional(),
    attendance_requirement_structured_summary: z.string().min(1).optional(),
    sign_in_then_leave_feasibility: signInThenLeaveFeasibilitySchema.optional(),
    escape_feasibility_tier: escapeFeasibilityTierSchema.optional(),
    escape_environment_tags: z.array(escapeEnvironmentTagSchema).optional(),
    escape_environment_note: z.string().min(1).optional(),
    substitute_attendance_allowed_for_course: z.boolean().optional(),
    substitute_attendance_cost_override: z.number().finite().optional(),
    substitute_attendance_note: z.string().min(1).optional(),
    key_session_types: z.array(keySessionTypeSchema).optional(),
    rare_event_feedback: z.array(rareEventFeedbackSchema).optional(),
    course_notes: z.string().min(1).optional()
  })
  .superRefine(({ course_class, special_reason_note }, ctx) => {
    if (course_class === "special" && !special_reason_note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "special_reason_note is required for special courses",
        path: ["special_reason_note"]
      });
    }
  });

export const shortTermModifiersSchema = z.object({
  weather_modifier: z.string().min(1).optional(),
  temporary_goal_shift: z.string().min(1).optional(),
  upcoming_events: z.array(z.string().min(1)).optional(),
  body_state: z.string().min(1).optional(),
  time_value_adjustment_note: z.string().min(1).optional()
});

export const semesterPlanInputSchema = z.object({
  timetable_import: timetableImportSchema,
  user_profile: userProfileSchema,
  semester_phase_config: semesterPhaseConfigSchema,
  course_details: z.array(courseDetailSchema),
  short_term_modifiers: shortTermModifiersSchema.optional()
});

export const courseDetailsSchema = z.array(courseDetailSchema);

export const reportRareEventSchema = z.object({
  course_name_ref: z.string().min(1),
  feedback: rareEventFeedbackSchema
});

export type SemesterPlanInputSchema = z.infer<typeof semesterPlanInputSchema>;
