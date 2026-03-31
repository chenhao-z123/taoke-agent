# Campus Energy Optimizer - Input Model Spec v0.1

Status: design draft focused on user goals and input structure.
Scope: no algorithm or implementation details yet.

## 1. Document purpose

This document defines the first structured input model for the project.

The goal is to answer four questions clearly:

1. What the user is actually trying to optimize.
2. What information must be collected before any planning can happen.
3. Which fields should be structured, which should stay flexible, and which should be inferred by LLM.
4. How semester-level rules, course-level differences, and short-term changes should fit together.

This project should not be framed as a generic timetable tool. It is a decision-support system for strategic time allocation under academic constraints.

## 2. Core product assumption

The product does not optimize for skipping classes for its own sake.

It optimizes for:

- preserving the user's chosen academic safety line,
- respecting explicit hard constraints such as recorded-absence limits,
- and maximizing usable free time within those boundaries.

Additional core assumption:

- an absence that is not discovered should be treated as no effective recorded absence.

This means the main tracked risk quantity is not hidden absence, but recorded absence.

## 3. Goal model

### 3.1 High-level objective

The real user objective is not a single number like "free up 10 class sessions".

It is a combination of:

- academic floor,
- risk tolerance,
- free-time preference,
- execution ability,
- and available substitute actions.

### 3.2 What the user is optimizing

The first version should treat the user's target as:

- keep outcomes above a chosen acceptable line,
- avoid exceeding acceptable recorded-absence risk,
- then maximize usable free time.

The product should explicitly support two planning modes:

- `target_free_time_mode`: user gives a desired amount of freed class time or a desired usable-free-time target,
- `safe_max_mode`: system estimates the maximum safe usable free time under the chosen boundaries.

The first version may default to `safe_max_mode`, but it should not erase the existence of `target_free_time_mode`.

If `planning_mode = target_free_time_mode`, the input model should also carry an explicit target field.

Suggested field:

- `free_time_target`

This field may be expressed as:

- a target number of class sessions to free,
- a target amount of freed time,
- or a target amount of usable free time.

Advanced risk settings may also include an optional probability-oriented expression such as:

- `caught_risk_tolerance_note`

This should remain optional in v0.1 because the user preferred simple front-end tiers first.

### 3.3 Grade philosophy

The system should not assume that more points are always better.

Default product assumption:

- points above the user's acceptable line do not create primary value,
- extra points only create buffer value against final-exam uncertainty.

This means score is handled as:

- target line value,
- plus optional safety buffer value.

## 4. Design principles for input collection

### 4.1 Questionnaire first, parameter sheet second

The user should not start with raw optimization parameters.

The product should begin with simple questionnaire-style selections and only expose detailed overrides later.

### 4.2 Structured where it matters, flexible where reality varies

Use structured fields for:

- strategy,
- risk,
- course class,
- attendance mechanism,
- frequency tiers,
- recorded-absence rules,
- semester phases,
- substitute action availability.

Use free input plus LLM extraction for:

- grading composition,
- attendance requirements,
- special-course explanations,
- irregular teacher behavior,
- edge cases that do not fit templates.

### 4.3 Support incomplete input

First version should not block users behind too many required fields.

Rule:

- most fields are strongly recommended,
- users may skip and return later,
- any structured field should allow an out-of-template manual supplement.

### 4.4 Layered decision model

The system should combine four layers:

1. imported timetable facts,
2. global user preferences,
3. course-level differences,
4. short-term overrides.

## 5. Input architecture overview

The first version should organize inputs into five blocks:

1. timetable import block,
2. user global profile block,
3. semester phase block,
4. course detail block,
5. short-term replanning block.

Each block is described below.

## 6. Field definition convention

To avoid mixing developer-facing identifiers and user-facing wording, documented fields should follow a three-part convention whenever the field is part of the real product surface:

- `id`: stable identifier for implementation and schema work,
- `name_for_usr`: short label shown to the user,
- `help_for_usr`: plain-language explanation of what the field means.

Example:

```text
id: personal_fail_risk
name_for_usr: For Me, How Easy Is It To Fail?
help_for_usr: Based on how much you are willing to study and how confident you feel, how likely is this course to go wrong for you?
```

This convention should be used for real user-facing fields and enumerations.

It should not be forced onto internal workflow state such as temporary extraction drafts.

For fields where user certainty materially affects planning quality, the product should also support a lightweight confidence marker.

Suggested convention:

- `field_confidence`

Suggested values:

