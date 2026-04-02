# Campus Energy Optimizer MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable MVP that imports timetable data, collects user/course inputs, runs a guarded multi-agent planning system, and outputs one executable action plan.

**Architecture:** Use a small full-stack web app with a clear split between input capture, deterministic state/guardrails, candidate-plan generation, multi-agent debate, judge-based final selection, and action-plan presentation. Keep the state and guardrail layers structured and testable, keep persistence simple, and make the UI only as rich as needed to collect inputs and show one action list.

**Tech Stack:** Next.js, TypeScript, React, Prisma, SQLite, Zod, Vitest, LLM API or agent orchestration layer

---

## What This Document Contains

This plan is the execution bridge between the finished specs and real implementation work.

It already assumes the following design documents are the working design references:

- `input-model-spec-v0.1.md`
- `decision-engine-spec-v0.1.md`
- `action-plan-output-spec-v0.1.md`
- `agent-decision-architecture-spec-v0.1.md`

Hierarchy note:

- `agent-decision-architecture-spec-v0.1.md` is the authoritative v1 decision-making architecture.
- `decision-engine-spec-v0.1.md` now describes only the deterministic guardrail and candidate-planning baseline inside that broader architecture.

This document tells the implementer:

- what project structure to create,
- what data must be persisted,
- what order to build the MVP in,
- what tests to write before implementation,
- what commands to run to verify each stage,
- and what the first end-to-end usable version must include.

If a future engineer can only read one execution document before starting, it should be this one.

## How To Use This Plan

Use this plan in a fresh implementation session, not in a long brainstorming session.

Recommended execution approach:

1. start a new session dedicated only to implementation,
2. open this file first,
3. execute chunk by chunk in order,
4. do not skip the test and manual QA steps,
5. treat the four spec documents as references when a task needs clarification.

The plan is intentionally sequenced so that later chunks depend on artifacts created in earlier chunks.

Do not start from the agent layer or UI first.

Start from Chunk 1.

## Workspace And Git Guidance

Implementation should happen in a dedicated git worktree or isolated branch workspace.

Recommended structure:

- one main repository root for baseline documentation,
- one implementation worktree for the MVP build,
- optional extra worktrees only if work is later split into clearly independent streams.

For this MVP, the default recommendation is:

- use one main implementation worktree,
- keep one active implementation session,
- and only parallelize later if shared schema and shared types are already stable.

Do not run multiple autonomous implementation loops against the same files at the same time.

High-conflict areas for parallel work are:

- `prisma/schema.prisma`
- `src/lib/types/*.ts`
- `src/lib/schema/input.ts`
- `src/lib/decision/*.ts`

## GitHub And Local Setup Prerequisites

Before implementation starts, confirm the local environment is ready.

Minimum prerequisites:

- git repository initialized,
- package manager available,
- Node.js version suitable for Next.js,
- Prisma and SQLite usable locally,
- GitHub authentication already configured if remote push is planned.

This plan does not assume any credentials are created by the implementer.

If the project will be pushed to GitHub, local auth should already work through one of:

- `gh` CLI login,
- existing SSH setup,
- or existing HTTPS credential manager setup.

Remote publishing is optional for MVP implementation itself.

## Direct Startup Checklist

Before starting Chunk 1, confirm this exact checklist in the implementation session:

- dependencies installed successfully,
- `pnpm prisma generate` succeeds,
- `pnpm typecheck` succeeds,
- `pnpm test` runs without framework-level failure,
- `pnpm build` succeeds,
- `pnpm dev` starts the local app,
- the implementation session is running inside the intended project root.

At the time of writing this plan, the repository-local setup already supports this startup path.

## First Working Session Sequence

The recommended first implementation session should do only this:

1. verify local startup with:

```bash
pnpm prisma generate
pnpm typecheck
pnpm test
pnpm build
```

2. begin Chunk 1 only after those checks pass,
3. do not jump ahead to input pages or agent code before the shared types and schema are in place,
4. keep the first implementation session focused on project skeleton and data model only.

This prevents early drift into UI or agent orchestration before the shared foundations are stable.

## Execution Boundaries

This plan builds the first usable MVP only.

It does include:

