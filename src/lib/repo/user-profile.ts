import type { UserProfileInput } from "@/lib/types/input";

import { db } from "@/lib/db";
import { userProfileSchema } from "@/lib/schema/input";

export async function replaceUserProfile(
  profile: UserProfileInput
): Promise<UserProfileInput> {
  await db.$transaction(async (tx) => {
    await tx.userProfile.deleteMany();

    await tx.userProfile.create({
      data: {
        planningMode: profile.planning_mode,
        freeTimeTarget: profile.free_time_target ?? undefined,
        strategyTier: profile.strategy_tier,
        riskTier: profile.risk_tier,
        maxRecordedAbsencesOverride: profile.max_recorded_absences_override ?? undefined,
        caughtRiskToleranceNote: profile.caught_risk_tolerance_note ?? undefined,
        executionPressure: profile.execution_pressure,
        scoreBufferPreference: profile.score_buffer_preference,
        preferLargeBlocks: profile.prefer_large_blocks,
        preferSkipEarlyClasses: profile.prefer_skip_early_classes,
        preferSkipLateClasses: profile.prefer_skip_late_classes,
        preferredWeekdays: profile.preferred_weekdays ?? undefined,
        preferredTimeUseCases: profile.preferred_time_use_cases ?? undefined,
        substituteAttendanceEnabled: profile.substitute_attendance_enabled,
        substituteAttendanceDefaultCost: profile.substitute_attendance_default_cost ?? undefined,
        signInThenLeaveWillingness: profile.sign_in_then_leave_willingness,
        retroactiveRemedyEnabled: profile.retroactive_remedy_enabled
      }
    });
  });

  const savedProfile = await getUserProfile();

  if (!savedProfile) {
    throw new Error("Failed to persist user profile");
  }

  return savedProfile;
}

export async function getUserProfile(): Promise<UserProfileInput | null> {
  const row = await db.userProfile.findFirst({
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!row) {
    return null;
  }

  return userProfileSchema.parse({
    planning_mode: row.planningMode,
    free_time_target: row.freeTimeTarget ?? undefined,
    strategy_tier: row.strategyTier,
    risk_tier: row.riskTier,
    max_recorded_absences_override: row.maxRecordedAbsencesOverride ?? undefined,
    caught_risk_tolerance_note: row.caughtRiskToleranceNote ?? undefined,
    execution_pressure: row.executionPressure,
    score_buffer_preference: row.scoreBufferPreference,
    prefer_large_blocks: row.preferLargeBlocks,
    prefer_skip_early_classes: row.preferSkipEarlyClasses,
    prefer_skip_late_classes: row.preferSkipLateClasses,
    preferred_weekdays: row.preferredWeekdays ?? undefined,
    preferred_time_use_cases: row.preferredTimeUseCases ?? undefined,
    substitute_attendance_enabled: row.substituteAttendanceEnabled,
    substitute_attendance_default_cost: row.substituteAttendanceDefaultCost ?? undefined,
    sign_in_then_leave_willingness: row.signInThenLeaveWillingness,
    retroactive_remedy_enabled: row.retroactiveRemedyEnabled
  });
}
