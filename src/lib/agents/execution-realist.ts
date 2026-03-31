import { estimatePressures } from "@/lib/decision/pressures";
import type { DebateInput } from "@/lib/debate/protocol";
import type { CandidatePlan, DebateReview } from "@/lib/types/decision";

function scoreExecutionFriction(input: DebateInput, candidate: CandidatePlan): number {
  return input.contexts.reduce((score, context) => {
    const item = candidate.items.find((entry) => entry.course_id === context.course.course_name);
    const action = item?.action ?? "attend_full";
    const pressures = estimatePressures(context);
    let nextScore = score;

    if (action === "skip") {
      nextScore += 3;
    } else if (action === "substitute_attendance") {
      nextScore += 2;
    } else if (action === "arrive_then_leave_early") {
      nextScore += 1;
    }

    if (pressures.execution_cost === "high") {
      nextScore += 2;
    }

    return nextScore;
  }, 0);
}

export function reviewCandidatesAsExecutionRealist(
  input: DebateInput
): DebateReview {
  const ranked = [...input.candidates].sort(
    (left, right) => scoreExecutionFriction(input, left) - scoreExecutionFriction(input, right)
  );

  return {
    agent_role: "execution_realist",
    preferred_candidate_ids: ranked.map((candidate) => candidate.candidate_id),
    strongest_objections: ["time_priority is too brittle to execute consistently."],
    strongest_supports: [
      `${ranked[0]?.candidate_id ?? "execution_friendly"} keeps friction manageable.`
    ],
    warning_flags: ["High-friction courses punish overly aggressive plans."],
    missing_info_notes: undefined
  };
}