- `high`
- `medium`
- `low`

### 6.1 Representative examples

```text
id: strategy_tier
name_for_usr: Strategy Style
help_for_usr: Choose how boldly you want the system to trade academic safety for free time.

id: course_class
name_for_usr: Course Type
help_for_usr: Mark whether this is a core course, a special-risk course, or an easy course.

id: course_target_level
name_for_usr: Score Goal For This Course
help_for_usr: Decide whether this course only needs a pass or whether it needs a high score.

id: personal_fail_risk
name_for_usr: For Me, How Easy Is It To Fail?
help_for_usr: Judge based on your own willingness to study and your confidence, not just the course itself.

id: sign_in_then_leave_feasibility
name_for_usr: Can I Sign In And Leave?
help_for_usr: If attendance can be recorded early, can you realistically leave without creating extra risk?
```

## 7. Timetable import block

### 7.1 Purpose

This block creates the base semester schedule and generates the list of courses the user will later enrich.

### 7.2 Input source

Preferred source:

- exported timetable data from the school's official system.

Manual editing after import must be supported.

### 7.3 Imported default fields

The first version should extract at least:

- `course_name`
- `time_slots`
- `location`
- `teacher_name`
- `week_range`
- `course_type_or_credit`

### 7.4 Storage granularity

Each course is recorded once per semester.

The first version should not require full session-by-session entry for all classes.

## 8. User global profile block

This block captures how the user thinks and what trade-offs the user is willing to make.

### 8.1 Main strategy tier

Field: `strategy_tier`

Recommended values:

- `safe`
- `balanced`
- `aggressive`

Meaning:

- `safe`: prioritize low exposure and low academic disturbance.
- `balanced`: accept limited cost or risk for moderate time gains.
- `aggressive`: protect only the chosen hard lines, then pursue maximum usable free time.

### 8.2 Risk preference

Fields:

- `risk_tier`
- `max_recorded_absences_override` (optional advanced field)
- `caught_risk_tolerance_note` (optional advanced field)

Front-facing behavior:

- the user chooses a simple tier first,
- advanced users may later specify a concrete maximum acceptable number of recorded absences.

### 8.3 Psychological execution pressure

Field: `execution_pressure`

Suggested values:

- `high`
- `medium`
- `low`

Interpretation:

- `high`: user wants time but feels strong pressure or guilt and avoids awkward actions.
- `medium`: user accepts normal tactics but avoids high-awkwardness moves.
- `low`: user is comfortable carrying out efficient but socially uncomfortable actions.

### 8.4 Buffer preference

Field: `score_buffer_preference`

Suggested values:

- `minimal`
- `some`
- `large`

Purpose:

- controls how much surplus score buffer the user wants beyond the minimum acceptable line.

### 8.5 Time-value preferences

The first version should support multiple simultaneous preference types.

Fields:

- `prefer_large_blocks` (bool)
- `prefer_skip_early_classes` (bool)
- `prefer_skip_late_classes` (bool)
- `preferred_weekdays` (optional list)
- `preferred_time_use_cases` (optional list)

Suggested use cases:

- study
- internship
- travel
- sleep
- gaming
- custom

### 8.6 Substitute action availability

This block defines which risk-mitigation tools the user is willing or able to use.

Fields:

- `substitute_attendance_enabled` (bool)
- `substitute_attendance_default_cost` (optional number or tier)
- `sign_in_then_leave_willingness` (bool)
- `retroactive_remedy_enabled` (bool, default false)

Notes:

- substitute attendance is globally available in principle but can vary by course,
- sign-in-and-leave must be modeled both as user willingness and course feasibility,
- retroactive leave / explanation should default to disabled because the user views it as difficult and non-routine.

## 9. Semester phase block

### 9.1 Purpose

The planning horizon should be semester-phase aware rather than weekly by default.

### 9.2 Default 16-week template

Suggested default:

- `weeks_1_2`: exploration
- `weeks_3_6`: normal_release
- `weeks_7_9`: midterm_tightening
- `weeks_10_14`: post_midterm_release
- `weeks_15_16`: final_tightening

### 9.3 Phase behavior defaults

Defaults discussed so far:

- first session of each course should be attended during exploration,
- exploration should gather attendance style, grading composition, exam information, and teacher behavior,
- classes near the final period should be treated more conservatively,
- the final sessions before exams should default to attended.

### 9.4 Editability

The system should ship with default phase rules but allow user modification.

Fields:

- `phase_template`
- `phase_rule_overrides`

## 10. Course detail block

