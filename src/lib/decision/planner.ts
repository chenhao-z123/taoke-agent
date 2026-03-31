import { reviewCandidatesAsAcademicGuardian } from "@/lib/agents/academic-guardian";
import { reviewCandidatesAsExecutionRealist } from "@/lib/agents/execution-realist";
import { selectCandidateWithJudge } from "@/lib/agents/judge";
import { reviewCandidatesAsTimeMaximizer } from "@/lib/agents/time-maximizer";
import { reviewCandidatesAsAcademicGuardianWithLlm } from "@/lib/agents/llm-academic-guardian";
import { reviewCandidatesAsExecutionRealistWithLlm } from "@/lib/agents/llm-execution-realist";
import { selectCandidateWithLlmJudge } from "@/lib/agents/llm-judge";
import { reviewCandidatesAsTimeMaximizerWithLlm } from "@/lib/agents/llm-time-maximizer";
import {
  type CandidatePlannerTuning,
  generateCandidatePlans
} from "@/lib/candidates/candidate-planner";
import { buildDebateInput, type DebateInput } from "@/lib/debate/protocol";
import { withTraceObservation } from "@/lib/observability/langfuse";
import type {
  CandidatePlan,
  CandidatePlanItem,
  DebateReview,
  JudgeSelectionResult,
  OccurrenceContext
} from "@/lib/types/decision";
import type { RareEventFeedbackInput } from "@/lib/types/input";

export type RareEventPlannerInput = {
  course_name_ref: string;
  feedback: RareEventFeedbackInput;
};

export type RareEventReplanScope = {
  course_name_ref: string;
  affected_occurrence_dates: string[];
};

export type PlanningLlmMode = "disabled" | "debate_and_judge";

export type OrchestratedPlanResult = {
  planning_mode: OccurrenceContext["planning_mode"];
  source_occurrences: OccurrenceContext[];
  candidate_plans: CandidatePlan[];
  debated_candidates: CandidatePlan[];
  debate_reviews: DebateReview[];
  judge_result: JudgeSelectionResult;
  selected_candidate: CandidatePlan;
  selected_plan_items: CandidatePlanItem[];
  target_satisfied: boolean;
  rare_event_replan_scope?: RareEventReplanScope;
};

function getPlanningMode(contexts: OccurrenceContext[]): OccurrenceContext["planning_mode"] {
  const firstContext = contexts[0];

  if (!firstContext) {
    throw new Error("Planner requires at least one occurrence context");
  }

  return firstContext.planning_mode;
}

function getTargetSatisfied(
  candidate: CandidatePlan | undefined,
  contexts: OccurrenceContext[]
): boolean {
  const firstContext = contexts[0];
  const freeTimeTarget = firstContext?.free_time_target;

  if (!candidate || !freeTimeTarget) {
    return false;
  }

  if (freeTimeTarget.type !== "sessions") {
    return false;
  }

  const freedSessions = candidate.items.filter(
    (item) => item.action === "skip" || item.action === "substitute_attendance"
  ).length;

  return freedSessions >= freeTimeTarget.value;
}

function getDebatedCandidates(
  candidatePlans: CandidatePlan[],
  contexts: OccurrenceContext[]
): { debatedCandidates: CandidatePlan[]; targetSatisfied: boolean } {
  if (getPlanningMode(contexts) !== "target_free_time_mode") {
    return {
      debatedCandidates: candidatePlans,
      targetSatisfied: false
    };
  }

  const satisfactoryCandidates = candidatePlans.filter((candidate) =>
    getTargetSatisfied(candidate, contexts)
  );

  return {
    debatedCandidates:
      satisfactoryCandidates.length > 0 ? satisfactoryCandidates : candidatePlans,
    targetSatisfied: satisfactoryCandidates.length > 0
  };
}

function buildDeterministicDebateReviews(debateInput: DebateInput): DebateReview[] {
  return [
    reviewCandidatesAsAcademicGuardian(debateInput),
    reviewCandidatesAsTimeMaximizer(debateInput),
    reviewCandidatesAsExecutionRealist(debateInput)
  ];
}

async function buildLlmDebateReviews(debateInput: DebateInput): Promise<DebateReview[]> {
  return Promise.all([
    reviewCandidatesAsAcademicGuardianWithLlm(debateInput),
    reviewCandidatesAsTimeMaximizerWithLlm(debateInput),
    reviewCandidatesAsExecutionRealistWithLlm(debateInput)
  ]);
}

function selectDeterministicCandidate(
  debateInput: DebateInput,
  debateReviews: DebateReview[]
): JudgeSelectionResult {
  return selectCandidateWithJudge({
    debate_input: debateInput,
    reviews: debateReviews
  });
}

