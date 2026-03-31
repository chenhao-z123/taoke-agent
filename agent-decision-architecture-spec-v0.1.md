# Campus Energy Optimizer - Agent Decision Architecture Spec v0.1

Status: revised design draft for the decision layer.
Scope: architecture of the LLM-driven planning system, not implementation details.

## 1. Document purpose

This document replaces the idea of a purely rule-driven final decider with a hybrid multi-agent architecture.

The goal is to keep the product agentic and resume-friendly while preserving enough structure to make the resulting plan coherent, controllable, and explainable.

This document should be read together with:

- `input-model-spec-v0.1.md`
- `action-plan-output-spec-v0.1.md`

It partially supersedes `decision-engine-spec-v0.1.md` at the architecture level.

## 2. Core design choice

The project should not use:

- a purely deterministic final decision engine,
- or a single unconstrained LLM that directly decides everything from raw input.

Instead, the recommended v1 direction is:

- structured state and guardrails,
- candidate-plan generation,
- multi-agent debate over feasible candidates,
- one judge agent selecting the final plan,
- one executable action list shown to the user.

In short:

- deterministic boundaries,
- agentic final choice.

## 3. Why this architecture

This product contains too much subjective information to feel good as a pure function-only planner.

Examples:

- whether the user personally cares about a class,
- whether a time block is genuinely valuable,
- whether a course is worth spending buffer on,
- whether a slightly awkward action is still acceptable,
- whether one candidate plan feels "too risky" in a human sense even if it remains technically feasible.

At the same time, a pure LLM decider is too loose for this project because:

- hard academic lines matter,
- candidate actions must stay bounded,
- the product must produce one plan rather than improvising endlessly,
- and the system needs some reproducible internal structure.

The recommended architecture solves this by splitting responsibilities.

## 4. Architectural overview

The decision system should have five layers.

### Layer 1 - State and memory layer

This layer stores the structured world model.

It contains:

- imported timetable facts,
- user global profile,
- semester phase data,
- course detail records,
- short-term modifiers,
- field-level confidence markers where relevant,
- rare-event feedback from executed course occurrences,
- prior generated plans if needed for comparison.

This layer should remain structured and non-agentic.

### Layer 2 - Guardrail and feasibility layer

This layer enforces hard constraints and trims impossible actions.

It is responsible for:

- red-line checks,
- must-attend sessions,
- absence-limit pressure,
- impossible action filtering,
- and candidate-space reduction.

This layer should remain deterministic.

### Layer 3 - Candidate planner layer

This layer generates a small number of feasible candidate plans.

It should not output one final answer immediately.

Instead, it should produce a manageable shortlist such as:

- a more time-greedy feasible plan,
- a more balanced feasible plan,
- a more execution-friendly feasible plan.

These candidates must all already satisfy the guardrail layer.

### Layer 4 - Debate agent layer

This layer contains role-based agents that critique candidate plans from different perspectives.

They do not create unlimited new plans.

They evaluate and argue over the candidate set.

### Layer 5 - Judge layer

This layer chooses one final plan from the candidate set after reading the debate output.

It produces:

- the chosen final plan,
- concise reasoning for the system,
- and user-facing execution notes.

## 5. Information flow

The default information flow should be:

1. raw and structured inputs enter the state layer,
2. structuring/extraction converts messy text into confirmed structured fields,
3. guardrails remove illegal or unacceptable actions,
4. candidate planner generates a small feasible plan set,
5. debate agents score and critique the candidates,
6. judge agent chooses one final plan,
7. output mapper converts that plan into one action list.

If the user later reports a rare low-probability event, the system should additionally support:

8. storing that event as new evidence,
9. temporarily increasing caution for later related occurrences,
10. regenerating the candidate set and final judged plan.

The user should still see one plan only.

## 6. Which parts stay deterministic

The following should remain outside open-ended LLM discretion in v1:

- hard recorded-absence limits,
- must-attend session enforcement,
- impossible action filtering,
- fixed action vocabulary,
- planning window construction,
- persisted state schema,
- candidate-plan count limits,
- and final output shape.

This layer exists so that agents debate only within an allowed space.

## 7. Which parts become agentic

The following are good places for LLM and agent behavior:

- extracting structured fields from messy notes,
- identifying missing or contradictory inputs,
- generating candidate plans inside the feasible region,
- evaluating tradeoffs between multiple feasible plans,
- making the final subjective choice among acceptable candidates,
- and generating explanations or tuning responses.

This is where the project becomes meaningfully "agentic" instead of just rule-heavy.

## 8. Agent roster for v1

The recommended v1 uses one structuring agent, three debate agents, and one judge.

### 8.1 Structurer Agent

Purpose:

- convert raw notes and natural-language inputs into structured candidate fields.

Responsibilities:

- parse grading notes,
- parse attendance requirements,
- normalize special-course notes,
- detect contradictions,
- suggest missing fields.

Important rule:

- planning-critical extracted fields must still be confirmed before becoming trusted state.

### 8.2 Academic Guardian

Purpose:

- represent academic safety and red-line caution.

Primary concerns:

- absence pressure,
- fail risk,
- key-session importance,
- semester phase tightening,
- score-buffer preservation.

What it outputs:

