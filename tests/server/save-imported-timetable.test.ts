import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { saveImportedTimetable } from "../../src/server/actions/save-imported-timetable";

afterEach(async () => {
  await db.timetableCourse.deleteMany();
});

describe("saveImportedTimetable", () => {
  it("validates and persists a timetable import payload", async () => {
    const result = await saveImportedTimetable({
      courses: [
        {
          course_name: "Linear Algebra",
          time_slots: [
            {
              day_of_week: 3,
              time: "第七.八节"
            }
          ],
          location: "Room 204",
          teacher_name: "Dr. Wang",
          week_range: {
            start_week: 5,
            end_week: 12
          },
          course_type_or_credit: "elective"
        }
      ]
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]?.course_name).toBe("Linear Algebra");
  });

  it("rejects invalid timetable payloads before persistence", async () => {
    await expect(
      saveImportedTimetable({
        courses: [
          {
            course_name: "Broken Course",
            time_slots: []
          }
        ]
      })
    ).rejects.toThrow();

    expect(await db.timetableCourse.count()).toBe(0);
  });
});
