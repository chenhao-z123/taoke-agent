import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { saveShortTerm } from "../../src/server/actions/save-short-term";

afterEach(async () => {
  await db.shortTermModifier.deleteMany();
});

describe("saveShortTerm", () => {
  it("validates and persists short-term modifiers", async () => {
    const result = await saveShortTerm({
      weather_modifier: "rainy",
      upcoming_events: ["career fair"],
      time_value_adjustment_note: "Keep Friday open for interview prep"
    });

    expect(result.short_term_modifiers.weather_modifier).toBe("rainy");
    expect(result.short_term_modifiers.time_value_adjustment_note).toBe(
      "Keep Friday open for interview prep"
    );
    expect(await db.shortTermModifier.count()).toBe(1);
  });

  it("rejects invalid short-term payloads before persistence", async () => {
    await expect(
      saveShortTerm({
        weather_modifier: ""
      })
    ).rejects.toThrow();

    expect(await db.shortTermModifier.count()).toBe(0);
  });
});
