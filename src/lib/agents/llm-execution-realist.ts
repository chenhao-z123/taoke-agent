import type { DebateInput } from "@/lib/debate/protocol";
import type { DebateReview } from "@/lib/types/decision";

import { getLlmProvider } from "@/lib/llm/provider";
import { withTraceObservation } from "@/lib/observability/langfuse";
import { debateReviewSchema } from "@/lib/schema/planning-llm";
import { buildDebateUserPrompt } from "@/lib/agents/llm-debate-prompts";

const SYSTEM_PROMPT = `You are the Execution Realist for plan debate.
Focus on implementation friction, logistics, and realistic follow-through.
Return only strict JSON that matches the schema.
Do not invent new candidate ids or actions.`;

export async function reviewCandidatesAsExecutionRealistWithLlm(
  input: DebateInput
): Promise<DebateReview> {
  return withTraceObservation(
    "planner.agent.execution_realist",
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
        schemaDescription: "Return a debate review for the execution realist role.",
        responseSchema: debateReviewSchema,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildDebateUserPrompt(
          input,
          "Evaluate the candidates from an execution-friction perspective."
        )
      });

      const parsed = debateReviewSchema.parse(rawResult);
      trace.update({ output: parsed });
      return parsed;
    }
  );
}
