"use server";

import { replaceCourseDetails } from "@/lib/repo/course-details";
import { courseDetailsSchema } from "@/lib/schema/input";

export async function saveCourseDetails(input: unknown) {
  const parsedInput = courseDetailsSchema.parse(input);
  const course_details = await replaceCourseDetails(parsedInput);

  return { course_details };
}
