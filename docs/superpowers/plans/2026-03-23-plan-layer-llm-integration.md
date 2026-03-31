# Plan-Layer LLM Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM support to the plan-generation layer without weakening deterministic guardrails, starting with debate and judge stages and preserving a deterministic fallback.

**Architecture:** Keep state, guardrails, action vocabulary, candidate-count limits, and output shape deterministic. Insert LLM behavior only after candidate generation has already produced a bounded feasible set, then use structured review/judge outputs validated with Zod before mapping to the existing plan output.

**Tech Stack:** Next.js, TypeScript, Zod, existing `OpenAiCompatibleLlmProvider`, existing decision/planner modules, Vitest.

---

## File map

### Existing files to modify

- `src/lib/decision/planner.ts`
  - Add a mode switch between deterministic debate/judge and LLM-backed debate/judge.
  - Preserve current orchestration order and candidate-set boundary checks.
- `src/lib/agents/judge.ts`
  - Either remain as deterministic fallback or be slightly refactored to share return-shape helpers.
- `src/lib/agents/academic-guardian.ts`
  - Keep as deterministic fallback implementation.
- `src/lib/agents/time-maximizer.ts`
  - Keep as deterministic fallback implementation.
- `src/lib/agents/execution-realist.ts`
  - Keep as deterministic fallback implementation.
- `src/lib/candidates/candidate-planner.ts`
  - No phase-1 behavior change. Only reference in tests and plan comments.
- `src/lib/types/decision.ts`
  - Extend only if strictly necessary for planning metadata; avoid breaking existing output contracts.
- `tests/agents/debate-agents.test.ts`
  - Add LLM-backed debate tests while preserving deterministic-agent coverage.
- `tests/agents/judge.test.ts`
  - Add LLM-backed judge tests plus fallback-path coverage.
- `tests/decision/planner.test.ts`
  - Add orchestration tests for LLM mode, validation failures, and deterministic fallback.

### New files to create

- `src/lib/schema/planning-llm.ts`
  - Zod schemas for LLM debate review and judge selection outputs.
- `src/lib/agents/llm-academic-guardian.ts`
  - Structured-output wrapper for the academic debate role.
- `src/lib/agents/llm-time-maximizer.ts`
  - Structured-output wrapper for the time-value debate role.
- `src/lib/agents/llm-execution-realist.ts`
  - Structured-output wrapper for the execution-friction debate role.
- `src/lib/agents/llm-judge.ts`
  - Structured-output wrapper for final candidate selection.
- `tests/agents/llm-planning.test.ts`
  - Provider-mocked tests for prompt-to-schema behavior, validation, and fallback handling.

### Optional later-phase files

- `src/lib/agents/llm-explanations.ts`
  - Only if phase 2 moves execution-note or rationale generation into separate helpers.
- `src/lib/candidates/llm-candidate-planner.ts`
  - Only for phase 3 after debate/judge integration is stable.

---

## Constraints to preserve

- Do **not** let the LLM change hard blockers, must-attend enforcement, planning window construction, action vocabulary, or output schema.
- Do **not** let the judge invent a candidate outside the debated candidate set.
- Do **not** remove deterministic implementations; keep them as runtime fallback and test baseline.
- Do **not** depend on provider-native JSON mode being available. The current provider target may be Alibaba Cloud DeepSeek through an OpenAI-compatible endpoint, so schema validation must happen in-app.
- Do **not** start with LLM candidate generation. First ship bounded debate/judge integration on top of deterministic candidate generation.

---

## Phase 1: Add schema-validated LLM debate and judge wrappers

### Task 1: Define planning-layer LLM schemas

**Files:**
- Create: `src/lib/schema/planning-llm.ts`
- Reference: `src/lib/types/decision.ts`
- Test: `tests/agents/llm-planning.test.ts`

- [ ] **Step 1: Write failing schema tests**

Cover at least:

- valid academic/time/execution debate review payload parses
- invalid `agent_role` fails
- judge output without `selected_candidate_id` fails
- judge output with invalid `confidence` fails
- optional fallback/user-facing fields remain optional

- [ ] **Step 2: Run the schema-focused test file to verify failure**

Run: `npx vitest tests/agents/llm-planning.test.ts`
Expected: failing tests before schema implementation

- [ ] **Step 3: Implement Zod schemas**

Requirements:

- export one schema matching `DebateReview`
- export one schema matching `JudgeSelectionResult`
- keep shapes aligned with existing `src/lib/types/decision.ts`
- avoid widening fields that would weaken downstream assumptions

- [ ] **Step 4: Re-run the schema tests**

Run: `npx vitest tests/agents/llm-planning.test.ts`
Expected: pass

### Task 2: Implement one shared prompt-building strategy for debate/judge

