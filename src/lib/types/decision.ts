import type {
  CourseDetailInput,
  FreeTimeTarget,
  PlanningMode,
  SemesterPhase,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "./input";

export type AttendanceAction =
  | "skip"
  | "substitute_attendance"
  | "arrive_then_leave_early"
  | "attend_full";

export type OccurrenceTimeSlot = {
  date: string;
  time_slot: string;
};

export type OccurrenceContext = {
  course: TimetableCourseInput;
  course_details: CourseDetailInput;
  user_profile: UserProfileInput;
  planning_mode: PlanningMode;
  free_time_target?: FreeTimeTarget;
  semester_phase: SemesterPhase;
  short_term_modifiers?: ShortTermModifiersInput;
  occurrence_week: number;
  occurrence: OccurrenceTimeSlot;
};

export type HardBlocker = {
  id: string;
  reason: string;
  severity: "hard" | "soft";
};

export type PressureLevel = "low" | "medium" | "high";

export type PressureEstimate = {
  academic: PressureLevel;
  catch: PressureLevel;
  free_time_value: PressureLevel;
  execution_cost: PressureLevel;
};

export type DecisionConfidence = "low" | "medium" | "high";

export type DeterministicDecisionRecord = {
  occurrence: OccurrenceTimeSlot;
  chosen_action: AttendanceAction;
  feasible_actions: AttendanceAction[];
  baseline_action: AttendanceAction;
  pressures: PressureEstimate;
  confidence: DecisionConfidence;
  constraint_hits: string[];
  must_attend_reason?: string;
};

export type CandidatePlanItem = {
  course_id: string;
  action: AttendanceAction;
  occurrence: OccurrenceTimeSlot;
  execution_note: string;
};

export type CandidatePlan = {
  candidate_id: string;
  items: CandidatePlanItem[];
  summary_note?: string;
};

export type DebateReview = {
  agent_role: "academic_guardian" | "time_maximizer" | "execution_realist";
  preferred_candidate_ids: string[];
  strongest_objections: string[];
  strongest_supports: string[];
  warning_flags: string[];
  missing_info_notes?: string[];
};

export type JudgeSelectionResult = {
  selected_candidate_id: string;
  rationale: string;
  confidence: DecisionConfidence;
  fallback_candidate_id?: string;
  user_facing_summary?: string;
};
