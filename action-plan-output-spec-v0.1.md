# Campus Energy Optimizer - Action Plan Output Spec v0.1

Status: design draft for the first user-facing output format.
Scope: output structure only, not algorithm details.

This document remains compatible with the newer multi-agent architecture.

In that architecture, the displayed plan is the single final plan selected by a judge agent from a bounded candidate set.

## 1. Document purpose

This document defines what the product should output after it has collected timetable data, user preferences, course details, and short-term modifiers.

The first version should not output a dashboard, a report pack, or multiple competing plans.

It should output one executable action plan.

## 2. Core output principle

The product should behave like a decision terminal, not an analytics console.

The user should be able to open the result and immediately answer one practical question:

- what should I do for this class occurrence?

That means the default user-facing output is:

- one action plan,
- broken into per-session action items,
- each action item giving one recommended attendance status.

## 3. Output philosophy

### 3.1 Only one primary plan

The first version should output a single recommended plan.

It should not default to showing multiple parallel plans such as:

- safe plan,
- balanced plan,
- aggressive plan.

Those alternative directions may exist only as post-output adjustment controls.

In the newer agent architecture, this single recommended plan is still the only primary output even if several internal candidate plans were debated first.

### 3.2 Internal reasoning still exists

Even though the front end shows only one plan, the system must still internally evaluate:

- risk,
- usable free-time gain,
- money cost,
- commute cost,
- academic constraint pressure.

Those values drive the final recommendation, but they are not the default surface.

### 3.3 Default decision bias

The first version should encode a strong default bias toward freeing class time.

In practical terms, the system's initial stance is:

- this class occurrence is skippable unless meaningful constraints say otherwise.

This default bias must be weakened or overridden by:

- hard recorded-absence limits,
- key-session rules,
- semester-phase rules,
- information insufficiency,
- clearly elevated attendance risk,
- or the user's conservative settings.

## 4. Output object structure

The output should be organized in two layers:

1. a plan-level wrapper,
2. a list of action-plan items.

## 5. Plan-level wrapper

This object represents the single generated plan.

### 5.1 Required top-level fields

#### `plan_id`

Unique identifier for this generated plan.

Purpose:

- allows saving,
- comparison after later regeneration,
- user feedback tracking.

#### `planning_window`

Describes what time range the plan covers.

Examples:

- one week,
- current semester phase,
- custom short-term adjustment window.

The user-facing product should support switching the plan view across at least:

- `today`
- `this_week`
- `current_phase`

Suggested support field:

- `available_time_views`

#### `strategy_snapshot`

Minimal summary of the settings that produced this plan.

This is not a full report. It only helps the product know what this plan represents.

Suggested contents:

- strategy tier,
- risk tier,
- current semester phase,
- active short-term modifiers.

#### `judge_short_rationale`

Very short final rationale from the judge layer.

Purpose:

- gives the user a minimal explanation for why this final plan was chosen,
- without expanding into a full report.

#### `plan_items`

The ordered list of action items.

This is the main content the user acts on.

#### `tuning_controls`

Available post-generation adjustment directions.

The first version should support at least:

- `more_conservative`
- `more_aggressive`

These are not separate plans shown upfront.

They are ways to regenerate the current plan with slightly shifted decision pressure.

Each control should also support a short hint explaining what will likely change if the user chooses it.

Suggested shape:

- `tuning_controls.more_conservative.hint`
- `tuning_controls.more_aggressive.hint`

## 6. Action-plan item

This is the core unit of the output.

Each item corresponds to one course occurrence in a specific time slot.

### 6.1 Required user-facing fields

#### `plan_item_id`

Identifier for this action item.

Purpose:

- allows editing,
- feedback,
- later user confirmation,
- or local override.

#### `course_id`

Reference to the course this action applies to.

The front end may additionally display course name, but the stable reference should be `course_id`.

#### `date`

The calendar date of this class occurrence.