**Files:**
- Create: `src/lib/agents/llm-academic-guardian.ts`
- Create: `src/lib/agents/llm-time-maximizer.ts`
- Create: `src/lib/agents/llm-execution-realist.ts`
- Create: `src/lib/agents/llm-judge.ts`
- Reference: `src/lib/llm/provider.ts`
- Reference: `src/lib/debate/protocol.ts`
- Reference: `src/lib/schema/planning-llm.ts`
- Test: `tests/agents/llm-planning.test.ts`

- [ ] **Step 1: Write failing provider-mocked tests for each LLM wrapper**

Cover at least:

- each debate wrapper calls `getLlmProvider().generateObject(...)`
- each debate wrapper returns parsed `DebateReview`
- judge wrapper returns parsed `JudgeSelectionResult`
- prompts include candidate ids and role-specific evaluation instructions
- wrappers reject schema-invalid provider responses

- [ ] **Step 2: Run the wrapper tests to verify failure**

Run: `npx vitest tests/agents/llm-planning.test.ts`
Expected: failing tests before implementation

- [ ] **Step 3: Implement debate-role wrappers**

Implementation requirements:

- use existing provider interface from `src/lib/llm/provider.ts`
- mirror the extraction pattern in `src/lib/extraction/timetable-llm.ts`
- pass `schemaName`, `schemaDescription`, `responseSchema`, `systemPrompt`, and `userPrompt`
- build prompts from structured debate input rather than raw free text alone
- explicitly instruct each role not to invent new candidates or actions

- [ ] **Step 4: Implement judge wrapper**

Implementation requirements:

- judge reads the same bounded candidate set plus the debate reviews
- prompt must state that `selected_candidate_id` must be one of the provided candidate ids
- prompt must request short rationale and short user-facing summary only
- parse result with the shared judge schema

- [ ] **Step 5: Re-run the wrapper tests**

Run: `npx vitest tests/agents/llm-planning.test.ts`
Expected: pass

---

## Phase 2: Thread LLM mode into planner orchestration with deterministic fallback

### Task 3: Add runtime mode selection to planner orchestration

**Files:**
- Modify: `src/lib/decision/planner.ts`
- Reference: `src/lib/agents/academic-guardian.ts`
- Reference: `src/lib/agents/time-maximizer.ts`
- Reference: `src/lib/agents/execution-realist.ts`
- Reference: `src/lib/agents/judge.ts`
- Reference: `src/lib/agents/llm-academic-guardian.ts`
- Reference: `src/lib/agents/llm-time-maximizer.ts`
- Reference: `src/lib/agents/llm-execution-realist.ts`
- Reference: `src/lib/agents/llm-judge.ts`
- Test: `tests/decision/planner.test.ts`

- [ ] **Step 1: Write failing planner tests for LLM mode**

Cover at least:

- planner uses deterministic path by default
- planner can use LLM debate + judge path when explicitly enabled
- candidate filtering for `target_free_time_mode` still happens before LLM debate
- judge-selected candidate must still exist in the debated candidate set
- if LLM review/judge fails validation or throws, planner falls back to deterministic debate/judge

- [ ] **Step 2: Run planner tests to verify failure**

Run: `npx vitest tests/decision/planner.test.ts`
Expected: failing tests before orchestration changes

- [ ] **Step 3: Introduce a narrow config switch**

Preferred shape:

- planner input or internal config flag for `planning_llm_mode`
- values kept intentionally small, for example: `"disabled" | "debate_and_judge"`
- default remains deterministic

Avoid:

- broad environment-only branching spread across unrelated files
- changing the `generatePlan()` public API unless needed

- [ ] **Step 4: Implement deterministic fallback path**

Requirements:

- if any LLM debate wrapper fails, either fall back role-by-role or fall back the whole debate stage consistently
- if judge wrapper fails, use existing deterministic judge
- preserve current error semantics for truly invalid planner states, such as selecting a candidate outside the debated set

- [ ] **Step 5: Re-run planner tests**

Run: `npx vitest tests/decision/planner.test.ts`
Expected: pass

### Task 4: Add agent-level tests for both modes

**Files:**
- Modify: `tests/agents/debate-agents.test.ts`
- Modify: `tests/agents/judge.test.ts`
- Reference: `tests/agents/llm-planning.test.ts`

- [ ] **Step 1: Extend debate-agent tests**

Add assertions that:

- deterministic agents still produce the original role-shaped output
- LLM wrappers produce the same shape from mocked provider responses
- LLM prompts stay bounded to candidate-set evaluation

- [ ] **Step 2: Extend judge tests**

Add assertions that:

- deterministic judge still ranks and selects as before
- LLM judge only selects from provided candidates
- fallback candidate remains optional but valid when present

- [ ] **Step 3: Run targeted agent tests**

Run: `npx vitest tests/agents/debate-agents.test.ts tests/agents/judge.test.ts tests/agents/llm-planning.test.ts`
Expected: pass

---

