import type { TimetableCourseInput } from "@/lib/types/input";

import { db } from "@/lib/db";
import { timetableCourseSchema } from "@/lib/schema/input";

export async function replaceImportedTimetableCourses(
  courses: TimetableCourseInput[]
): Promise<TimetableCourseInput[]> {
  await db.$transaction(async (tx) => {
    await tx.timetableCourse.deleteMany();

    for (const course of courses) {
      await tx.timetableCourse.create({
        data: {
          courseName: course.course_name,
          timeSlots: course.time_slots,
          location: course.location,
          teacherName: course.teacher_name,
          weekRange: course.week_range,
          courseTypeOrCredit: course.course_type_or_credit
        }
      });
    }
  });

  return listImportedTimetableCourses();
}

export async function listImportedTimetableCourses(): Promise<TimetableCourseInput[]> {
  const rows = await db.timetableCourse.findMany({
    orderBy: {
      createdAt: "asc"
    }
  });

  return rows.map((row) =>
    timetableCourseSchema.parse({
      course_name: row.courseName,
      time_slots: row.timeSlots,
      location: row.location ?? undefined,
      teacher_name: row.teacherName ?? undefined,
      week_range: row.weekRange ?? undefined,
      course_type_or_credit: row.courseTypeOrCredit ?? undefined
    })
  );
}
