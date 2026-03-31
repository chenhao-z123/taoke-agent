# Campus Energy Optimizer - Deterministic Guardrail And Candidate Planning Spec v0.1

Status: design draft for the deterministic sublayer inside the broader agent decision architecture.
Scope: guardrails, feasibility checks, and candidate-planning baseline only, not the full multi-agent final decision process.

## 1. Document purpose

This document defines the deterministic sublayer used by the broader agent architecture.

The input spec answers:

- what the system knows.

The output spec answers:

- what the system shows.

The agent decision architecture answers how the full system debates and judges among candidates.

This document answers the narrower question:

- what remains deterministic before the debate and judge layers begin.

## 2. Core role of the deterministic sublayer

This sublayer is the rule layer that evaluates each course occurrence, enforces hard constraints, and prepares feasible action and candidate-plan space for the multi-agent architecture.

Its job is not to explain the plan in natural language.

Its job is to:

- respect hard academic limits,
- apply user strategy and preferences,
- filter impossible attendance actions,
- estimate structured pressures,
- and feed the candidate planner with bounded, policy-safe decision material.

## 3. Decision objective

The first version should optimize in this order:

1. do not break hard constraints,
2. stay above the user's acceptable academic line,
3. maximize usable free time,
4. reduce unnecessary money and commute cost,
5. prefer actions the user is actually willing to execute.

This is not the full final decider in the new architecture.

It is the constrained baseline that protects boundaries before agentic debate begins.

### 3.1 Planning modes

The decision engine must support both planning modes already defined in the input model.

#### `safe_max_mode`

This is the default mode.

Behavior:

- maximize usable free time as much as possible while staying inside the current safety boundaries.

In this mode, the engine keeps selecting the most acceptable free-time-preserving actions until the practical safety margin becomes too weak.

#### `target_free_time_mode`

This mode is user-directed.

Behavior:

- try to reach the user's requested amount of freed class time or usable free time,
- but still refuse actions that violate hard constraints.

In this mode, the engine should not keep freeing time without limit.

Instead, once the target is sufficiently reached, the engine should stop pushing for extra aggressive cuts and may leave borderline classes untouched.

### 3.2 Mode effect on decision behavior

The same action rules apply in both modes.

What changes is the stopping condition:

- in `safe_max_mode`, stop when further free-time gain is no longer acceptably safe,
- in `target_free_time_mode`, stop when the requested free-time target is reached or no acceptable path remains.

### 3.3 Plan-level accumulation rule

Even though the engine evaluates one course occurrence at a time, the final plan is still assembled at plan level.

That means the engine must keep a running view of:

- total freed class sessions,
- total freed time,
- and total usable free time gained so far.

This running view matters mainly for `target_free_time_mode`.

In that mode, once the requested target is sufficiently reached, the engine should stop converting additional borderline occurrences into more aggressive actions.

Instead, remaining borderline occurrences may be left in their safer state.

In `safe_max_mode`, this running view is still useful, but it does not create an early stop by itself.

## 4. Core assumptions

### 4.1 Recorded absence is what matters

If an absence is not discovered, it should not count as an effective recorded absence.

So the engine should reason mainly about:

- probability of recorded absence,
- impact of recorded absence,
- and constraint pressure created by recorded absence.

### 4.2 Skip is the default prior

The engine should begin with a strong default prior toward `skip`.

This means the initial question is not:

- why should this class be skipped?

It is:

- is there a strong enough reason not to skip this class?

### 4.3 Default prior is not permission to ignore constraints

The skip prior must be weakened or overridden by:

- hard thresholds,
- key-session rules,
- semester-phase rules,
- insufficient information,
- user conservatism,
- user execution pressure,
- and rising academic downside.

## 5. Planning unit

The decision engine should evaluate one course occurrence at a time.

A course occurrence is defined by:

- course id,
- date,
- time slot,
- current semester phase,
- current short-term modifiers.

The engine then assigns exactly one final action state to that occurrence.

## 6. Available action states

The first version should compare these four action states:

- `skip`
- `substitute_attendance`
- `arrive_then_leave_early`
- `attend_full`

These are ordered from most free-time preserving to least free-time preserving.

## 7. Required decision stages

The engine should follow a fixed stage order.