## Phase 3: Improve user-facing explanations without changing decision boundaries

### Task 5: Move short rationale and summary generation into the LLM judge path

**Files:**
- Modify: `src/lib/agents/llm-judge.ts`
- Possibly modify: `src/lib/agents/judge.ts`
- Test: `tests/agents/judge.test.ts`
- Test: `tests/output/plan-output.test.ts`

- [ ] **Step 1: Write failing tests for concise explanation fields**

Cover at least:

- judge returns short rationale
- judge returns short user-facing summary
- output remains short enough for existing `/plan` page sections
- fallback deterministic rationale still works when LLM path is unavailable

- [ ] **Step 2: Run the targeted tests to verify failure**

Run: `npx vitest tests/agents/judge.test.ts tests/output/plan-output.test.ts`
Expected: failing tests before explanation changes

- [ ] **Step 3: Implement bounded explanation generation**

Requirements:

- keep rationale compact and structured
- do not let explanation fields change final selected action set
- do not introduce long-form reports into the existing UI

- [ ] **Step 4: Re-run the targeted tests**

Run: `npx vitest tests/agents/judge.test.ts tests/output/plan-output.test.ts`
Expected: pass

---

## Phase 4: Evaluate whether to add LLM candidate generation

This phase is intentionally deferred. Do not start it until phases 1-3 are stable in runtime, provider reliability is acceptable, and the deterministic fallback path is verified.

### Task 6: Design, but do not immediately ship, bounded LLM candidate generation

**Files:**
- Future create: `src/lib/candidates/llm-candidate-planner.ts`
- Future modify: `src/lib/candidates/candidate-planner.ts`
- Future modify: `src/lib/decision/planner.ts`
- Future test: `tests/candidates/candidate-planner.test.ts`

- [ ] **Step 1: Write candidate-boundary tests before any implementation**

Cover at least:

- generated candidate count stays between 3 and 5
- every candidate uses only allowed actions
- every candidate still passes deterministic blocker validation
- invalid LLM candidate output is rejected and replaced by deterministic candidates

- [ ] **Step 2: Only after those tests exist, prototype a bounded generator**

Requirements:

- LLM receives the feasible action space, not raw unconstrained freedom
- deterministic validator checks every candidate item after generation
- planner never accepts a candidate that violates existing constraints

- [ ] **Step 3: Keep this behind a stricter experimental flag**

Recommended mode split:

- `disabled`
- `debate_and_judge`
- `full_candidate_experiment`

---

## Prompt design requirements

All planning-layer LLM prompts must include:

- explicit candidate ids
- explicit action vocabulary (`skip`, `substitute_attendance`, `arrive_then_leave_early`, `attend_full`)
- explicit instruction that no new candidate ids may be invented
- explicit instruction that hard blockers and candidate feasibility were already enforced upstream
- explicit instruction to keep outputs short, structured, and JSON-only

Debate-role prompts must additionally include:

- the role perspective
- strongest concerns for that role
- permission to flag missing information that lowers confidence

Judge prompts must additionally include:

- a requirement that `selected_candidate_id` be chosen from the provided list only
- a request for concise rationale and concise user-facing summary
- a reminder not to generate a new plan

---

## Provider and runtime strategy

- Reuse `getLlmProvider()` from `src/lib/llm/provider.ts`.
- Follow the extraction-layer pattern where `generateObject()` returns untrusted data and Zod parses it locally.
- Assume provider-native JSON mode may be unreliable or unavailable for the current Alibaba Cloud DeepSeek target.
- Treat schema parse failure as a normal, expected recoverable path.
- Keep network/runtime instability isolated from the planner by falling back to deterministic reviews and judge selection.

---

## Verification checklist

Run these after each completed chunk:

- `npx vitest tests/agents/llm-planning.test.ts`
- `npx vitest tests/agents/debate-agents.test.ts tests/agents/judge.test.ts`
- `npx vitest tests/decision/planner.test.ts`
- `npx vitest tests/output/plan-output.test.ts`
- `pnpm test`
- `pnpm typecheck`

If a real-provider smoke check is added later, verify at minimum:

- invalid provider response falls back cleanly
- valid structured response reaches `/plan` without changing output shape
- no candidate outside the deterministic shortlist can be selected

---

## Recommended commit sequence

1. `test: add planning LLM schemas and wrapper tests`
2. `feat: add LLM debate and judge wrappers`
3. `feat: wire planner to optional LLM debate and judge`
4. `test: cover deterministic fallback for planning LLM failures`
5. `feat: refine judge explanations with bounded LLM summaries`

---

## Execution notes for the next implementation session

- Start with phase 1 only.
- Do not combine phase 1 and phase 4 in one pass.
- Do not remove or rewrite deterministic candidate planning during the first implementation pass.
- If provider behavior proves unstable during implementation, stop at deterministic fallback + mocked tests rather than forcing real-provider runtime integration.