- objections to specific candidate plans,
- a severity view of academic downside,
- and a preference ordering from the academic perspective.

### 8.3 Time Maximizer

Purpose:

- represent free-time gain as aggressively as the current user strategy allows.

Primary concerns:

- usable free-time blocks,
- early-class avoidance,
- time-use goals,
- short-term events and weather,
- total time recovered.

What it outputs:

- which candidate extracts the most real value from the schedule,
- and where more conservative candidates are wasting time.

### 8.4 Execution Realist

Purpose:

- represent whether a plan is actually livable.

Primary concerns:

- commute burden,
- substitute attendance cost,
- sign-in-and-leave feasibility,
- user execution pressure,
- classroom awkwardness,
- practical friction.

What it outputs:

- which candidate is most executable,
- where a theoretically good plan is too annoying, too expensive, or too psychologically heavy.

### 8.5 Judge Agent

Purpose:

- choose one final plan among the feasible candidates after reading the debate.

Primary rule:

- the judge may choose only from the candidate set that passed the guardrail layer.

The judge should not invent a completely new plan outside the allowed space in v1.

What it outputs:

- one chosen plan id,
- brief structured reasoning,
- confidence level,
- user-facing summary notes.

## 9. Candidate planner design

The candidate planner is the most important bridge between deterministic constraints and agentic choice.

It should generate only a small set of feasible plan candidates.

Recommended size:

- 3 to 5 candidates.

Candidate styles may include:

- time-priority feasible candidate,
- balanced feasible candidate,
- execution-friendly feasible candidate,
- optionally one cost-saving feasible candidate.

All candidates must:

- obey hard blockers,
- use the allowed action vocabulary,
- stay inside accepted planning mode boundaries,
- and already be mappable into the action-plan output format.

## 10. Debate protocol

The debate layer should be structured, not free-form.

Each debate agent should receive:

- the same candidate set,
- the same user and course context snapshot,
- the current planning mode,
- the current semester phase and short-term modifiers,
- and a fixed evaluation prompt tied to that agent's role.

Each agent should return a compact structured review such as:

- preferred candidate order,
- strongest objections,
- strongest supporting reasons,
- and any warning flags.

They may also point out which missing information materially lowers confidence.

They should not mutate shared state directly.

## 11. Judge protocol

The judge agent should read:

- the structured context snapshot,
- the candidate plans,
- the three debate reviews,
- and the current planning mode.

The judge should output:

- selected candidate,
- concise rationale,
- optional fallback candidate,
- output notes for user display.

The rationale should stay short enough to fit the product's single-plan, low-clutter UX.

The judge should prefer:

- candidates that satisfy the user goal,
- candidates that keep objections manageable across all three agent roles,
- and candidates that remain credible to execute in real life.

## 12. Planning modes in the new architecture

The two existing planning modes still matter.

### `safe_max_mode`

The candidate planner should keep pushing toward more usable free time until feasible improvement becomes too weak or too risky.

Debate agents then compare the resulting feasible candidates.

### `target_free_time_mode`

The candidate planner should stop once it has produced candidates that already satisfy the requested free-time target.

Debate and judge then decide which of those satisfactory candidates feels best overall.

This keeps planning mode behavior compatible with the earlier input design.

## 13. Output behavior

Even though the internal architecture is now multi-agent, the output experience should remain simple.

The user should still receive:

- one final action plan,
- one recommended attendance status per course occurrence,
- concise execution notes,
- and one very short judge rationale.

Debate details should remain internal or secondary.

The product should still feel like a decision terminal.

The plan surface should also support switching among at least:

- today,
- this week,
- current phase.

## 14. How conservative/aggressive retuning works now

The existing `more_conservative` and `more_aggressive` controls still fit this architecture.

They should not merely change final text.

They should change candidate generation pressure before debate begins.

That means:

- `more_conservative` produces a more attendance-preserving candidate set,
- `more_aggressive` produces a more free-time-seeking candidate set,
- the debate and judge then re-run on the new candidate set.

So tuning remains meaningful, not cosmetic.

## 15. Rare-event feedback and bounded replanning

The product should support feedback when a low-probability event actually happens in a course occurrence.

Examples:

- a rare full roll call,
- an unexpected random check,
- an unusual sign-in requirement,
- or a temporary stricter-than-usual teacher behavior.

This event feedback should not permanently rewrite the course model by default.

Instead, it should:

- enter the state layer as new evidence,
- raise short-term caution in a bounded way,
- influence candidate generation and debate for upcoming related occurrences,
- and trigger replanning.

This keeps the planner adaptive without overreacting forever to a single unusual event.

## 16. Why this is stronger for the resume story

This design is stronger than both a pure rules engine and a pure prompt-based planner.

It lets you honestly say the project includes:

- structured state,
- policy guardrails,
- candidate-plan generation,
- multi-agent debate,
- judge-based final selection,
- and single-plan user delivery.

That is a much stronger story than:

- "I used an LLM to recommend something"

or:

- "I wrote some weighted heuristics."

## 17. Current conclusion

The recommended new architecture is:

- deterministic state and guardrails,
- agentic candidate evaluation,
- judge-based final choice,
- single executable output.

This is the best balance among:

- controllability,
- product quality,
- subjectivity handling,
- and modern agent-project presentation.
