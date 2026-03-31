import type { DebateInput } from "@/lib/debate/protocol";

export function buildDebateUserPrompt(input: DebateInput, roleInstruction: string): string {
  const candidateIds = input.candidates.map((candidate) => candidate.candidate_id);

  return `${roleInstruction}
Candidate ids: ${candidateIds.join(", ")}
Allowed actions: skip, substitute_attendance, arrive_then_leave_early, attend_full.
Use only the provided candidate ids and actions. Do not invent new candidates or actions.

Planning mode: ${input.planning_mode}
Semester phase: ${input.semester_phase}
Short-term modifiers: ${JSON.stringify(input.short_term_modifiers ?? null)}

Contexts:
${JSON.stringify(input.contexts, null, 2)}

Candidates:
${JSON.stringify(input.candidates, null, 2)}`;
}
