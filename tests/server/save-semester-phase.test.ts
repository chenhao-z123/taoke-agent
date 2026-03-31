import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { saveSemesterPhase } from "../../src/server/actions/save-semester-phase";

afterEach(async () => {
  await db.semesterPhaseConfig.deleteMany();
});

describe("saveSemesterPhase", () => {
  it("validates and persists semester phase config", async () => {
    const result = await saveSemesterPhase({
      phase_template: [
        {
          start_week: 1,
          end_week: 2,
          phase: "exploration"
        }
      ]
    });

    expect(result.semester_phase_config.phase_template).toHaveLength(1);
    expect(await db.semesterPhaseConfig.count()).toBe(1);
  });

  it("rejects invalid semester phase config before persistence", async () => {
    await expect(
      saveSemesterPhase({
        phase_template: []
      })
    ).rejects.toThrow();

    expect(await db.semesterPhaseConfig.count()).toBe(0);
  });
});
