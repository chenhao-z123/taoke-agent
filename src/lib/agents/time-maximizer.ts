import { estimatePressures } from "@/lib/decision/pressures";
import type { DebateInput } from "@/lib/debate/protocol";
import type { CandidatePlan, DebateReview } from "@/lib/types/decision";

function scoreTimeValue(input: DebateInput, candidate: CandidatePlan): number {
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

    if (pressures.free_time_value === "high") {
      nextScore += 2;
    }

    return nextScore;
  }, 0);
}

export function reviewCandidatesAsTimeMaximizer(input: DebateInput): DebateReview {
  const ranked = [...input.candidates].sort(
    (left, right) => scoreTimeValue(input, right) - scoreTimeValue(input, left)
  );

  return {
    agent_role: "time_maximizer",
    preferred_candidate_ids: ranked.map((candidate) => candidate.candidate_id),
    strongest_objections: [
      "execution_friendly leaves too much recoverable free time unused."
    ],
    strongest_supports: [
      `${ranked[0]?.candidate_id ?? "time_priority"} extracts the most usable free time.`
    ],
    warning_flags: [],
    missing_info_notes: undefined
  };
}
