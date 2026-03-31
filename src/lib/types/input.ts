export type FieldConfidence = "high" | "medium" | "low";

export type PlanningMode = "safe_max_mode" | "target_free_time_mode";
export type StrategyTier = "safe" | "balanced" | "aggressive";
export type RiskTier = "low" | "medium" | "high";
export type ExecutionPressure = "high" | "medium" | "low";
export type ScoreBufferPreference = "minimal" | "some" | "large";

export type PreferredTimeUseCase =
  | "study"
  | "internship"
  | "travel"
  | "sleep"
  | "gaming"
  | "custom";

export type FreeTimeTarget = {
  type: "sessions" | "hours" | "usable_hours";
  value: number;
};

export type TimeSlotInput = {
  day_of_week: number;
  time: string;
};

export type WeekRangeInput = {
  start_week: number;
  end_week: number;
};

export type TimetableCourseInput = {
  course_name: string;
  time_slots: TimeSlotInput[];
  location?: string;
  teacher_name?: string;
  week_range?: WeekRangeInput;
  course_type_or_credit?: string;
};

export type UserProfileInput = {
  planning_mode: PlanningMode;
  free_time_target?: FreeTimeTarget;
  strategy_tier: StrategyTier;
  risk_tier: RiskTier;
  max_recorded_absences_override?: number;
  caught_risk_tolerance_note?: string;
  execution_pressure: ExecutionPressure;
  score_buffer_preference: ScoreBufferPreference;
  prefer_large_blocks: boolean;
  prefer_skip_early_classes: boolean;
  prefer_skip_late_classes: boolean;
  preferred_weekdays?: number[];
  preferred_time_use_cases?: PreferredTimeUseCase[];
  substitute_attendance_enabled: boolean;
  substitute_attendance_default_cost?: number;
  sign_in_then_leave_willingness: boolean;
  retroactive_remedy_enabled: boolean;
};

export type SemesterPhase =
  | "exploration"
  | "normal_release"
  | "midterm_tightening"
  | "post_midterm_release"
  | "final_tightening";

export type SemesterPhaseSegment = {
  start_week: number;
  end_week: number;
  phase: SemesterPhase;
  note?: string;
};

export type SemesterPhaseConfigInput = {
  phase_template: SemesterPhaseSegment[];
  phase_rule_overrides?: SemesterPhaseSegment[];
};

export type CourseClass = "core" | "special" | "easy";
export type SpecialCourseKind =
  | "lab_or_experiment"
  | "physical_education"
  | "strict_attendance"
  | "awkward_teacher"
  | "hard_to_escape"
  | "easy_to_fail"
  | "other_manual";
export type CourseTargetLevel = "pass_only" | "high_score_needed";
export type PersonalFailRisk =
  | "easy_to_fail"
  | "possible_to_fail"
  | "unlikely_to_fail";
export type AttendanceMode =
  | "full_roll_call_every_session"
  | "random_student_check_every_session"
  | "random_full_roll_call"
  | "full_roll_call_when_class_small"
  | "paper_sign_in_before_class"
  | "location_based_sign_in"
  | "qr_code_sign_in"
  | "visual_or_verbal_confirmation"
  | "unclear_or_irregular"
  | "other_manual";

export type FrequencyTier = "low" | "medium" | "high" | "unknown";
export type SignInThenLeaveFeasibility = "no" | "maybe" | "yes";
export type EscapeFeasibilityTier = "easy" | "medium" | "hard";
export type EscapeEnvironmentTag =
  | "fixed_seating"
  | "no_rear_route"
  | "awkward_exit_path"
  | "teacher_has_wide_line_of_sight"
  | "small_classroom"
  | "stairs_or_back_rows_available"
  | "custom";

export type KeySessionType =
  | "first_session"
  | "midterm_related_session"
  | "pre_final_session"
  | "teacher_announced_important_session"
  | "small_class_high_risk_session"
  | "exam_hint_or_material_session"
  | "assignment_check_session"
  | "quiz_presentation_or_high_signin_session"
  | "other_manual";

export type RareEventType =
  | "rare_full_roll_call"
  | "rare_random_check"
  | "unexpected_sign_in"
  | "teacher_became_stricter"
  | "other_manual";

export type GradingComponentInput = {
  name: string;
  weight_percent?: number;
  weight_note?: string;
};

export type RareEventFeedbackInput = {
  event_type: RareEventType;
  note?: string;
  occurred_at?: string;
};

export type CourseDetailInput = {
  course_name_ref: string;
  course_class: CourseClass;
  field_confidence?: FieldConfidence;
  special_course_kind?: SpecialCourseKind;
  course_target_level: CourseTargetLevel;
  special_reason_note?: string;
  personal_fail_risk: PersonalFailRisk;
  attendance_modes: AttendanceMode[];
  full_roll_call_frequency_tier?: FrequencyTier;
  random_check_frequency_tier?: FrequencyTier;
  max_recorded_absences?: number;
  fail_threshold_absences?: number;
  score_loss_per_recorded_absence?: number;
  has_mandatory_sessions?: boolean;
  absence_rule_note?: string;
  absence_rule_confidence?: FieldConfidence;
  grading_components?: GradingComponentInput[];
  grading_raw_note?: string;
  attendance_requirement_raw_input?: string;
  attendance_requirement_structured_summary?: string;
  sign_in_then_leave_feasibility?: SignInThenLeaveFeasibility;
  escape_feasibility_tier?: EscapeFeasibilityTier;
  escape_environment_tags?: EscapeEnvironmentTag[];
  escape_environment_note?: string;
  substitute_attendance_allowed_for_course?: boolean;
  substitute_attendance_cost_override?: number;
  substitute_attendance_note?: string;
  key_session_types?: KeySessionType[];
  rare_event_feedback?: RareEventFeedbackInput[];
  course_notes?: string;
};

export type ShortTermModifiersInput = {
  weather_modifier?: string;
  temporary_goal_shift?: string;
  upcoming_events?: string[];
  body_state?: string;
  time_value_adjustment_note?: string;
};

export type TimetableImportInput = {
  courses: TimetableCourseInput[];
};

export type SemesterPlanInput = {
  timetable_import: TimetableImportInput;
  user_profile: UserProfileInput;
  semester_phase_config: SemesterPhaseConfigInput;
  course_details: CourseDetailInput[];
  short_term_modifiers?: ShortTermModifiersInput;
};
