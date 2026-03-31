import type { SemesterPhaseConfigInput } from "@/lib/types/input";

import { db } from "@/lib/db";
import { semesterPhaseConfigSchema } from "@/lib/schema/input";

export async function replaceSemesterPhaseConfig(
  config: SemesterPhaseConfigInput
): Promise<SemesterPhaseConfigInput> {
  await db.$transaction(async (tx) => {
    await tx.semesterPhaseConfig.deleteMany();

    await tx.semesterPhaseConfig.create({
      data: {
        phaseTemplate: config.phase_template,
        phaseRuleOverrides: config.phase_rule_overrides ?? undefined
      }
    });
  });

  const savedConfig = await getSemesterPhaseConfig();

  if (!savedConfig) {
    throw new Error("Failed to persist semester phase config");
  }

  return savedConfig;
}

export async function getSemesterPhaseConfig(): Promise<SemesterPhaseConfigInput | null> {
  const row = await db.semesterPhaseConfig.findFirst({
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!row) {
    return null;
  }

  return semesterPhaseConfigSchema.parse({
    phase_template: row.phaseTemplate,
    phase_rule_overrides: row.phaseRuleOverrides ?? undefined
  });
}