- timetable import,
- questionnaire and course-detail input,
- semester phase and short-term modifiers,
- deterministic guardrails,
- candidate-plan generation,
- multi-agent debate and judge selection,
- one generated action plan,
- retuning in more conservative or more aggressive directions.

It does not include:

- advanced analytics dashboards,
- marketplace-like substitute systems,
- broad timetable-format support,
- production deployment,
- or external data enrichment.

If work expands beyond those boundaries, create a new follow-up plan rather than silently growing this one.

## File Structure

The MVP should use this structure.

- `package.json` - project scripts and dependencies
- `tsconfig.json` - TypeScript config
- `next.config.ts` - Next.js config
- `prisma/schema.prisma` - database schema
- `src/app/page.tsx` - landing page / project entry
- `src/app/import/page.tsx` - timetable import page
- `src/app/profile/page.tsx` - global questionnaire page
- `src/app/phase/page.tsx` - semester phase configuration page
- `src/app/courses/page.tsx` - course detail completion page
- `src/app/adjust/page.tsx` - short-term adjustment page
- `src/app/plan/page.tsx` - generated action plan page
- `src/lib/types/input.ts` - input-domain types
- `src/lib/types/output.ts` - action-plan output types
- `src/lib/types/decision.ts` - decision-engine internal types
- `src/lib/schema/input.ts` - Zod schemas for input validation
- `src/lib/import/timetable-parser.ts` - timetable import parsing logic
- `src/lib/decision/context.ts` - context assembly per course occurrence
- `src/lib/decision/blockers.ts` - hard-blocker checks
- `src/lib/decision/pressures.ts` - pressure estimation functions
- `src/lib/candidates/candidate-planner.ts` - feasible candidate-plan generation
- `src/lib/debate/protocol.ts` - shared debate and review formats
- `src/lib/agents/structurer.ts` - LLM-backed structuring and contradiction detection
- `src/lib/agents/academic-guardian.ts` - academic-safety debate agent
- `src/lib/agents/time-maximizer.ts` - free-time-priority debate agent
- `src/lib/agents/execution-realist.ts` - execution-feasibility debate agent
- `src/lib/agents/judge.ts` - final candidate selection agent
- `src/lib/decision/planner.ts` - plan-level orchestration across guardrails, candidates, debate, and judge
- `src/lib/output/plan-output.ts` - map internal decisions to action-plan output
- `src/lib/db.ts` - Prisma client setup
- `src/lib/repo/timetable.ts` - imported timetable persistence helpers
- `src/lib/repo/user-profile.ts` - user profile persistence helpers
- `src/lib/repo/semester-phase.ts` - semester phase persistence helpers
- `src/lib/repo/short-term.ts` - short-term modifier persistence helpers
- `src/lib/repo/course-details.ts` - course detail persistence helpers
- `src/lib/repo/plan.ts` - plan persistence helpers
- `src/server/actions/save-imported-timetable.ts` - import persistence action
- `src/server/actions/save-profile.ts` - profile persistence action
- `src/server/actions/save-semester-phase.ts` - semester phase persistence action
- `src/server/actions/save-short-term.ts` - short-term modifier persistence action
- `src/server/actions/save-course-details.ts` - course detail persistence action
- `src/server/actions/report-rare-event.ts` - rare-event feedback action
- `src/server/actions/generate-plan.ts` - plan generation action
- `src/server/actions/retune-plan.ts` - plan retuning action
- `src/components/forms/*.tsx` - form UI pieces
- `src/components/plan/*.tsx` - action-plan UI pieces
- `prisma/seed.ts` - seed data for smoke testing
- `tests/import/timetable-parser.test.ts` - import tests
- `tests/decision/blockers.test.ts` - blocker tests
- `tests/decision/pressures.test.ts` - pressure tests
- `tests/candidates/candidate-planner.test.ts` - feasible candidate generation tests
- `tests/agents/debate-agents.test.ts` - debate agent role tests
- `tests/agents/judge.test.ts` - judge selection tests
- `tests/decision/planner.test.ts` - plan-level orchestration and planning-mode tests
- `tests/output/plan-output.test.ts` - output mapping tests

