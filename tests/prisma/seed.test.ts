import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { seedDatabase } from "../../prisma/seed";

afterEach(async () => {
  await db.generatedPlanItem.deleteMany();
  await db.generatedPlan.deleteMany();
  await db.shortTermModifier.deleteMany();
  await db.courseDetail.deleteMany();
  await db.semesterPhaseConfig.deleteMany();
  await db.userProfile.deleteMany();
  await db.timetableCourse.deleteMany();
});

describe("seedDatabase", () => {
  it("populates one minimal smoke-path dataset including a generated plan", async () => {
    await seedDatabase();

    expect(await db.timetableCourse.count()).toBeGreaterThan(0);
    expect(await db.userProfile.count()).toBe(1);
    expect(await db.semesterPhaseConfig.count()).toBe(1);
    expect(await db.courseDetail.count()).toBeGreaterThan(0);
    expect(await db.generatedPlan.count()).toBe(1);
    expect(await db.generatedPlanItem.count()).toBeGreaterThan(0);
  }, 15000);
});
