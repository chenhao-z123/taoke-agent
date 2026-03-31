# Campus Energy Optimizer - Brainstorming Notes

Status: working notes only, not final PRD.

## Current product direction

- The product should focus first on user goals and input structure.
- This is not a single fixed objective function. The system should combine:
  - user strategy intensity,
  - risk boundaries,
  - grade expectations,
  - and time-release preferences.
- The latest architecture is now a guarded multi-agent planning system rather than a pure rule-only decider.
- Current architecture split:
  - structured state and memory layer,
  - deterministic guardrail and feasibility layer,
  - candidate-plan generation layer,
  - multi-agent debate layer,
  - judge layer selecting one final plan.
- LLM is no longer only a translator/explainer.
- In the current design, LLM should help with:
  - structuring messy inputs into candidate fields,
  - detecting contradictions and missing information,
  - generating feasible candidate plans inside guarded boundaries,
  - debating tradeoffs across multiple acceptable candidates,
  - and helping a judge agent choose one final plan.
- Hard constraints, allowed action space, and persisted state boundaries should still remain deterministic.
- Architecture authority note:
  - `agent-decision-architecture-spec-v0.1.md` is the authoritative v1 decision-making architecture,
  - `decision-engine-spec-v0.1.md` now describes only the deterministic guardrail and candidate-planning baseline inside that broader system.

## Goal model confirmed so far

- Front-end interaction should rely on questionnaire-style options rather than free-form goal entry.
- The user prefers a small number of simple strategy tiers instead of complex identity-based personas.
- Strategy should not be framed around labels like "study abroad", "postgrad", or "just gaming" because those are motivations, not the actual optimization layer.
- A better framing is:
  - how aggressively the user wants to free time,
  - what kinds of cost the user can accept,
  - and what minimum academic safety line must be preserved.
- The user should be able to combine a main strategy with preference switches.

## Preference switches explicitly chosen by user

The user selected these important preference dimensions:

- prioritize large continuous free-time blocks,
- prioritize skipping early-morning or late classes,
- minimize usual-score loss,
- only avoid failing; extra unused score is not valuable.

## Planning horizon and semester phases

- Planning should not default to weekly scheduling.
- Planning should follow semester phases.
- Default phase rules should be built in, but users must be able to modify them.

Current default 16-week phase split discussed by the user:

- Weeks 1-2: exploration phase
  - first session of each course should be attended,
  - gather grading scheme, teacher behavior, attendance style, exam information.
- Weeks 3-6: normal release phase
- Weeks 7-9: midterm tightening phase
- Weeks 10-14: post-midterm relaxed phase
- Weeks 15-16: final tightening phase
  - final classes before exams should default to attended.

## Course classification model

The user wants three course classes:

- core: important courses,
- special: not necessarily high-score courses, but risky or hard to skip,
- easy: water courses, primary source of free time.

Important nuance:

- core does not always mean high score is required.
- For non-recommendation-focused users, even core courses may only need a passing outcome.
- Therefore, course class and target grade should remain separate concepts.

For special courses:

- every special course must be explained by the user,
- special courses should also support a lightweight subtype field,
- lab / experiment style courses should be treated as one important special-course subtype,
- the system should not rely on fixed preset labels alone,
- school- and teacher-specific context must come from user notes.

## Attendance / absence modeling assumptions

- If a student skips class and is not discovered, it should be treated as no effective absence.
- Therefore, the main tracked quantity is recorded absence / caught absence, not hidden absence.
- "Teacher strictness" should not be a core field.
- Instead, the core facts are:
  - attendance-check mode,
  - full-class roll-call frequency,
  - random/picked-student roll-call frequency.

## Frequency input style

- The front end should use simple frequency tiers.
- The backend should map those tiers into probabilities or structured parameters.

## Course data that matters most in early exploration

The user identified these as core facts to learn early:

- attendance-check mode,
- roll-call frequency / probability,
- fail line / maximum tolerated recorded absences,
- teacher-specific behavior only insofar as it can be expressed through concrete attendance behavior.

## Grade and academic target model

- The system should support both:
  - user-provided target skip amount,
  - and system-estimated maximum safe skip amount.
- The user endorsed supporting both modes.
- However, the deeper objective is better expressed as:
  - desired score outcome,
  - acceptable maximum number of times being caught,
  - acceptable probability of being caught,
  - then maximize released free time under those limits.

The user currently prefers a two-level academic target concept:

- courses that need high scores,
- courses that only need passing.

But that target should not be forced purely by course type.

Additional nuance from user:

- course difficulty should influence expected score strategy,
- especially the expected value of usual-score loss versus keeping time,
- so score expectations cannot depend only on course class.

## Course input structure confirmed so far

Each course should eventually include at least:

- course classification: core / special / easy,
- structured attendance-check information,
- structured attendance frequency tiers,
- structured absence constraints,
- grading composition,
- attendance requirements,
- free-text notes.

For grading composition, the user prefers:

- full grading composition entered structurally,
- absence rules entered separately.

For absence constraints, the user prefers a hybrid model:

- structured rule fields plus notes.

The minimum structured absence-rule fields confirmed so far are:

- maximum allowed recorded absences,
- fail threshold,
- score loss per recorded absence,
- whether certain key sessions must be attended.

## Key-session categories currently requested

The user wants support for these important session types:

- first class,
- final classes before exams,
- teacher-announced important sessions,
- high-risk sessions such as small-class / low-attendance situations.

## User-level risk and execution preferences

- Risk input should default to a main strategy tier plus optional advanced fields.
- The user accepted a structure like:
  - safe / balanced / aggressive as the front-facing strategy tier,
  - with advanced override fields such as max tolerated recorded absences.
- User psychology/execution pressure should be a global field.
- Substitute actions should be user-configurable toggles, including:
  - sign in before class and leave,
  - leave request / make-up leave,
  - substitute attendance,
  - post-class remediation.
- The user prefers time-value preferences to support multiple layers at once:
  - fixed preference switches,
  - weekday-specific preferences,
  - purpose-based preferences such as study, internship, travel, sleep, or gaming.
- Short-term replanning should be supported.
- Weather can act as a near-term modifier, such as increasing or decreasing skip preference during rain or extreme heat.

## Course environment / escape feasibility

- Classroom escape feasibility should combine:
  - a simple ease tier,
  - and objective environment labels.
- Example labels discussed:
  - fixed seating,
  - no rear path,
  - awkward exit path,
  - strong teacher line of sight.

## Approved lightweight UX features

The user approved these lightweight product features as worth carrying forward:

- field confidence / information certainty markers,
- missing-info prompts when plan quality is lowered by absent data,
- smoother conservative / aggressive retune hints,
- time-range view switching for action plans,
- one very short judge rationale,
- rare-event feedback that can trigger bounded replanning.

Rare-event feedback example:

- a course that usually does not use full roll call suddenly performs a rare full roll call.

The planner should treat this as new evidence and update later plans in a bounded way rather than assuming the course changed forever from one event.

## Architecture status note

- Earlier open questions about key-session representation, score targets, substitute actions, and short-term replanning have now been resolved in the later spec documents.
- This notes file should now be treated as historical brainstorming context plus key product decisions, not as the primary source of unresolved architecture work.
- For current architecture and execution details, defer to:
  - `input-model-spec-v0.1.md`
  - `decision-engine-spec-v0.1.md`
  - `action-plan-output-spec-v0.1.md`
  - `agent-decision-architecture-spec-v0.1.md`
  - `docs/superpowers/plans/2026-03-17-campus-energy-optimizer-mvp.md`
