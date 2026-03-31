"use server";

import { extractCourseDetailDraftFromLlm } from "@/lib/extraction/course-detail-llm";
import { flushLangfuseTracing } from "@/lib/observability/langfuse";
import { extractCourseDetailDraftRequestSchema } from "@/lib/schema/extraction";

export async function extractCourseDetailDraft(input: unknown) {
  const parsedInput = extractCourseDetailDraftRequestSchema.parse(input);

  try {
    return await extractCourseDetailDraftFromLlm(parsedInput);
  } finally {
    await flushLangfuseTracing();
  }
}
