import type { DebateInput } from "@/lib/debate/protocol";
import type { DebateReview } from "@/lib/types/decision";

import { getLlmProvider } from "@/lib/llm/provider";
import { withTraceObservation } from "@/lib/observability/langfuse";
import { debateReviewSchema } from "@/lib/schema/planning-llm";
import { buildDebateUserPrompt } from "@/lib/agents/llm-debate-prompts";

const SYSTEM_PROMPT = `You are the Time Maximizer for plan debate.
Focus on free-time value, efficiency, and protecting long study blocks.
Return only strict JSON that matches the schema.
Do not invent new candidate ids or actions.`;

export async function reviewCandidatesAsTimeMaximizerWithLlm(
  input: DebateInput
): Promise<DebateReview> {
  return withTraceObservation(
    "planner.agent.time_maximizer",
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
        schemaDescription: "Return a debate review for the time maximizer role.",
        responseSchema: debateReviewSchema,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildDebateUserPrompt(
          input,
          "Evaluate the candidates from a time-maximization perspective."
        )
      });

      const parsed = debateReviewSchema.parse(rawResult);
      trace.update({ output: parsed });
      return parsed;
    }
  );
}