#### `time_slot`

The scheduled class time for this occurrence.

This can be represented as:

- a class-period label,
- a concrete start-end time,
- or both.

#### `attendance_status`

The single most important field.

This tells the user what to do.

Recommended first-version values:

- `skip`
- `substitute_attendance`
- `arrive_then_leave_early`
- `attend_full`

Definitions:

- `skip`: do not physically attend and do not use a substitute.
- `substitute_attendance`: use paid substitute attendance instead of attending.
- `arrive_then_leave_early`: appear, satisfy the likely attendance requirement, then leave.
- `attend_full`: attend the class normally from start to end.

#### `execution_note`

Short plain-language instruction for the user.

This is the main explanation surface.

Examples:

- "Low usual risk. You can skip this one."
- "Likely risky only when class size is small; if you go, you can leave early."
- "Pre-final key session. Attend full."

#### `event_feedback_allowed`

Optional flag showing that the user may submit feedback if an unusual event happened during this occurrence.

Purpose:

- supports rapid correction of future plans after rare real-world events.

### 6.2 Required execution-support fields

These fields are not abstract analytics. They help the user execute the decision.

#### `must_attend_reason`

Optional field used when the system forces or strongly prefers attendance.

Examples:

- first session,
- pre-final session,
- teacher-announced important class,
- current absence pressure too high.

#### `estimated_commute_time_cost`

How much time the user is expected to spend getting there and back if attendance happens.

This matters because attending is not just class time. It also consumes travel time.

#### `estimated_substitute_cost`

Expected money cost if `attendance_status = substitute_attendance`.

#### `leave_early_note`

Optional field only relevant when `attendance_status = arrive_then_leave_early`.

It can include practical guidance such as:

- leave after sign-in,
- leave after the first attendance checkpoint,
- avoid leaving if class size is unusually small.

## 7. Optional user-facing fields

These are useful, but the first version can omit them from the minimal display if the UI needs to stay lean.

### `course_name_display`

Human-readable course name for display.

### `location_display`

Human-readable location if it helps execution.

### `teacher_name_display`

Optional display field if it helps distinguish two similar courses.

### `phase_context_note`

Very short note when the semester phase materially affected this decision.

Example:

- "Midterm tightening phase"

### `short_term_override_note`

Very short note when weather or a temporary event changed the default recommendation.

Example:

- "Adjusted for heavy rain this week"

## 8. Internal-only decision fields

These fields should exist for planning logic and regeneration, but should not be default output on the main screen.

### `risk_level`

Coarse internal or semi-internal risk label for this specific action.

Suggested values:

- `low`
- `medium`
- `high`

### `time_value_score`

Internal estimate of how much valuable free time this action creates.

This should reflect not only raw minutes, but also whether the freed time connects into a meaningful block.

### `money_cost_score`

Internal estimate of money cost pressure.

Mostly relevant for substitute attendance.

### `decision_confidence`

How confident the system is that the recommendation is reliable given the available data.

This matters when course information is incomplete.

Low confidence should pair naturally with a short missing-info prompt rather than staying hidden as an internal score only.

### `missing_info_summary`

Internal or semi-internal short summary of what important information is still missing for this plan or action item.

### `constraint_hits`

Which important constraints or rules shaped the decision.

Examples:

- near fail threshold,
- key-session rule,
- final-period rule,
- insufficient course info.

### `recorded_absence_impact`

Expected effect on the user's recorded-absence situation if this recommendation is followed.

### `selected_candidate_id`

Internal reference to the candidate plan chosen by the judge layer.

### `judge_summary`

Internal or semi-internal short summary of why the selected candidate beat the other feasible candidates.

### `debate_summary`

Optional internal compression of the debate-layer objections and support points.

### `rare_event_replan_note`

Internal note recording whether a rare event feedback item has temporarily shifted caution for later occurrences.

## 9. Action-state decision logic