## 7.1 Stage A - Build decision context

For the current class occurrence, collect all relevant context from four layers:

- timetable facts,
- user global profile,
- course-specific facts,
- short-term modifiers.

At the end of this stage, the engine should know:

- which course occurrence is being evaluated,
- what semester phase is active,
- what the user's strategy tier is,
- what substitute options are possible,
- and what major course-specific constraints exist.

## 7.2 Stage B - Check hard blockers

Before comparing action states, the engine must test whether the occurrence is blocked from aggressive treatment.

Examples of strong blockers:

- fail-threshold pressure is too high,
- recorded-absence limit is near,
- this is a must-attend key session,
- this is a first-session exploration class,
- this is a pre-final mandatory class,
- known course rules leave no realistic safe alternative.

If a blocker fully removes flexibility, the engine may immediately force:

- `attend_full`

or, if allowed and lower-risk:

- `substitute_attendance`

## 7.3 Stage C - Estimate occurrence pressure

If the class is not fully locked by a hard blocker, estimate four pressures for this occurrence.

### Academic pressure

How dangerous it is to reduce attendance for this course now.

Main drivers:

- course target level,
- personal fail risk,
- current recorded-absence pressure,
- score loss per recorded absence,
- semester phase.

### Attendance-catch pressure

How likely the occurrence is to produce a recorded absence if the user does not attend fully.

Main drivers:

- attendance mode,
- full-roll-call frequency,
- random-check frequency,
- small-class risk,
- known key-session status,
- information quality.

### Free-time value pressure

How valuable it is to remove or shorten this class occurrence.

Main drivers:

- whether it creates a meaningful free-time block,
- whether it helps avoid early classes or late classes,
- weekday preference,
- purpose-based preference,
- short-term events or weather.

### Execution-cost pressure

How costly or awkward the action is to execute.

Main drivers:

- commute time,
- substitute attendance cost,
- execution pressure,
- classroom escape feasibility,
- sign-in-and-leave feasibility.

## 7.4 Stage D - Filter impossible actions

Before ranking actions, remove any action that is not realistically available.

Examples:

- remove `substitute_attendance` if the user disabled it or the course cannot use it,
- remove `arrive_then_leave_early` if the course does not allow it,
- remove `skip` if this session is effectively mandatory,
- remove actions that violate explicit attendance requirements.

After this stage, only feasible actions remain.

## 7.5 Stage E - Compare remaining actions

The engine should compare the remaining action states using one consistent rule:

- prefer the action that preserves the most usable free time while staying acceptable on academic, catch, and execution pressure.

This means the engine should not simply choose the lowest-risk action.

It should choose the most free-time-efficient action that still stays inside the user's acceptable boundary.

## 7.6 Stage F - Finalize bounded action material

Finalize bounded action material for downstream candidate planning.

This includes:

- feasible action set,
- preferred deterministic baseline action,
- must-attend reasons if any,
- commute or substitute cost if relevant,
- and structured pressure outputs.

The first version must still use a fixed action-selection order for deterministic baseline evaluation rather than an open-ended internal ranking.

That order is:

1. test whether `skip` is acceptable,
2. if not, test whether `substitute_attendance` is acceptable,
3. if not, test whether `arrive_then_leave_early` is acceptable,
4. otherwise choose `attend_full`.

This order is binding for the deterministic baseline and should match the output-layer action philosophy.

## 8. Action-comparison logic

The comparison logic should be simple and directional.

It should not be treated as an unconstrained ranking problem in v0.1.

Instead, the deterministic baseline should evaluate actions in the fixed selection order above.

## 8.1 `skip`

`skip` should win by default when:

- academic pressure is low,
- catch pressure is low or acceptable,
- no key-session rule blocks it,
- and the free-time gain is meaningful enough.

`skip` should lose when:

- there is strong attendance pressure,
- or information quality is too weak to justify a confident skip recommendation.

If `skip` loses, the engine moves to `substitute_attendance` rather than comparing all actions at once.

## 8.2 `substitute_attendance`

`substitute_attendance` should be preferred over direct attendance when:

- attendance or presence likely matters,
- the user allows substitute attendance,
- money cost is acceptable,
- and it clearly dominates attending in person.

