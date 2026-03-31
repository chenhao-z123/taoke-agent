import { evaluateHardBlockers, getForcedAttendanceReason } from "@/lib/decision/blockers";
import type { OrchestratedPlanResult } from "@/lib/decision/planner";
import type { CandidatePlanItem, OccurrenceContext } from "@/lib/types/decision";
import type {
  ActionPlanItemOutput,
  ActionPlanOutput,
  PlanningWindow,
  TimeView,
  TuningControls
} from "@/lib/types/output";

function buildTuningControls(): TuningControls {
  return {
    more_conservative: {
      hint: "Expect more attendance on borderline classes."
    },
    more_aggressive: {
      hint: "Expect more free time on borderline classes."
    }
  };
}

function findContextForItem(
  item: CandidatePlanItem,
  contexts: OccurrenceContext[]
): OccurrenceContext | undefined {
  return contexts.find(
    (context) =>
      context.course.course_name === item.course_id &&
      context.occurrence.date === item.occurrence.date &&
      context.occurrence.time_slot === item.occurrence.time_slot
  );
}

function getRiskLevel(context: OccurrenceContext): "low" | "medium" | "high" {
  if (
    context.course_details.personal_fail_risk === "easy_to_fail" ||
    context.semester_phase === "final_tightening"
  ) {
    return "high";
  }

  if (context.course_details.personal_fail_risk === "possible_to_fail") {
    return "medium";
  }

  return "low";
}

function getMissingInfoSummary(context: OccurrenceContext): string | undefined {
  if (
    context.course_details.field_confidence === "low" ||
    context.course_details.absence_rule_confidence === "low"
  ) {
    return "Low confidence in course attendance information may affect this recommendation.";
  }

  return undefined;
}

function buildPlanItemOutput(input: {
  item: CandidatePlanItem;
  context: OccurrenceContext | undefined;
  plannerResult: OrchestratedPlanResult;
  index: number;
  planId: string;
}): ActionPlanItemOutput {
  const { item, context, plannerResult, index, planId } = input;
  const blockers = context ? evaluateHardBlockers(context) : [];
  const mustAttendReason = getForcedAttendanceReason(blockers);
  const shortTermNote = context?.short_term_modifiers?.temporary_goal_shift;
  const rareEventAffected =
    plannerResult.rare_event_replan_scope?.course_name_ref === item.course_id &&
    plannerResult.rare_event_replan_scope.affected_occurrence_dates.includes(
      item.occurrence.date
    );

  return {
    plan_item_id: `${planId}-item-${index + 1}`,
    course_id: item.course_id,
    date: item.occurrence.date,
    time_slot: item.occurrence.time_slot,
    attendance_status: item.action,
    execution_note: item.execution_note,
    event_feedback_allowed: true,
    must_attend_reason: mustAttendReason,
    estimated_substitute_cost:
      context?.course_details.substitute_attendance_cost_override ??
      context?.user_profile.substitute_attendance_default_cost,
    leave_early_note:
      item.action === "arrive_then_leave_early"
        ? "Leave once the attendance requirement is safely satisfied."
        : undefined,
    course_name_display: context?.course.course_name,
    location_display: context?.course.location,
    teacher_name_display: context?.course.teacher_name,
    phase_context_note: context
      ? `Current semester phase: ${context.semester_phase}.`
      : undefined,
    short_term_override_note: shortTermNote
      ? `Short-term override: ${shortTermNote}.`
      : undefined,
    risk_level: context ? getRiskLevel(context) : undefined,
    decision_confidence: plannerResult.judge_result.confidence,
    missing_info_summary: context ? getMissingInfoSummary(context) : undefined,
    constraint_hits: blockers.map((blocker) => blocker.id),
    rare_event_replan_note: rareEventAffected
      ? "This occurrence was replanned with bounded rare event caution."
      : undefined
  };
}

function buildDebateSummary(result: OrchestratedPlanResult): string {
  return result.debate_reviews
    .map(
      (review) =>
        `${review.agent_role}: ${review.preferred_candidate_ids.join(" > ")}`
    )
    .join(" | ");
}

function buildMissingInfoPrompt(result: OrchestratedPlanResult): string | undefined {
  const notes = result.debate_reviews.flatMap(
    (review) => review.missing_info_notes ?? []
  );

  if (notes.length === 0) {
    return undefined;
  }

  return notes.join(" ");
}

function buildAvailableTimeViews(): TimeView[] {
  return ["today", "this_week", "current_phase"];
}

export function mapPlanToOutput(input: {
  plan_id: string;
  planning_window: PlanningWindow;
  planner_result: OrchestratedPlanResult;
}): ActionPlanOutput {
  const firstContext = input.planner_result.source_occurrences[0];

  if (!firstContext) {
    throw new Error("Planner result must include source occurrences");
  }

  return {
    plan_id: input.plan_id,
    planning_window: input.planning_window,
    available_time_views: buildAvailableTimeViews(),
    strategy_snapshot: {
      strategy_tier: firstContext.user_profile.strategy_tier,
      risk_tier: firstContext.user_profile.risk_tier,
      semester_phase: firstContext.semester_phase,
      short_term_modifiers: firstContext.short_term_modifiers
    },
    judge_short_rationale: input.planner_result.judge_result.rationale,
    tuning_controls: buildTuningControls(),
    selected_candidate_id: input.planner_result.judge_result.selected_candidate_id,
    judge_summary:
      input.planner_result.judge_result.user_facing_summary ??
      input.planner_result.judge_result.rationale,
    debate_summary: buildDebateSummary(input.planner_result),
    missing_info_prompt: buildMissingInfoPrompt(input.planner_result),
    plan_items: input.planner_result.selected_plan_items.map((item, index) =>
      buildPlanItemOutput({
        item,
        context: findContextForItem(item, input.planner_result.source_occurrences),
        plannerResult: input.planner_result,
        index,
        planId: input.plan_id
      })
    )
  };
}
