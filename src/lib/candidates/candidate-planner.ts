import { evaluateHardBlockers, getForcedAttendanceReason } from "@/lib/decision/blockers";
import { estimatePressures } from "@/lib/decision/pressures";
import type {
  AttendanceAction,
  CandidatePlan,
  CandidatePlanItem,
  OccurrenceContext,
  PressureLevel
} from "@/lib/types/decision";

export type CandidatePlannerTuning = "more_conservative" | "more_aggressive";

export type GenerateCandidatePlansInput = {
  occurrences: OccurrenceContext[];
  tuning?: CandidatePlannerTuning;
};

type CandidateStyle = "time_priority" | "balanced" | "execution_friendly";

function pressureToScore(level: PressureLevel): number {
  if (level === "high") {
    return 3;
  }

  if (level === "medium") {
    return 2;
  }

  return 1;
}

function canUseSubstitute(context: OccurrenceContext): boolean {
  return (
    context.user_profile.substitute_attendance_enabled &&
    context.course_details.substitute_attendance_allowed_for_course !== false
  );
}

function canArriveThenLeaveEarly(context: OccurrenceContext): boolean {
  return (
    context.user_profile.sign_in_then_leave_willingness &&
    context.course_details.sign_in_then_leave_feasibility !== "no"
  );
}

function adjustRiskScore(score: number, tuning?: CandidatePlannerTuning): number {
  if (tuning === "more_conservative") {
    return score + 1;
  }

  if (tuning === "more_aggressive") {
    return Math.max(0, score - 1);
  }

  return score;
}

function getFeasibleActions(
  context: OccurrenceContext,
  hasHardBlocker: boolean
): AttendanceAction[] {
  if (hasHardBlocker) {
    return ["attend_full"];
  }

  const actions: AttendanceAction[] = ["skip"];

  if (canUseSubstitute(context)) {
    actions.push("substitute_attendance");
  }

  if (canArriveThenLeaveEarly(context)) {
    actions.push("arrive_then_leave_early");
  }

  actions.push("attend_full");

  return actions;
}

function chooseAction(
  style: CandidateStyle,
  context: OccurrenceContext,
  tuning?: CandidatePlannerTuning
): AttendanceAction {
  const blockers = evaluateHardBlockers(context);
  const forcedReason = getForcedAttendanceReason(blockers);

  if (forcedReason) {
    return "attend_full";
  }

  const pressures = estimatePressures(context);
  const feasibleActions = getFeasibleActions(context, false);
  const softBlockerCount = blockers.filter((blocker) => blocker.severity === "soft").length;
  const riskScore = adjustRiskScore(
    pressureToScore(pressures.academic) + pressureToScore(pressures.catch) + softBlockerCount,
    tuning
  );
  const freeTimeScore = pressureToScore(pressures.free_time_value);
  const executionScore = pressureToScore(pressures.execution_cost);

  if (style === "execution_friendly") {
    if (executionScore >= 3 && feasibleActions.includes("attend_full")) {
      return "attend_full";
    }

    if (riskScore >= 6 && feasibleActions.includes("attend_full")) {
      return "attend_full";
    }

    if (riskScore >= 4 && feasibleActions.includes("substitute_attendance")) {
      return "substitute_attendance";
    }

    if (feasibleActions.includes("arrive_then_leave_early")) {
      return "arrive_then_leave_early";
    }

    return feasibleActions[0] ?? "attend_full";
  }

  if (style === "balanced") {
    if (riskScore >= 6 && feasibleActions.includes("attend_full")) {
      return "attend_full";
    }

    if (
      tuning === "more_aggressive" &&
      riskScore <= 3 &&
      feasibleActions.includes("skip")
    ) {
      return "skip";
    }

    if (riskScore >= 4 && tuning !== "more_aggressive") {
      if (feasibleActions.includes("substitute_attendance")) {
        return "substitute_attendance";
      }

      if (feasibleActions.includes("arrive_then_leave_early")) {
        return "arrive_then_leave_early";
      }
    }

    if (freeTimeScore >= 3 && feasibleActions.includes("skip")) {
      return "skip";
    }

    if (feasibleActions.includes("arrive_then_leave_early")) {
      return "arrive_then_leave_early";
    }

    if (feasibleActions.includes("substitute_attendance")) {
      return "substitute_attendance";
    }

    return "attend_full";
  }

  if (riskScore >= 6 && feasibleActions.includes("attend_full")) {
    return "attend_full";
  }

  if (riskScore >= 3 && tuning === "more_conservative") {
    if (feasibleActions.includes("arrive_then_leave_early")) {
      return "arrive_then_leave_early";
    }

    if (feasibleActions.includes("substitute_attendance")) {
      return "substitute_attendance";
    }
  }

  if (freeTimeScore >= 3 && feasibleActions.includes("skip")) {
    return "skip";
  }

  if (feasibleActions.includes("substitute_attendance")) {
    return "substitute_attendance";
  }

  if (feasibleActions.includes("arrive_then_leave_early")) {
    return "arrive_then_leave_early";
  }

  return "attend_full";
}

function buildExecutionNote(
  action: AttendanceAction,
  context: OccurrenceContext
): string {
  const blockers = evaluateHardBlockers(context);
  const forcedReason = getForcedAttendanceReason(blockers);

  if (forcedReason) {
    return forcedReason;
  }

  if (action === "skip") {
    return "Skip this occurrence to preserve a higher-value free-time block.";
  }

  if (action === "substitute_attendance") {
    return "Use substitute attendance to keep coverage without spending a full in-person block.";
  }

  if (action === "arrive_then_leave_early") {
    return "Show up briefly, then leave early to preserve some time while reducing risk.";
  }

  return "Attend in full because the current risk or execution profile does not support a freer action.";
}

function buildCandidatePlan(
  style: CandidateStyle,
  occurrences: OccurrenceContext[],
  tuning?: CandidatePlannerTuning
): CandidatePlan {
  const items: CandidatePlanItem[] = occurrences.map((context) => {
    const action = chooseAction(style, context, tuning);

    return {
      course_id: context.course.course_name,
      action,
      occurrence: context.occurrence,
      execution_note: buildExecutionNote(action, context)
    };
  });

  return {
    candidate_id: style,
    items,
    summary_note: `Candidate style: ${style.replaceAll("_", " ")}`
  };
}

export function generateCandidatePlans(
  input: GenerateCandidatePlansInput
): CandidatePlan[] {
  return [
    buildCandidatePlan("time_priority", input.occurrences, input.tuning),
    buildCandidatePlan("balanced", input.occurrences, input.tuning),
    buildCandidatePlan("execution_friendly", input.occurrences, input.tuning)
  ];
}