It should be less attractive when:

- substitute cost is too high,
- confidence is weak,
- or the class requires the user's real participation.

If `substitute_attendance` loses, the engine moves to `arrive_then_leave_early`.

## 8.3 `arrive_then_leave_early`

`arrive_then_leave_early` should be preferred when:

- full absence is too risky,
- full attendance is unnecessary,
- and the course has a realistic early-leave window.

This state is especially useful as a middle action between:

- `skip`
- and `attend_full`

If `arrive_then_leave_early` loses, the engine falls through to `attend_full`.

## 8.4 `attend_full`

`attend_full` should win when:

- hard constraints are close,
- the occurrence is clearly important,
- the user's academic line is under pressure,
- or all freer actions are too risky or too uncertain.

## 9. Handling incomplete information

The first version should not assume unknown means safe.

If key information is missing, the engine should reduce aggressiveness.

Missing information can weaken `skip` by:

- increasing catch pressure uncertainty,
- increasing academic pressure uncertainty,
- or lowering decision confidence.

This does not mean every unknown class becomes `attend_full`.

It means the engine should become less willing to recommend the most aggressive action without evidence.

## 10. Semester-phase effects

Semester phase must directly shift decision pressure.

### 10.1 Exploration phase

Bias toward attendance is stronger.

Reasons:

- information is incomplete,
- first-session rules matter,
- the system needs observations.

### 10.2 Normal release phase

Skip bias can operate more strongly.

This is the phase where the system most actively converts low-value attendance into free time.

### 10.3 Midterm tightening phase

Academic pressure rises.

The engine should be less willing to spend buffer carelessly.

### 10.4 Post-midterm release phase

Skip bias can strengthen again if the course remains under control.

### 10.5 Final tightening phase

The engine should heavily discount aggressive actions for important or sensitive sessions.

## 11. Short-term modifier effects

Short-term modifiers should not replace the semester baseline.

They should locally tilt it.

Examples:

- bad weather can increase the free-time value of skipping,
- a temporary internship or event can raise the value of freeing certain days,
- illness or exhaustion can increase the cost of attending,
- upcoming deadlines can increase the value of recovering study time.

## 12. Conservative and aggressive tuning

The output spec already defines two post-generation tuning directions.

This document defines what they mean inside the decision engine.

### 12.1 `more_conservative`

This mode should do all of the following:

- reduce the strength of the default skip prior,
- increase the penalty for uncertainty,
- increase sensitivity to key-session rules,
- make `attend_full` beat `skip` in more borderline cases,
- make `substitute_attendance` less attractive when information is weak.

### 12.2 `more_aggressive`

This mode should do all of the following:

- strengthen the default skip prior,
- reduce the penalty for uncertainty,
- increase the reward for usable free-time blocks,
- make `skip` and `arrive_then_leave_early` win more borderline cases,
- allow substitute attendance to win more often when cost is acceptable.

## 13. Internal outputs of the deterministic sublayer

Before the candidate planner and debate layers operate, this sublayer should produce an internal decision record.

Suggested fields:

- chosen action state,
- feasible action states,
- deterministic baseline action,
- academic pressure estimate,
- catch pressure estimate,
- free-time value estimate,
- execution-cost estimate,
- decision confidence,
- constraint hits,
- minimal rationale tokens.

This internal record feeds the candidate planner and, later, the action-plan output spec.

## 14. Minimal pseudo-flow

The first version should conceptually behave like this inside the deterministic sublayer:

1. collect all context for one class occurrence,
2. check hard blockers,
3. estimate academic, catch, free-time, and execution pressures,
4. remove impossible actions,
5. test `skip`, then `substitute_attendance`, then `arrive_then_leave_early`, then fall through to `attend_full`,
6. choose one final action state,
7. update the running plan-level free-time totals,
8. apply the planning-mode stop condition if relevant,
9. emit the internal decision record,
10. hand it to the candidate planner.

## 15. Current conclusion

The deterministic sublayer should be simple in principle:

- start from a strong skip prior,
- let constraints and uncertainty push back,
- compare the four action states,
- and output bounded decision material for candidate-plan generation.

That is the deterministic guardrail layer inside the broader architecture described in `agent-decision-architecture-spec-v0.1.md`.
