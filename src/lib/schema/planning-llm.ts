import { z } from "zod";

const agentRoleSchema = z.enum([
  "academic_guardian",
  "time_maximizer",
  "execution_realist"
]);

const decisionConfidenceSchema = z.enum(["low", "medium", "high"]);

export const debateReviewSchema = z.object({
  agent_role: agentRoleSchema,
  preferred_candidate_ids: z.array(z.string().min(1)),
  strongest_objections: z.array(z.string().min(1)),
  strongest_supports: z.array(z.string().min(1)),
  warning_flags: z.array(z.string().min(1)),
  missing_info_notes: z.array(z.string().min(1)).optional()
});

export const judgeSelectionResultSchema = z.object({
  selected_candidate_id: z.string().min(1),
  rationale: z.string().min(1),
  confidence: decisionConfidenceSchema,
  fallback_candidate_id: z.string().min(1).optional(),
  user_facing_summary: z.string().min(1).optional()
});

export type DebateReviewSchema = z.infer<typeof debateReviewSchema>;
export type JudgeSelectionResultSchema = z.infer<typeof judgeSelectionResultSchema>;