## Chunk 1: Project Skeleton And Data Model

### Task 1: Scaffold the app and database

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Initialize the project skeleton**

Create a Next.js + TypeScript app structure with Prisma and Vitest dependencies.

- [ ] **Step 2: Define the minimum Prisma schema**

Model at least these persisted entities:

- imported timetable course
- user profile
- semester phase config
- short-term modifier record
- course detail record
- generated plan
- generated plan item

At minimum, the persisted schema should explicitly support these fields or equivalent columns:

- imported timetable course: course name, time slots, location, teacher name, week range, course type/credit
- user profile: planning mode, optional free-time target, strategy tier, risk tier, execution pressure, score buffer preference, substitute settings
- semester phase config: current phase template and overrides
- short-term modifier record: weather modifier, temporary goal shift, upcoming events, body state
- course detail record: course class, optional special-course subtype, course target level, personal fail risk, attendance modes, frequency tiers, absence-rule fields, key-session data, sign-in-then-leave feasibility, substitute availability/cost overrides, notes, confidence markers, and rare-event feedback history
- generated plan: plan id, planning window, available time views, strategy snapshot, tuning controls, optional judge short rationale, optional missing-info prompt
- generated plan item: plan item id, course id, date, time slot, attendance status, execution note, optional must-attend reason, optional cost fields, optional phase/short-term notes, and optional event-feedback affordance

- [ ] **Step 3: Add the database client**

Create `src/lib/db.ts` for Prisma client reuse.

- [ ] **Step 4: Generate the initial migration**

Run: `npx prisma migrate dev --name init`
Expected: migration created and SQLite database initialized

- [ ] **Step 5: Verify schema generation**

Run: `npx prisma generate`
Expected: Prisma client generated successfully

### Task 2: Encode the shared domain types

**Files:**
- Create: `src/lib/types/input.ts`
- Create: `src/lib/types/decision.ts`
- Create: `src/lib/types/output.ts`
- Create: `src/lib/schema/input.ts`

- [ ] **Step 1: Write the input-domain types**

Translate `input-model-spec-v0.1.md` into TypeScript and Zod types.

Include support for:

- field confidence markers where relevant,
- special-course subtype,
- and rare-event feedback records.

- [ ] **Step 2: Write the decision-domain types**

Define types for:

- occurrence context
- hard blockers
- pressure estimates
- feasible action states
- internal decision record
- candidate plans
- debate reviews
- judge selection result

- [ ] **Step 3: Write the output-domain types**

Translate `action-plan-output-spec-v0.1.md` into stable output types.

- [ ] **Step 4: Validate the schema layer**

Run: `npx tsc --noEmit`
Expected: no TypeScript errors

## Chunk 2: Input Pipeline

### Task 3: Build timetable import parsing

**Files:**
- Create: `src/lib/import/timetable-parser.ts`
- Test: `tests/import/timetable-parser.test.ts`

- [ ] **Step 1: Write failing parser tests**

Cover at least:

- normal timetable row parsing
- multiple time-slot parsing
- week-range parsing
- malformed row fallback

- [ ] **Step 2: Run the parser tests to verify failure**

Run: `npx vitest tests/import/timetable-parser.test.ts`
Expected: failing tests because parser is not implemented yet

- [ ] **Step 3: Implement the minimal parser**

Parse imported timetable rows into the minimum course structure used by the app.

- [ ] **Step 4: Persist imported timetable data**

Store parsed timetable rows through the timetable repository and save action so later steps use saved timetable records rather than in-memory assumptions.

- [ ] **Step 5: Re-run parser tests**

Run: `npx vitest tests/import/timetable-parser.test.ts`
Expected: pass

### Task 4: Build input persistence and validation

**Files:**
- Create: `src/lib/repo/timetable.ts`
- Create: `src/lib/repo/user-profile.ts`
- Create: `src/lib/repo/semester-phase.ts`
- Create: `src/lib/repo/short-term.ts`
- Create: `src/lib/repo/course-details.ts`
- Create: `src/lib/repo/plan.ts`
- Create: `src/server/actions/save-imported-timetable.ts`
- Create: `src/server/actions/save-profile.ts`
- Create: `src/server/actions/save-semester-phase.ts`
- Create: `src/server/actions/save-short-term.ts`
- Create: `src/server/actions/save-course-details.ts`
- Create: `src/server/actions/report-rare-event.ts`

