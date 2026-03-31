import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { listImportedTimetableCourses, replaceImportedTimetableCourses } from "../../src/lib/repo/timetable";
import type { TimetableCourseInput } from "../../src/lib/types/input";

const sampleCourses: TimetableCourseInput[] = [
  {
    course_name: "Intro Math",
    time_slots: [
      {
        day_of_week: 1,
        time: "第一.二节"
      }
    ],
    location: "Room 101",
    teacher_name: "Dr. Liu",
    week_range: {
      start_week: 1,
      end_week: 16
    },
    course_type_or_credit: "core-3"
  },
  {
    course_name: "Data Structures",
    time_slots: [
      {
        day_of_week: 2,
        time: "第五.六节"
      }
    ],
    location: "Lab 3",
    teacher_name: "Prof. Chen",
    week_range: {
      start_week: 2,
      end_week: 14
    },
    course_type_or_credit: "major-required"
  }
] as const;

afterEach(async () => {
  await db.timetableCourse.deleteMany();
});

describe("replaceImportedTimetableCourses", () => {
  it("persists imported timetable rows and reads them back", async () => {
    await replaceImportedTimetableCourses(sampleCourses);

    const savedCourses = await listImportedTimetableCourses();

    expect(savedCourses).toHaveLength(2);
    expect(savedCourses.map((course) => course.course_name)).toEqual([
      "Intro Math",
      "Data Structures"
    ]);
    expect(savedCourses[0]?.time_slots).toEqual(sampleCourses[0].time_slots);
    expect(savedCourses[0]?.week_range).toEqual(sampleCourses[0].week_range);
  });

  it("replaces previously saved timetable rows with a new snapshot", async () => {
    await replaceImportedTimetableCourses(sampleCourses);
    await replaceImportedTimetableCourses([
      {
        course_name: "Operating Systems",
        time_slots: [
          {
            day_of_week: 4,
            time: "第一.二节"
          }
        ],
        location: "Room 205",
        teacher_name: "Dr. Xu",
        week_range: {
          start_week: 3,
          end_week: 15
        },
        course_type_or_credit: "elective"
      }
    ]);

    const savedCourses = await listImportedTimetableCourses();

    expect(savedCourses).toHaveLength(1);
    expect(savedCourses[0]?.course_name).toBe("Operating Systems");
  });
});
