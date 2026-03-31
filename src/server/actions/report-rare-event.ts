"use server";

import { appendRareEventFeedback } from "@/lib/repo/course-details";
import { reportRareEventSchema } from "@/lib/schema/input";

export async function reportRareEvent(input: unknown) {
  const parsedInput = reportRareEventSchema.parse(input);
  const course_detail = await appendRareEventFeedback(
    parsedInput.course_name_ref,
    parsedInput.feedback
  );

  return { course_detail };
}
