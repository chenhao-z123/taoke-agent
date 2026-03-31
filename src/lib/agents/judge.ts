import type { DebateInput } from "@/lib/debate/protocol";
import type { DebateReview, JudgeSelectionResult } from "@/lib/types/decision";

function scoreCandidate(candidateId: string, reviews: DebateReview[]): number {
  return reviews.reduce((score, review) => {
    const index = review.preferred_candidate_ids.indexOf(candidateId);

    if (index === -1) {
      return score;
    }

    return score + (review.preferred_candidate_ids.length - index);
  }, 0);
}

export function selectCandidateWithJudge(input: {
  debate_input: DebateInput;
  reviews: DebateReview[];
}): JudgeSelectionResult {
  const rankedCandidates = [...input.debate_input.candidates]
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate.candidate_id, input.reviews)
    }))
    .sort((left, right) => right.score - left.score);

  const winner = rankedCandidates[0]?.candidate;
  const fallback = rankedCandidates[1]?.candidate;

  if (!winner) {
    throw new Error("Judge requires at least one candidate");
  }

  return {
    selected_candidate_id: winner.candidate_id,
    rationale: `Selected ${winner.candidate_id} because it keeps objections manageable across the debate roles.`,
    confidence:
      (rankedCandidates[0]?.score ?? 0) - (rankedCandidates[1]?.score ?? 0) >= 2
        ? "high"
        : "medium",
    fallback_candidate_id: fallback?.candidate_id,
    user_facing_summary:
      `${winner.candidate_id} best balances debate feedback without leaving major objections unresolved.`
  };
}