The product should think through attendance status in a simple decision sequence.

### 9.1 First question: does the plan require attendance?

If no, the result becomes:

- `skip`

### 9.2 If attendance is preferred or required, ask what attendance form is best

The next possible forms are:

- `substitute_attendance`
- `arrive_then_leave_early`
- `attend_full`

This matches the user's intended practical flow:

1. can I avoid going entirely?
2. if not, can I use substitute attendance?
3. if not, can I go and leave early?
4. if not, attend the full class.

## 10. How default skip bias should work

The first version should give `skip` a strong default prior weight.

Reason:

- many classes are not checked often,
- many random checks are low probability,
- and the product's purpose is to free time, not to rationalize default attendance.

However, this must not become blind skipping.

The default skip bias should be weakened by:

- exploration-phase uncertainty,
- key-session flags,
- strong absence penalties,
- elevated fail risk,
- rising recorded-absence count,
- high execution awkwardness for the user,
- or poor substitute options.

## 11. Adjustment after plan generation

The user asked for post-output tuning rather than multiple plans shown at once.

The first version should therefore support two simple adjustment directions.

### 11.1 `more_conservative`

This should regenerate the current plan with more attendance-preserving pressure.

Typical effects:

- some `skip` items become `arrive_then_leave_early` or `attend_full`,
- substitute attendance is used less when uncertain,
- weak-information classes become more cautious.

Suggested hint style:

- "Expect more attendance on borderline classes."

### 11.2 `more_aggressive`

This should regenerate the current plan with stronger free-time priority.

Typical effects:

- some `attend_full` items become `arrive_then_leave_early` or `skip`,
- substitute attendance may be used more often,
- time-value-heavy classes get cut more aggressively.

Suggested hint style:

- "Expect more free time, especially from borderline classes."

## 12. Minimal display version

If the front end needs to stay extremely simple, the user-visible table can be reduced to:

- `date`
- `time_slot`
- `course_name_display`
- `attendance_status`
- `execution_note`

The first version may still place a single short judge rationale above the table without turning the page into a report.

If confidence is low because key information is missing, the page may also surface one short missing-info prompt above the table.

This is enough to function as a direct action list.

## 13. Expanded display version

If the product later needs slightly richer usability, it can additionally show:

- `estimated_substitute_cost`
- `estimated_commute_time_cost`
- `must_attend_reason`
- `phase_context_note`

Even this expanded display should still feel like one action plan, not a risk report.

## 14. Data-shape sketch

```text
ActionPlanOutput
- plan_id
- planning_window
- available_time_views?
- strategy_snapshot
- judge_short_rationale?
- tuning_controls
  - more_conservative
    - hint?
  - more_aggressive
    - hint?
- selected_candidate_id?      // internal or semi-internal
- judge_summary?              // internal or semi-internal
- debate_summary?             // internal
- missing_info_prompt?        // user-facing when plan quality is materially lowered
- plan_items[]
  - plan_item_id
  - course_id
  - date
  - time_slot
  - attendance_status
  - execution_note
  - event_feedback_allowed?
  - must_attend_reason?
  - estimated_commute_time_cost?
  - estimated_substitute_cost?
  - leave_early_note?
  - course_name_display?
  - location_display?
  - teacher_name_display?
  - phase_context_note?
  - short_term_override_note?
  - risk_level?               // internal or semi-internal
  - time_value_score?         // internal
  - money_cost_score?         // internal
  - decision_confidence?      // internal
  - missing_info_summary?     // internal or semi-internal
  - constraint_hits[]?        // internal
  - recorded_absence_impact?  // internal
  - rare_event_replan_note?   // internal
```

## 15. Current conclusion

The first output of this product should not be a report.

It should be a single executable action list where every class occurrence resolves to one attendance status.

Internal evaluation still matters, but the user-facing experience should stay simple:

- when to go,
- when not to go,
- when to substitute,
- when to go and leave early.
