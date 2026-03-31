import { estimatePressures } from "@/lib/decision/pressures";
import type { DebateInput } from "@/lib/debate/protocol";
import type { CandidatePlan, DebateReview } from "@/lib/types/decision";

function scoreAcademicRisk(input: DebateInput, candidate: CandidatePlan): number {
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

    if (pressures.academic === "high") {
      nextScore += 2;
    }

    if ((context.course_details.key_session_types?.length ?? 0) > 0) {
      nextScore += 2;
    }

    if (context.semester_phase === "final_tightening") {
      nextScore += 1;
    }

    return nextScore;
  }, 0);
}

export function reviewCandidatesAsAcademicGuardian(
  input: DebateInput
): DebateReview {
  const ranked = [...input.candidates].sort(
    (left, right) => scoreAcademicRisk(input, left) - scoreAcademicRisk(input, right)
  );
  const lowConfidenceContexts = input.contexts.filter(
    (context) =>
      context.course_details.field_confidence === "low" ||
      context.course_details.absence_rule_confidence === "low"
  );

  return {
    agent_role: "academic_guardian",
    preferred_candidate_ids: ranked.map((candidate) => candidate.candidate_id),
    strongest_objections: [
      "time_priority creates too much academic downside in sensitive sessions."
    ],
    strongest_supports: [
      `${ranked[0]?.candidate_id ?? "execution_friendly"} best preserves academic safety.`
    ],
    warning_flags:
      input.semester_phase === "final_tightening"
        ? ["Final-phase sessions tighten the academic safety margin."]
        : [],
    missing_info_notes:
      lowConfidenceContexts.length > 0
        ? ["Low confidence in attendance rules lowers academic confidence."]
        : undefined
  };
}
