import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { getShortTermModifiers, replaceShortTermModifiers } from "../../src/lib/repo/short-term";
import type { ShortTermModifiersInput } from "../../src/lib/types/input";

const sampleModifiers: ShortTermModifiersInput = {
  weather_modifier: "rainy",
  temporary_goal_shift: "recover_sleep",
  upcoming_events: ["career fair"],
  body_state: "tired",
  time_value_adjustment_note: "Afternoons are unusually valuable this week"
};

afterEach(async () => {
  await db.shortTermModifier.deleteMany();
});

describe("short-term modifiers repository", () => {
  it("persists and reads back short-term modifiers", async () => {
    await replaceShortTermModifiers(sampleModifiers);

    const savedModifiers = await getShortTermModifiers();

    expect(savedModifiers).toEqual(sampleModifiers);
  });

  it("replaces previously saved short-term modifiers", async () => {
    await replaceShortTermModifiers(sampleModifiers);
    await replaceShortTermModifiers({
      weather_modifier: "snow",
      upcoming_events: ["interview"]
    });

    const savedModifiers = await getShortTermModifiers();

    expect(savedModifiers?.weather_modifier).toBe("snow");
    expect(savedModifiers?.upcoming_events).toEqual(["interview"]);
  });
});
