import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { saveCourseDetails } from "../../src/server/actions/save-course-details";

afterEach(async () => {
  await db.courseDetail.deleteMany();
});

describe("saveCourseDetails", () => {
  it("validates and persists course details", async () => {
    const result = await saveCourseDetails([
      {
        course_name_ref: "Intro Math",
        course_class: "core",
        course_target_level: "pass_only",
        personal_fail_risk: "possible_to_fail",
        attendance_modes: ["full_roll_call_every_session"]
      }
    ]);

    expect(result.course_details).toHaveLength(1);
    expect(await db.courseDetail.count()).toBe(1);
  });

  it("rejects invalid course detail payloads before persistence", async () => {
    await expect(
      saveCourseDetails([
        {
          course_name_ref: "Intro Math",
          course_target_level: "pass_only",
          personal_fail_risk: "possible_to_fail",
          attendance_modes: ["full_roll_call_every_session"]
        }
      ])
    ).rejects.toThrow();

    expect(await db.courseDetail.count()).toBe(0);
  });
});