- [ ] **Step 1: Implement repository helpers**

Add focused persistence helpers for imported timetable data, user profile, semester phase config, short-term modifiers, course details, and generated plans.

- [ ] **Step 2: Add save actions with Zod validation**

Validate imported timetable data, user profile, semester phase data, short-term modifiers, and course details before persistence.

This should also support later updates to course intelligence and rare-event feedback.

- [ ] **Step 3: Verify persistence compiles**

Run: `npx tsc --noEmit`
Expected: no TypeScript errors

### Task 5: Build the MVP input pages

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/import/page.tsx`
- Create: `src/app/profile/page.tsx`
- Create: `src/app/phase/page.tsx`
- Create: `src/app/courses/page.tsx`
- Create: `src/app/adjust/page.tsx`
- Create: `src/components/forms/import-form.tsx`
- Create: `src/components/forms/profile-form.tsx`
- Create: `src/components/forms/phase-form.tsx`
- Create: `src/components/forms/course-detail-form.tsx`
- Create: `src/components/forms/short-term-form.tsx`
- Create: `src/components/forms/rare-event-form.tsx`

- [ ] **Step 1: Build the landing page**

Show the MVP flow and route users into import.

- [ ] **Step 2: Build the import page**

Allow timetable upload or pasted timetable text, parse it, and persist the imported timetable.

- [ ] **Step 3: Build the global questionnaire page**

Collect strategy tier, risk tier, planning mode, optional free-time target, execution pressure, and substitute settings.

- [ ] **Step 4: Build the semester phase page**

Allow the user to accept or edit the default semester phase template.

- [ ] **Step 5: Build the course detail page**

Allow one-by-one completion of course class, optional special-course subtype, target level, personal fail risk, attendance mode, frequencies, absence rules, key-session data, action-feasibility fields, and notes.

This page should also support confidence markers for fields where the user's certainty materially affects plan quality.

- [ ] **Step 6: Build the short-term adjustment page**

Allow temporary weather, event, body-state, and short-term goal overrides.

This page should also allow user feedback when a rare low-probability attendance event actually happened.

- [ ] **Step 7: Manual QA the input flow**

Run: `npm run dev`
Expected: import page, profile page, phase page, course detail page, and short-term adjustment page load and save test data end-to-end

The input flow should also surface confidence markers and missing-info prompts where relevant.

## Chunk 3: Agent Decision System

### Task 6: Implement deterministic guardrails and occurrence context

**Files:**
- Create: `src/lib/decision/context.ts`
- Create: `src/lib/decision/blockers.ts`
- Create: `src/lib/decision/pressures.ts`
- Test: `tests/decision/blockers.test.ts`
- Test: `tests/decision/pressures.test.ts`

- [ ] **Step 1: Write blocker tests**

Cover at least:

- first-session forced attendance
- pre-final forced attendance
- key-session forced attendance
- near-absence-limit attendance pressure
- missing-information caution path

- [ ] **Step 2: Write pressure tests**

Cover academic pressure, catch pressure, free-time value pressure, and execution-cost pressure.

- [ ] **Step 3: Run the decision tests to verify failure**

Run: `npx vitest tests/decision/blockers.test.ts tests/decision/pressures.test.ts`
Expected: failing tests before implementation

- [ ] **Step 4: Implement context assembly and blockers**

Assemble one occurrence context and compute hard blockers.

The context assembly must explicitly load and thread in the current semester phase, the current short-term modifiers, the saved planning mode, and the optional saved free-time target.

- [ ] **Step 5: Implement pressure estimation**

Implement deterministic helpers for the four pressure groups.

These helpers now serve the guardrail and candidate-planning layers rather than acting as the sole final decider.

- [ ] **Step 6: Re-run the tests**

Run: `npx vitest tests/decision/blockers.test.ts tests/decision/pressures.test.ts`
Expected: pass

### Task 7: Implement candidate planner

**Files:**
- Create: `src/lib/candidates/candidate-planner.ts`
- Test: `tests/candidates/candidate-planner.test.ts`

- [ ] **Step 1: Write candidate-planner tests**

Cover at least:

- all generated candidates stay inside hard constraints
- candidate count stays intentionally small
- candidates differ in useful direction such as time-priority, balanced, or execution-friendly
- more_conservative changes candidate generation pressure
- more_aggressive changes candidate generation pressure

- [ ] **Step 2: Run the candidate-planner tests to verify failure**

Run: `npx vitest tests/candidates/candidate-planner.test.ts`
Expected: failing tests before implementation

- [ ] **Step 3: Implement feasible candidate generation**

Generate 3-5 feasible candidate plans using the deterministic guardrail layer and planning-mode boundaries.

- [ ] **Step 4: Re-run candidate-planner tests**

Run: `npx vitest tests/candidates/candidate-planner.test.ts`
Expected: pass

### Task 8: Implement debate agents and judge

**Files:**
- Create: `src/lib/debate/protocol.ts`
- Create: `src/lib/agents/structurer.ts`
- Create: `src/lib/agents/academic-guardian.ts`
- Create: `src/lib/agents/time-maximizer.ts`
- Create: `src/lib/agents/execution-realist.ts`
- Create: `src/lib/agents/judge.ts`
- Test: `tests/agents/debate-agents.test.ts`
- Test: `tests/agents/judge.test.ts`

- [ ] **Step 1: Write debate-agent tests**

Cover at least:

- structurer agent returns structured candidate fields or contradiction signals from messy notes
- each debate agent returns structured review output
- each agent respects its own role perspective
- agents do not invent plans outside the candidate set
- agents can point out missing information that materially lowers confidence

- [ ] **Step 2: Write judge tests**

Cover at least:

- judge selects only from the provided candidate set
- judge can use debate output to prefer one candidate
- judge does not invent a new plan outside the candidate set

- [ ] **Step 3: Run the debate and judge tests to verify failure**

Run: `npx vitest tests/agents/debate-agents.test.ts tests/agents/judge.test.ts`
Expected: failing tests before implementation

- [ ] **Step 4: Implement the structurer agent and debate protocol**

Implement the Structurer Agent so it can normalize messy inputs, detect contradictions, and prepare structured candidate fields before planning-critical confirmation.

- [ ] **Step 5: Implement the role agents**

Implement shared debate input/output structure plus the three role agents.

- [ ] **Step 6: Implement the judge agent**

Implement final plan selection from the candidate set only.

- [ ] **Step 7: Re-run the debate and judge tests**

Run: `npx vitest tests/agents/debate-agents.test.ts tests/agents/judge.test.ts`
Expected: pass

### Task 9: Implement plan orchestration across candidates, debate, and planning modes

**Files:**
- Create: `src/lib/decision/planner.ts`
- Test: `tests/decision/planner.test.ts`

- [ ] **Step 1: Write planner orchestration tests**

Cover at least:

- `safe_max_mode` continues toward more usable free time until candidate improvement becomes too weak or unsafe
- `target_free_time_mode` stops once acceptable candidates satisfy the target
- planner passes the candidate set through debate and judge selection
- conservative/aggressive tuning regenerates a changed candidate set before debate
- rare-event feedback triggers bounded replanning for later related occurrences

- [ ] **Step 2: Run planner tests to verify failure**

Run: `npx vitest tests/decision/planner.test.ts`
Expected: failing tests before implementation

- [ ] **Step 3: Implement planner orchestration**

Coordinate deterministic guardrails, candidate generation, debate-agent reviews, judge selection, and plan-level accumulation.

It should also accept rare-event feedback as new evidence and trigger bounded replanning rather than permanently overreacting.

- [ ] **Step 4: Re-run planner tests**

Run: `npx vitest tests/decision/planner.test.ts`
Expected: pass

## Chunk 4: Action Plan Output And UI

### Task 10: Map internal decisions to output spec

**Files:**
- Create: `src/lib/output/plan-output.ts`
- Test: `tests/output/plan-output.test.ts`

- [ ] **Step 1: Write output mapping tests**

Cover mapping from internal decision record to:

- plan wrapper fields: `plan_id`, `planning_window`, `strategy_snapshot`, `plan_items`, `tuning_controls`
- plan item fields: `plan_item_id`, `course_id`, `date`, `time_slot`, `attendance_status`, `execution_note`
- execution note
- optional execution-support fields: `must_attend_reason`, `estimated_commute_time_cost`, `estimated_substitute_cost`, `leave_early_note`
- optional context fields: `phase_context_note`, `short_term_override_note`
- judge short rationale
- missing-info prompt surface when confidence is materially lowered
- tuning control hints
- available time views
- event-feedback affordance on relevant action items

- [ ] **Step 2: Run output tests to verify failure**

Run: `npx vitest tests/output/plan-output.test.ts`
Expected: failing tests before implementation

- [ ] **Step 3: Implement output mapping**

Convert planner results into the stable action-plan output structure, including all required plan-level and plan-item fields named above.

- [ ] **Step 4: Re-run output tests**

Run: `npx vitest tests/output/plan-output.test.ts`
Expected: pass

### Task 11: Build the action plan page

**Files:**
- Create: `src/app/plan/page.tsx`
- Create: `src/components/plan/plan-table.tsx`
- Create: `src/components/plan/tuning-controls.tsx`
- Create: `src/components/plan/judge-rationale.tsx`
- Create: `src/components/plan/missing-info-prompt.tsx`
- Create: `src/server/actions/generate-plan.ts`
- Create: `src/server/actions/retune-plan.ts`
- Create: `src/server/actions/report-rare-event.ts`

- [ ] **Step 1: Build the generate-plan action**

Wire saved input data into the deterministic sublayer, candidate planner, debate agents, judge, and output mapper.

- [ ] **Step 2: Build the plan page**

Show one action list with date, time, course, attendance status, and execution note.

The plan page should support switching among:

- today,
- this week,
- current phase.

It should also surface one short judge rationale and, when needed, one short missing-info prompt.

- [ ] **Step 3: Build tuning controls**

Allow the user to regenerate the same plan in a more conservative or more aggressive direction.

Each control should include a lightweight hint about what kind of change the user should expect.

- [ ] **Step 4: Build rare-event feedback from the plan surface**

Allow the user to report a rare low-probability event from a relevant action item and trigger bounded replanning.

- [ ] **Step 5: Manual QA the plan flow**

Run: `npm run dev`
Expected: load saved data, generate one plan, switch time range, view the short judge rationale, submit rare-event feedback if needed, and retune the plan with both controls

## Chunk 5: Final Validation And Project Readiness

### Task 12: Add seed data and smoke path

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a minimal seed script**

Seed one sample timetable, one user profile, one set of course details, and one generated plan path.

- [ ] **Step 2: Run the seed script**

Run: `npx prisma db seed`
Expected: seed data inserted successfully

### Task 13: Run the full verification set

**Files:**
- Modify: none

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`
Expected: pass

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: pass

- [ ] **Step 3: Manual QA the full app**

Run: `npm run dev`
Expected: import -> questionnaire -> course details -> generate plan -> retune plan all work in one end-to-end path

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: build campus energy optimizer mvp"
```

## Notes For The Implementer

- Keep the state, guardrail, and persistence layers independent from React.
- Do not let any agent invent outputs outside the candidate set that passed deterministic guardrails.
- Keep one final user-facing plan only; the debate stays internal.
- Do not overbuild analytics or dashboards before the core action list works.
- The Structurer Agent may help with messy input, but planning-critical extracted fields still need confirmation before trusted storage.
- If timeline becomes tight, keep the import parser simple and prefer pasted structured text over broad timetable-format support.
- The deterministic sublayer described in `decision-engine-spec-v0.1.md` should be treated as a guardrail and candidate-planning baseline, not as the sole final decider.
- The authoritative architecture for v1 decision-making is `agent-decision-architecture-spec-v0.1.md`.
- Approved lightweight UX features for this MVP direction include field confidence markers, missing-info prompts, retune hints, time-range switching, short judge rationale, and rare-event-feedback-driven replanning.

Plan complete and saved to `docs/superpowers/plans/2026-03-17-campus-energy-optimizer-mvp.md`. Ready to execute?