"use server";

import { timetableImportSchema } from "@/lib/schema/input";
import { replaceImportedTimetableCourses } from "@/lib/repo/timetable";

export async function saveImportedTimetable(input: unknown) {
  const parsedInput = timetableImportSchema.parse(input);
  const courses = await replaceImportedTimetableCourses(parsedInput.courses);

  return { courses };
}