This is the most important structured block in the whole model.

Each course should support both structured fields and manual explanation.

### 10.1 Course class

Field: `course_class`

Values:

- `core`
- `special`
- `easy`

Definitions:

- `core`: important course, but not automatically a high-score course for every user.
- `special`: not necessarily score-important, but risky, awkward, or otherwise not normal.
- `easy`: main source of usable free-time opportunity.

### 10.2 Special-course subtype

Special courses should support one extra lightweight structured field so the system can distinguish why they are special without creating a fourth top-level course class.

Field:

- `special_course_kind`

Suggested values:

- `lab_or_experiment`
- `physical_education`
- `strict_attendance`
- `awkward_teacher`
- `hard_to_escape`
- `easy_to_fail`
- `other_manual`

This field is most relevant when `course_class = special`.

It may be single-select or multi-select in implementation, but the first version should at least support identifying lab / experiment style courses explicitly.

### 10.3 Course target level

The first version should not force exact numeric target scores for every course.

Course class and academic target must remain separate.

Field:

- `course_target_level`

Suggested values:

- `pass_only`
- `high_score_needed`

Instead of binding target level to course class, course treatment should emerge from:

- course_target_level,
- course class,
- personal fail risk self-assessment,
- strategy tier,
- and score buffer preference.

### 10.4 Special-course explanation

Field: `special_reason_note`

Rule:

- if `course_class = special`, user explanation is required.

The subtype field should not replace the explanation note.

Instead:

- `special_course_kind` gives a lightweight structured reason,
- `special_reason_note` captures school- and teacher-specific detail.

This should not rely only on preset labels because school- and teacher-level variation is too large.

### 10.5 Personal fail-risk self-assessment

Field: `personal_fail_risk`

Values:

- `easy_to_fail`
- `possible_to_fail`
- `unlikely_to_fail`

Important note:

- this is not course difficulty,
- it is the user's own judgment based on willingness to study and self-knowledge.

### 10.6 Attendance mechanism

Field: `attendance_modes`

Supports multi-select.

Suggested built-in options:

- `full_roll_call_every_session`
- `random_student_check_every_session`
- `random_full_roll_call`
- `full_roll_call_when_class_small`
- `paper_sign_in_before_class`
- `location_based_sign_in`
- `qr_code_sign_in`
- `visual_or_verbal_confirmation`
- `unclear_or_irregular`
- `other_manual`

### 10.7 Attendance frequency tiers

Fields:

- `full_roll_call_frequency_tier`
- `random_check_frequency_tier`

Rule:

- front end uses simple tiers,
- backend maps tiers into probability-like parameters.

### 10.8 Recorded-absence rule block

This block should mix structured fields with notes.

Minimum structured fields:

- `max_recorded_absences`
- `fail_threshold_absences`
- `score_loss_per_recorded_absence`
- `has_mandatory_sessions`

Flexible support fields:

- `absence_rule_note`
- `absence_rule_confidence`

Low-probability attendance events should also be supported as later updates to course intelligence.

Suggested field family:

- `rare_event_feedback[]`

Examples:

- `rare_full_roll_call`
- `rare_random_check`
- `unexpected_sign_in`
- `teacher_became_stricter`
- `other_manual`

These events should be treated as new evidence that can trigger replanning, not as permanent truth by default.

### 10.9 Grading composition input

The first version should treat grading composition as structured-first, with optional LLM help.

Field family:

- `grading_components`
- `grading_raw_note`

Workflow:

1. user may enter structured grading composition directly,
2. user may also paste raw description text if the scheme is messy,
3. system may assist by extracting or normalizing that raw note,
4. user confirms the final structured result.

Suggested structured subfields may include:

- final exam weight,
- midterm weight,
- attendance weight,
- assignments weight,
- participation weight,
- practical component weight,
- other custom weights.

Absence rules must remain a separate block and should not be merged into grading composition.

### 10.9 Attendance requirement input

The first version should keep this lightweight.

Field family:

- `attendance_requirement_raw_input`
- `attendance_requirement_structured_summary`

Workflow matches grading composition:

1. user describes attendance requirements freely,
2. system extracts structured points,
3. user confirms.

### 10.10 Sign-in-and-leave feasibility

Field: `sign_in_then_leave_feasibility`

Values can be simple:

- `no`
- `maybe`
- `yes`

This should be course-level, not global.

### 10.11 Classroom escape feasibility

This should be modeled as both a tier and a tag set.

Fields:

