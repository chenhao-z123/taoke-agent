"use server";

import { replaceSemesterPhaseConfig } from "@/lib/repo/semester-phase";
import { semesterPhaseConfigSchema } from "@/lib/schema/input";

export async function saveSemesterPhase(input: unknown) {
  const parsedInput = semesterPhaseConfigSchema.parse(input);
  const semester_phase_config = await replaceSemesterPhaseConfig(parsedInput);

  return { semester_phase_config };
}
