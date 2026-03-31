import type { CandidatePlan, OccurrenceContext } from "@/lib/types/decision";

export type DebateInput = {
  contexts: OccurrenceContext[];
  candidates: CandidatePlan[];
  planning_mode: OccurrenceContext["planning_mode"];
  semester_phase: OccurrenceContext["semester_phase"];
  short_term_modifiers?: OccurrenceContext["short_term_modifiers"];
};

export function buildDebateInput(input: {
  contexts: OccurrenceContext[];
  candidates: CandidatePlan[];
}): DebateInput {
  const firstContext = input.contexts[0];

  if (!firstContext) {
    throw new Error("At least one occurrence context is required for debate input");
  }

  return {
    contexts: input.contexts,
    candidates: input.candidates,
    planning_mode: firstContext.planning_mode,
    semester_phase: firstContext.semester_phase,
    short_term_modifiers: firstContext.short_term_modifiers
  };
}
