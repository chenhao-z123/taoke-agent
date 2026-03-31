"use server";

import type { CandidatePlannerTuning } from "@/lib/candidates/candidate-planner";

import { generatePlanWithTuning } from "@/server/actions/generate-plan";

export async function retunePlan(input: { tuning: CandidatePlannerTuning }) {
  return generatePlanWithTuning(input.tuning);
}
