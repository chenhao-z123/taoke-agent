import type { ActionPlanItemOutput, ActionPlanOutput } from "@/lib/types/output";

import { db } from "@/lib/db";

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toPersistedDate(date: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00.000Z`)
    : new Date(date);
}

const mapPlanItemRow = (row: {
  id: string;
  courseId: string;
  date: Date;
  timeSlot: string;
  attendanceStatus: string;
  executionNote: string;
  eventFeedbackAllowed: boolean | null;
  mustAttendReason: string | null;
  estimatedCommuteTimeCost: number | null;
  estimatedSubstituteCost: number | null;
  leaveEarlyNote: string | null;
  phaseContextNote: string | null;
  shortTermOverrideNote: string | null;
  riskLevel: string | null;
  timeValueScore: number | null;
  moneyCostScore: number | null;
  decisionConfidence: string | null;
  missingInfoSummary: string | null;
  constraintHits: unknown;
  recordedAbsenceImpact: string | null;
  rareEventReplanNote: string | null;
  courseNameDisplay?: string;
  locationDisplay?: string;
  teacherNameDisplay?: string;
}): ActionPlanItemOutput => {
  const item: ActionPlanItemOutput = {
    plan_item_id: row.id,
    course_id: row.courseId,
    date: toDateOnlyString(row.date),
    time_slot: row.timeSlot,
    attendance_status: row.attendanceStatus as ActionPlanItemOutput["attendance_status"],
    execution_note: row.executionNote
  };

  if (row.courseNameDisplay !== undefined) {
    item.course_name_display = row.courseNameDisplay;
  }
  if (row.locationDisplay !== undefined) {
    item.location_display = row.locationDisplay;
  }
  if (row.teacherNameDisplay !== undefined) {
    item.teacher_name_display = row.teacherNameDisplay;
  }

  if (row.eventFeedbackAllowed !== null) {
    item.event_feedback_allowed = row.eventFeedbackAllowed;
  }
  if (row.mustAttendReason !== null) {
    item.must_attend_reason = row.mustAttendReason;
  }
  if (row.estimatedCommuteTimeCost !== null) {
    item.estimated_commute_time_cost = row.estimatedCommuteTimeCost;
  }
  if (row.estimatedSubstituteCost !== null) {
    item.estimated_substitute_cost = row.estimatedSubstituteCost;
  }
  if (row.leaveEarlyNote !== null) {
    item.leave_early_note = row.leaveEarlyNote;
  }
  if (row.phaseContextNote !== null) {
    item.phase_context_note = row.phaseContextNote;
  }
  if (row.shortTermOverrideNote !== null) {
    item.short_term_override_note = row.shortTermOverrideNote;
  }
  if (row.riskLevel !== null) {
    item.risk_level = row.riskLevel as ActionPlanItemOutput["risk_level"];
  }
  if (row.timeValueScore !== null) {
    item.time_value_score = row.timeValueScore;
  }
  if (row.moneyCostScore !== null) {
    item.money_cost_score = row.moneyCostScore;
  }
  if (row.decisionConfidence !== null) {
    item.decision_confidence =
      row.decisionConfidence as ActionPlanItemOutput["decision_confidence"];
  }
  if (row.missingInfoSummary !== null) {
    item.missing_info_summary = row.missingInfoSummary;
  }
  if (row.constraintHits !== null) {
    item.constraint_hits = row.constraintHits as string[];
  }
  if (row.recordedAbsenceImpact !== null) {
    item.recorded_absence_impact = row.recordedAbsenceImpact;
  }
  if (row.rareEventReplanNote !== null) {
    item.rare_event_replan_note = row.rareEventReplanNote;
  }

  return item;
};

export async function replaceGeneratedPlan(
  plan: ActionPlanOutput
): Promise<ActionPlanOutput> {
  await db.$transaction(async (tx) => {
    await tx.generatedPlanItem.deleteMany();
    await tx.generatedPlan.deleteMany();

    await tx.generatedPlan.create({
      data: {
        id: plan.plan_id,
        planningWindow: plan.planning_window,
        availableTimeViews: plan.available_time_views ?? undefined,
        strategySnapshot: plan.strategy_snapshot,
        tuningControls: plan.tuning_controls,
        judgeShortRationale: plan.judge_short_rationale ?? null,
        missingInfoPrompt: plan.missing_info_prompt ?? null,
        selectedCandidateId: plan.selected_candidate_id ?? null,
        judgeSummary: plan.judge_summary ?? null,
        debateSummary: plan.debate_summary ?? null,
        items: {
          create: plan.plan_items.map((item) => ({
            id: item.plan_item_id,
            courseId: item.course_id,
            date: toPersistedDate(item.date),
            timeSlot: item.time_slot,
            attendanceStatus: item.attendance_status,
            executionNote: item.execution_note,
            eventFeedbackAllowed: item.event_feedback_allowed ?? null,
            mustAttendReason: item.must_attend_reason ?? null,
            estimatedCommuteTimeCost: item.estimated_commute_time_cost ?? null,
            estimatedSubstituteCost: item.estimated_substitute_cost ?? null,
            leaveEarlyNote: item.leave_early_note ?? null,
            phaseContextNote: item.phase_context_note ?? null,
            shortTermOverrideNote: item.short_term_override_note ?? null,
            riskLevel: item.risk_level ?? null,
            timeValueScore: item.time_value_score ?? null,
            moneyCostScore: item.money_cost_score ?? null,
            decisionConfidence: item.decision_confidence ?? null,
            missingInfoSummary: item.missing_info_summary ?? null,
            constraintHits: item.constraint_hits ?? undefined,
            recordedAbsenceImpact: item.recorded_absence_impact ?? null,
            rareEventReplanNote: item.rare_event_replan_note ?? null
          }))
        }
      }
    });
  });

  const savedPlan = await getLatestGeneratedPlan();

  if (!savedPlan) {
    throw new Error("Failed to persist generated plan");
  }

  return savedPlan;
}

export async function getLatestGeneratedPlan(): Promise<ActionPlanOutput | null> {
  const [row, timetableRows] = await Promise.all([
    db.generatedPlan.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    }),
    db.timetableCourse.findMany({
      orderBy: {
        createdAt: "asc"
      }
    })
  ]);

  if (!row) {
    return null;
  }

  const courseDisplayById = new Map(
    timetableRows.map((item) => [
      item.courseName,
      {
        courseNameDisplay: item.courseName,
        locationDisplay: item.location ?? undefined,
        teacherNameDisplay: item.teacherName ?? undefined
      }
    ])
  );

  const plan: ActionPlanOutput = {
    plan_id: row.id,
    planning_window: row.planningWindow as ActionPlanOutput["planning_window"],
    strategy_snapshot: row.strategySnapshot as ActionPlanOutput["strategy_snapshot"],
    tuning_controls: row.tuningControls as ActionPlanOutput["tuning_controls"],
    plan_items: row.items.map((item) =>
      mapPlanItemRow({
        id: item.id,
        courseId: item.courseId,
        date: item.date,
        timeSlot: item.timeSlot,
        attendanceStatus: item.attendanceStatus,
        executionNote: item.executionNote,
        eventFeedbackAllowed: item.eventFeedbackAllowed,
        mustAttendReason: item.mustAttendReason,
        estimatedCommuteTimeCost: item.estimatedCommuteTimeCost,
        estimatedSubstituteCost: item.estimatedSubstituteCost,
        leaveEarlyNote: item.leaveEarlyNote,
        phaseContextNote: item.phaseContextNote,
        shortTermOverrideNote: item.shortTermOverrideNote,
        riskLevel: item.riskLevel,
        timeValueScore: item.timeValueScore,
        moneyCostScore: item.moneyCostScore,
        decisionConfidence: item.decisionConfidence,
        missingInfoSummary: item.missingInfoSummary,
        constraintHits: item.constraintHits,
        recordedAbsenceImpact: item.recordedAbsenceImpact,
        rareEventReplanNote: item.rareEventReplanNote,
        ...courseDisplayById.get(item.courseId)
      })
    )
  };

  if (row.availableTimeViews !== null) {
    plan.available_time_views =
      row.availableTimeViews as ActionPlanOutput["available_time_views"];
  }
  if (row.judgeShortRationale !== null) {
    plan.judge_short_rationale = row.judgeShortRationale;
  }
  if (row.selectedCandidateId !== null) {
    plan.selected_candidate_id = row.selectedCandidateId;
  }
  if (row.judgeSummary !== null) {
    plan.judge_summary = row.judgeSummary;
  }
  if (row.debateSummary !== null) {
    plan.debate_summary = row.debateSummary;
  }
  if (row.missingInfoPrompt !== null) {
    plan.missing_info_prompt = row.missingInfoPrompt;
  }

  return plan;
}
