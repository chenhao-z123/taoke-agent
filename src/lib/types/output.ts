import type { RiskTier, SemesterPhase, ShortTermModifiersInput, StrategyTier } from "./input";

export type TimeView = "today" | "this_week" | "current_phase" | "custom";

export type PlanningWindow = {
  start_date: string;
  end_date: string;
  view: TimeView;
};

export type StrategySnapshot = {
  strategy_tier: StrategyTier;
  risk_tier: RiskTier;
  semester_phase: SemesterPhase;
  short_term_modifiers?: ShortTermModifiersInput;
};

export type TuningControl = {
  hint?: string;
};

export type TuningControls = {
  more_conservative: TuningControl;
  more_aggressive: TuningControl;
};

export type AttendanceStatus =
  | "skip"
  | "substitute_attendance"
  | "arrive_then_leave_early"
  | "attend_full";

export type ActionPlanItemOutput = {
  plan_item_id: string;
  course_id: string;
  date: string;
  time_slot: string;
  attendance_status: AttendanceStatus;
  execution_note: string;
  event_feedback_allowed?: boolean;
  must_attend_reason?: string;
  estimated_commute_time_cost?: number;
  estimated_substitute_cost?: number;
  leave_early_note?: string;
  course_name_display?: string;
  location_display?: string;
  teacher_name_display?: string;
  phase_context_note?: string;
  short_term_override_note?: string;
  risk_level?: "low" | "medium" | "high";
  time_value_score?: number;
  money_cost_score?: number;
  decision_confidence?: "low" | "medium" | "high";
  missing_info_summary?: string;
  constraint_hits?: string[];
  recorded_absence_impact?: string;
  rare_event_replan_note?: string;
};

export type ActionPlanOutput = {
  plan_id: string;
  planning_window: PlanningWindow;
  available_time_views?: TimeView[];
  strategy_snapshot: StrategySnapshot;
  judge_short_rationale?: string;
  tuning_controls: TuningControls;
  selected_candidate_id?: string;
  judge_summary?: string;
  debate_summary?: string;
  missing_info_prompt?: string;
  plan_items: ActionPlanItemOutput[];
};
