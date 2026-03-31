import type { DebateInput } from "@/lib/debate/protocol";
import type { DebateReview } from "@/lib/types/decision";

import { getLlmProvider } from "@/lib/llm/provider";
import { withTraceObservation } from "@/lib/observability/langfuse";
import { debateReviewSchema } from "@/lib/schema/planning-llm";
import { buildDebateUserPrompt } from "@/lib/agents/llm-debate-prompts";

const SYSTEM_PROMPT = `You are the Academic Guardian for plan debate.
Focus on academic risk, syllabus coverage, and long-term grade safety.
Return only strict JSON that matches the schema.
Do not invent new candidate ids or actions.`;

export async function reviewCandidatesAsAcademicGuardianWithLlm(
  input: DebateInput
): Promise<DebateReview> {
  return withTraceObservation(
    "planner.agent.academic_guardian",
    {
      initialUpdate: {
        input: {
          candidate_count: input.candidates.length,
          planning_mode: input.planning_mode
        }
      }
    },
    async (trace) => {
      const provider = getLlmProvider();
      const rawResult = await provider.generateObject({
        schemaName: "DebateReview",
        schemaDescription: "Return a debate review for the academic guardian role.",
        responseSchema: debateReviewSchema,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildDebateUserPrompt(
          input,
          "Evaluate the candidates from an academic-risk perspective."
        )
      });

      const parsed = debateReviewSchema.parse(rawResult);
      trace.update({ output: parsed });
      return parsed;
    }
  );
}
