"use server";

import { extractTimetableFromLlm } from "@/lib/extraction/timetable-llm";
import { flushLangfuseTracing } from "@/lib/observability/langfuse";
import { extractImportedTimetableRequestSchema } from "@/lib/schema/extraction";

export async function extractImportedTimetable(input: unknown) {
  const parsedInput = extractImportedTimetableRequestSchema.parse(input);

  try {
    return await extractTimetableFromLlm(parsedInput);
  } finally {
    await flushLangfuseTracing();
  }
}