function applyRareEventNote(
  item: CandidatePlanItem,
  rareEventReplanScope: RareEventReplanScope | undefined
): CandidatePlanItem {
  if (!rareEventReplanScope) {
    return item;
  }

  const isAffected =
    item.course_id === rareEventReplanScope.course_name_ref &&
    rareEventReplanScope.affected_occurrence_dates.includes(item.occurrence.date);

  if (!isAffected) {
    return item;
  }

  return {
    ...item,
    execution_note: `${item.execution_note} Replanned with extra rare event caution.`
  };
}

function getRareEventReplanScope(
  contexts: OccurrenceContext[],
  rareEventFeedback: RareEventPlannerInput | undefined
): RareEventReplanScope | undefined {
  const occurredAt = rareEventFeedback?.feedback.occurred_at;

  if (!occurredAt) {
    return undefined;
  }

  const affectedOccurrenceDates = contexts
    .filter(
      (context) =>
        context.course.course_name === rareEventFeedback.course_name_ref &&
        context.occurrence.date > occurredAt
    )
    .map((context) => context.occurrence.date);

  if (affectedOccurrenceDates.length === 0) {
    return undefined;
  }

  return {
    course_name_ref: rareEventFeedback.course_name_ref,
    affected_occurrence_dates: affectedOccurrenceDates
  };
}

export async function orchestratePlan(input: {
  occurrences: OccurrenceContext[];
  tuning?: CandidatePlannerTuning;
  rare_event_feedback?: RareEventPlannerInput;
  planning_llm_mode?: PlanningLlmMode;
}): Promise<OrchestratedPlanResult> {
  return withTraceObservation(
    "planner.orchestrate",
    {
      initialUpdate: {
        input: {
          occurrence_count: input.occurrences.length,
          planning_llm_mode: input.planning_llm_mode ?? "disabled",
          has_tuning: Boolean(input.tuning),
          has_rare_event_feedback: Boolean(input.rare_event_feedback)
        }
      }
    },
    async (trace) => {
      const candidatePlans = generateCandidatePlans({
        occurrences: input.occurrences,
        tuning: input.tuning
      });
      const { debatedCandidates, targetSatisfied } = getDebatedCandidates(
        candidatePlans,
        input.occurrences
      );
      const debateInput = buildDebateInput({
        contexts: input.occurrences,
        candidates: debatedCandidates
      });
      const planningLlmMode: PlanningLlmMode =
        input.planning_llm_mode ?? "disabled";
      const runDeterministicDebateAndJudge = (): {
        debateReviews: DebateReview[];
        judgeResult: JudgeSelectionResult;
      } => {
        const deterministicDebateReviews = buildDeterministicDebateReviews(debateInput);

        return {
          debateReviews: deterministicDebateReviews,
          judgeResult: selectDeterministicCandidate(debateInput, deterministicDebateReviews)
        };
      };

      let debateReviews: DebateReview[];
      let judgeResult: JudgeSelectionResult;

      if (planningLlmMode === "debate_and_judge") {
        try {
          debateReviews = await buildLlmDebateReviews(debateInput);
          judgeResult = await selectCandidateWithLlmJudge({
            debate_input: debateInput,
            reviews: debateReviews
          });
        } catch (error) {
          trace.update({
            metadata: {
              fallback_to_deterministic: true,
              fallback_reason: error instanceof Error ? error.message : String(error)
            }
          });
          ({ debateReviews, judgeResult } = runDeterministicDebateAndJudge());
        }
      } else {
        ({ debateReviews, judgeResult } = runDeterministicDebateAndJudge());
      }
      const selectedCandidate = debatedCandidates.find(
        (candidate) => candidate.candidate_id === judgeResult.selected_candidate_id
      );

      if (!selectedCandidate) {
        throw new Error("Judge selected a candidate outside the debated candidate set");
      }

      const rareEventReplanScope = getRareEventReplanScope(
        input.occurrences,
        input.rare_event_feedback
      );

      const result = {
        planning_mode: getPlanningMode(input.occurrences),
        source_occurrences: input.occurrences,
        candidate_plans: candidatePlans,
        debated_candidates: debatedCandidates,
        debate_reviews: debateReviews,
        judge_result: judgeResult,
        selected_candidate: selectedCandidate,
        selected_plan_items: selectedCandidate.items.map((item) =>
          applyRareEventNote(item, rareEventReplanScope)
        ),
        target_satisfied: targetSatisfied,
        rare_event_replan_scope: rareEventReplanScope
      };

      trace.update({
        output: {
          candidate_count: result.candidate_plans.length,
          debated_candidate_count: result.debated_candidates.length,
          selected_candidate_id: result.selected_candidate.candidate_id,
          target_satisfied: result.target_satisfied
        },
        metadata: {
          planning_llm_mode: planningLlmMode
        }
      });

      return result;
    }
  );
}