- `escape_feasibility_tier`
- `escape_environment_tags`
- `escape_environment_note`

Suggested tier values:

- `easy`
- `medium`
- `hard`

Suggested tags:

- `fixed_seating`
- `no_rear_route`
- `awkward_exit_path`
- `teacher_has_wide_line_of_sight`
- `small_classroom`
- `stairs_or_back_rows_available`
- `custom`

### 10.12 Substitute attendance override

Fields:

- `substitute_attendance_allowed_for_course` (optional bool)
- `substitute_attendance_cost_override` (optional)
- `substitute_attendance_note`

Rule:

- global default exists,
- course can override availability or cost.

### 10.13 Key-session handling inside each course

This should stay inside the course detail block rather than live as a separate top-level block.

Field:

- `key_session_types`

Supports multi-select.

Suggested values:

- `first_session`
- `midterm_related_session`
- `pre_final_session`
- `teacher_announced_important_session`
- `small_class_high_risk_session`
- `exam_hint_or_material_session`
- `assignment_check_session`
- `quiz_presentation_or_high_signin_session`
- `other_manual`

### 10.14 Course notes

Field: `course_notes`

This is the exception sink.

It should be able to hold:

- teacher quirks,
- unofficial student information,
- unusual substitute-attendance details,
- social exposure risks,
- stage-specific changes,
- exam-information clues,
- time-value context,
- anything not captured structurally.

## 11. Short-term replanning block

### 11.1 Purpose

Semester defaults are not enough.

The system should support near-term overrides for weekly reality changes.

### 11.2 Supported short-term inputs

Fields may include:

- `weather_modifier`
- `temporary_goal_shift`
- `upcoming_events`
- `body_state`

Examples:

- rain,
- heat,
- interview,
- trip,
- contest,
- deadline cluster,
- exam week,
- exhaustion,
- illness,
- broken sleep schedule.

Weather-like modifiers should allow directional interpretation, for example:

- rain increases skip willingness,
- extreme heat increases skip willingness,
- comfortable weather may decrease the desire to skip.

### 11.3 Role in planning

These inputs should not rewrite semester data.

They should act as temporary modifiers over the current planning window.

The product should also support event-driven replanning when the user reports an unusual low-probability event in a specific course occurrence.

Example:

- a course that rarely uses full roll call suddenly performs full roll call once.

This kind of event should temporarily increase caution for later occurrences without automatically turning the course into a permanently high-risk course.

## 12. Time-value modeling

### 12.1 Objective

Not all free time is equally valuable.

The system should distinguish:

- isolated single-slot gains,
- half-day gains,
- full-day gains.

### 12.2 Input model

This should stay lightweight in v0.1.

Fields:

- `time_value_adjustment_note`
- `preferred_weekdays`
- `preferred_time_use_cases`

System role:

- compute schedule connectivity from imported timetable.

User role:

- flag when a mathematically large block has low real-world value,
- or when a smaller block has unusually high personal value.

### 12.3 Additional user preference layers

The time-value layer should allow:

- weekday preferences,
- use-case preferences,
- early-class avoidance,
- late-class avoidance.

The action-plan surface should support switching among at least three time scopes:

- today,
- this week,
- current phase.

## 13. LLM responsibility model

The first version should use LLM much more aggressively than a simple translator-only tool, but it still should not replace hard-constraint logic.

It should do these jobs:

### 13.1 Translation

- convert flexible user text into structured candidate fields.

LLM-generated candidates should not be treated as final saved fields until the user confirms them where the field affects planning quality.

### 13.2 Clarification

- detect contradictions,
- identify missing critical information,
- ask follow-up questions only where necessary.

### 13.3 Adjustment

- adapt recommendations according to semester phase,
- adapt recommendations according to short-term context,
- personalize defaults from minimal inputs.

### 13.4 Candidate generation and debate support

- help generate candidate plans inside the feasible region,
- evaluate tradeoffs among multiple feasible candidates,
- support role-based debate over acceptable plans,
- and assist a final judge agent in choosing one plan.

### 13.5 Explanation

- explain why a recommendation exists,
- explain what assumptions were made,
- explain what fields most influenced the result.

The judge layer should provide a very short final rationale for the chosen plan rather than a long report by default.

### 13.6 Confirmation boundary

Planning-critical extracted fields should still require confirmation before they become trusted state.

Examples include:

- absence rules,
- grading composition,
- key-session tags,
- and important attendance requirements.

## 14. Input flow recommendation

The recommended first-version interaction flow is:

