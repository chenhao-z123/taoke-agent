import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { saveProfile } from "../../src/server/actions/save-profile";

afterEach(async () => {
  await db.userProfile.deleteMany();
});

describe("saveProfile", () => {
  it("validates and persists a user profile", async () => {
    const result = await saveProfile({
      planning_mode: "safe_max_mode",
      strategy_tier: "balanced",
      risk_tier: "medium",
      execution_pressure: "medium",
      score_buffer_preference: "some",
      prefer_large_blocks: true,
      prefer_skip_early_classes: false,
      prefer_skip_late_classes: false,
      substitute_attendance_enabled: true,
      sign_in_then_leave_willingness: true,
      retroactive_remedy_enabled: false
    });

    expect(result.profile.planning_mode).toBe("safe_max_mode");
    expect(await db.userProfile.count()).toBe(1);
  });

  it("rejects invalid profile payloads before persistence", async () => {
    await expect(
      saveProfile({
        strategy_tier: "balanced",
        risk_tier: "medium"
      })
    ).rejects.toThrow();

    expect(await db.userProfile.count()).toBe(0);
  });
});
