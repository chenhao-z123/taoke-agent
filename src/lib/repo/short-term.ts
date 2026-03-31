import type { ShortTermModifiersInput } from "@/lib/types/input";

import { db } from "@/lib/db";
import { shortTermModifiersSchema } from "@/lib/schema/input";

export async function replaceShortTermModifiers(
  modifiers: ShortTermModifiersInput
): Promise<ShortTermModifiersInput> {
  await db.$transaction(async (tx) => {
    await tx.shortTermModifier.deleteMany();

    await tx.shortTermModifier.create({
      data: {
        weatherModifier: modifiers.weather_modifier ?? undefined,
        temporaryGoalShift: modifiers.temporary_goal_shift ?? undefined,
        upcomingEvents: modifiers.upcoming_events ?? undefined,
        bodyState: modifiers.body_state ?? undefined,
        timeValueAdjustmentNote: modifiers.time_value_adjustment_note ?? undefined
      }
    });
  });

  const savedModifiers = await getShortTermModifiers();

  if (!savedModifiers) {
    throw new Error("Failed to persist short-term modifiers");
  }

  return savedModifiers;
}

export async function getShortTermModifiers(): Promise<ShortTermModifiersInput | null> {
  const row = await db.shortTermModifier.findFirst({
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!row) {
    return null;
  }

  return shortTermModifiersSchema.parse({
    weather_modifier: row.weatherModifier ?? undefined,
    temporary_goal_shift: row.temporaryGoalShift ?? undefined,
    upcoming_events: row.upcomingEvents ?? undefined,
    body_state: row.bodyState ?? undefined,
    time_value_adjustment_note: row.timeValueAdjustmentNote ?? undefined
  });
}
