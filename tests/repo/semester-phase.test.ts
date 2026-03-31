import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import {
  getSemesterPhaseConfig,
  replaceSemesterPhaseConfig
} from "../../src/lib/repo/semester-phase";
import type { SemesterPhaseConfigInput } from "../../src/lib/types/input";

const samplePhaseConfig: SemesterPhaseConfigInput = {
  phase_template: [
    {
      start_week: 1,
      end_week: 4,
      phase: "exploration"
    }
  ]
};

afterEach(async () => {
  await db.semesterPhaseConfig.deleteMany();
});

describe("semester phase repository", () => {
  it("persists and reads back the semester phase config", async () => {
    await replaceSemesterPhaseConfig(samplePhaseConfig);

    const savedConfig = await getSemesterPhaseConfig();

    expect(savedConfig).toEqual(samplePhaseConfig);
  });

  it("replaces the saved semester phase config", async () => {
    await replaceSemesterPhaseConfig(samplePhaseConfig);
    await replaceSemesterPhaseConfig({
      phase_template: [
        {
          start_week: 5,
          end_week: 8,
          phase: "midterm_tightening",
          note: "Midterm stretch"
        }
      ]
    });

    const savedConfig = await getSemesterPhaseConfig();

    expect(savedConfig?.phase_template[0]?.phase).toBe("midterm_tightening");
  });
});
