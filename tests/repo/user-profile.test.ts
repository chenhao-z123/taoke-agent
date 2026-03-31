import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { getUserProfile, replaceUserProfile } from "../../src/lib/repo/user-profile";
import type { UserProfileInput } from "../../src/lib/types/input";

const sampleProfile: UserProfileInput = {
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
};

afterEach(async () => {
  await db.userProfile.deleteMany();
});

describe("user profile repository", () => {
  it("persists and reads back a user profile snapshot", async () => {
    await replaceUserProfile(sampleProfile);

    const savedProfile = await getUserProfile();

    expect(savedProfile).toEqual(sampleProfile);
  });

  it("replaces a previously saved user profile", async () => {
    await replaceUserProfile(sampleProfile);
    await replaceUserProfile({
      ...sampleProfile,
      planning_mode: "target_free_time_mode",
      free_time_target: { type: "hours", value: 6 }
    });

    const savedProfile = await getUserProfile();

    expect(savedProfile?.planning_mode).toBe("target_free_time_mode");
    expect(savedProfile?.free_time_target).toEqual({ type: "hours", value: 6 });
  });
});
