import type { DebateInput } from "@/lib/debate/protocol";
import type { DebateReview, JudgeSelectionResult } from "@/lib/types/decision";

import { getLlmProvider } from "@/lib/llm/provider";
import { withTraceObservation } from "@/lib/observability/langfuse";
import { judgeSelectionResultSchema } from "@/lib/schema/planning-llm";

const SYSTEM_PROMPT = `You are the final judge for plan selection.
Select one candidate from the provided ids only.
Return only strict JSON that matches the schema.
Do not invent new candidate ids or actions.`;

type LlmJudgeInput = {
  debate_input: DebateInput;
  reviews: DebateReview[];
};

function buildUserPrompt(input: LlmJudgeInput): string {
  const candidateIds = input.debate_input.candidates.map(
    (candidate) => candidate.candidate_id
  );

  return `Choose the best candidate from the debated set.
Candidate ids: ${candidateIds.join(", ")}
selected_candidate_id must be one of the candidate ids above.
Allowed actions: skip, substitute_attendance, arrive_then_leave_early, attend_full.
Do not invent new candidates or actions.
Keep the rationale and user_facing_summary concise.

Planning mode: ${input.debate_input.planning_mode}
Semester phase: ${input.debate_input.semester_phase}
Short-term modifiers: ${JSON.stringify(input.debate_input.short_term_modifiers ?? null)}

Contexts:
${JSON.stringify(input.debate_input.contexts, null, 2)}

Candidates:
${JSON.stringify(input.debate_input.candidates, null, 2)}

Debate reviews:
${JSON.stringify(input.reviews, null, 2)}`;
}

export async function selectCandidateWithLlmJudge(
  input: LlmJudgeInput
): Promise<JudgeSelectionResult> {
  return withTraceObservation(
    "planner.judge.llm",
    {
      initialUpdate: {
        input: {
          candidate_count: input.debate_input.candidates.length,
          review_count: input.reviews.length,
          planning_mode: input.debate_input.planning_mode
        }
      }
    },
    async (trace) => {
      const provider = getLlmProvider();
      const rawResult = await provider.generateObject({
        schemaName: "JudgeSelectionResult",
        schemaDescription: "Return the judge selection for the best candidate.",
        responseSchema: judgeSelectionResultSchema,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(input)
      });

      const parsed = judgeSelectionResultSchema.parse(rawResult);
      trace.update({ output: parsed });
      return parsed;
    }
  );
}