1. import timetable,
2. fill user global questionnaire,
3. complete course-by-course differences,
4. optionally add short-term modifiers,
5. confirm extracted structured fields from free text.

This flow is preferable because:

- the user sees concrete courses before answering strategy questions,
- the questionnaire stays light,
- and detailed input is only requested where course differences matter.

## 15. Minimum field set for a first usable recommendation

The first version should define a minimum decision set so the product can still return a rough recommendation before every detail is complete.

Minimum recommended set:

- strategy tier,
- risk tier,
- execution pressure,
- course class,
- course target level,
- personal fail risk,
- attendance mechanism,
- frequency tier,
- fail threshold or maximum recorded absences.

Without this minimum set, the product may still store data, but recommendation confidence should be visibly downgraded.

That confidence downgrade should be surfaced to the user through missing-info prompts rather than hidden completely.

## 16. What should be strongly recommended but not hard-required

For first use, these should be strongly recommended:

- course class,
- course target level,
- personal fail-risk self-assessment,
- attendance mechanism,
- frequency tiers,
- recorded-absence rules,
- grading composition,
- attendance requirements,
- key-session notes.

But the first version should still allow incomplete data entry and later revision.

If important fields are missing, the product should explicitly tell the user which missing information is lowering plan quality.

### 16.1 Exploration-phase priority facts

During the first 1-2 weeks, the system should prioritize collecting these facts first:

- attendance mechanism,
- roll-call frequency,
- fail line or maximum recorded absences,
- grading composition,
- exam-information clues,
- teacher behavior only when it changes attendance risk in concrete ways.

## 17. Data-shape sketch

This section is not final schema design. It is only a structural sketch.

```text
SemesterPlanInput
- timetable_import
  - courses[]
    - course_name
    - time_slots
    - location
    - teacher_name
    - week_range
    - course_type_or_credit
- user_profile
  - planning_mode
  - free_time_target?
  - strategy_tier
  - risk_tier
  - max_recorded_absences_override?
  - caught_risk_tolerance_note?
  - execution_pressure
  - score_buffer_preference
  - prefer_large_blocks
  - prefer_skip_early_classes
  - prefer_skip_late_classes
  - preferred_weekdays[]?
  - preferred_time_use_cases[]?
  - substitute_attendance_enabled
  - substitute_attendance_default_cost?
  - sign_in_then_leave_willingness
  - retroactive_remedy_enabled
- semester_phase_config
  - phase_template
  - phase_rule_overrides?
- course_details[]
  - course_name_ref
  - course_class
  - field_confidence?
  - special_course_kind?
  - course_target_level
  - special_reason_note?
  - personal_fail_risk
  - attendance_modes[]
  - full_roll_call_frequency_tier?
  - random_check_frequency_tier?
  - max_recorded_absences?
  - fail_threshold_absences?
  - score_loss_per_recorded_absence?
  - has_mandatory_sessions?
  - absence_rule_note?
  - grading_components?
  - grading_raw_note?
  - attendance_requirement_raw_input?
  - attendance_requirement_structured_summary?
  - sign_in_then_leave_feasibility?
  - escape_feasibility_tier?
  - escape_environment_tags[]?
  - escape_environment_note?
  - substitute_attendance_allowed_for_course?
  - substitute_attendance_cost_override?
  - substitute_attendance_note?
  - key_session_types[]?
  - rare_event_feedback[]?
  - course_notes?
- short_term_modifiers?
  - weather_modifier?
  - temporary_goal_shift?
  - upcoming_events[]?
  - body_state?

UX support:
- missing_info_prompt?
- recommended_time_view?
```

## 18. Open design questions remaining

The input direction is now stable enough to draft product docs, but these questions still need later refinement:

- how exactly strategy tier maps into numerical planning parameters,
- how frequency tiers should map to backend probability values,
- how score buffer interacts with personal fail-risk,
- how key-session rules should affect course-level versus session-level planning,
- how much the short-term replanning block should influence the semester baseline,
- whether later versions should support teacher-data enrichment from external public information.

## 19. Current conclusion

The first version should be built around one central product truth:

- users do not want to manage raw optimization variables,
- they want to describe their boundaries, habits, and course realities in a low-friction way,
- and let the system translate that into a personalized planning model.

Therefore, the right input architecture is:

- import first,
- questionnaire second,
- course enrichment third,
- short-term override last,
- with LLM acting as structurer, candidate generator, debate participant, and judge support inside a guarded architecture rather than as an unconstrained final decider.
