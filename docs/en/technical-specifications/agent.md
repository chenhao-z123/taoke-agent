# Campus Energy Optimizer - Technical Specification

## Architecture Overview

This document consolidates the complete technical architecture of the Campus Energy Optimizer project, combining input model, decision architecture, deterministic guardrails, and output specifications into a unified reference.

### Core Design Philosophy

The system implements a **Guarded Multi-Agent Planning System** that balances structured constraints with agentic decision-making:

- **Deterministic boundaries**: Hard constraints, feasible action space, and output structure remain strictly controlled
- **Agentic final choice**: Multi-agent debate and judge-based selection within bounded candidate space
- **Single executable output**: One actionable plan presented to users, not multiple competing options

### System Architecture Layers

#### Layer 1: State and Memory Layer
- Stores structured world model including imported timetable facts, user profiles, semester phases, course details, short-term modifiers
- Maintains field-level confidence markers and rare-event feedback history
- Remains structured and non-agentic

#### Layer 2: Guardrail and Feasibility Layer  
- Enforces hard constraints (recorded-absence limits, must-attend sessions, impossible actions)
- Applies user strategy and preferences to filter feasible actions
- Reduces candidate space to policy-safe options
- Remains deterministic and rule-based

#### Layer 3: Candidate Planner Layer
- Generates 3-5 feasible candidate plans within guardrail boundaries
- Supports both `safe_max_mode` (maximize usable free time) and `target_free_time_mode` (reach user target)
- Creates candidates with different characteristics: time-priority, balanced, execution-friendly

#### Layer 4: Debate Agent Layer
- **Academic Guardian**: Represents academic safety and red-line caution
- **Time Maximizer**: Represents free-time gain aligned with user strategy  
- **Execution Realist**: Represents practical livability and execution feasibility
- Agents evaluate candidates from their role perspective and provide structured critiques

#### Layer 5: Judge Layer
- Selects one final plan from the debated candidate set
- Produces concise rationale and user-facing execution notes
- Cannot invent plans outside the candidate set that passed guardrails

## Input Model Specification

### User Goal Model
The system optimizes for:
1. Preserving user's chosen academic safety line
2. Respecting explicit hard constraints (recorded-absence limits)  
3. Maximizing usable free time within those boundaries

### Input Architecture Blocks

#### Timetable Import Block
- Extracts: course_name, time_slots, location, teacher_name, week_range, course_type_or_credit
- Supports manual editing after import
- Creates base semester schedule for course enrichment

#### User Global Profile Block
- **Strategy Tier**: safe | balanced | aggressive
- **Risk Preference**: risk_tier with optional max_recorded_absences_override
- **Execution Pressure**: high | medium | low (comfort with socially awkward actions)
- **Buffer Preference**: minimal | some | large (surplus score buffer beyond minimum)
- **Time-Value Preferences**: prefer_large_blocks, prefer_skip_early_classes, preferred_weekdays, preferred_time_use_cases
- **Substitute Actions**: substitute_attendance_enabled, sign_in_then_leave_willingness

#### Semester Phase Block
- Default 16-week template: exploration (weeks 1-2), normal_release (3-6), midterm_tightening (7-9), post_midterm_release (10-14), final_tightening (15-16)
- Configurable phase rules and overrides
- Phase behavior affects decision pressure dynamically

#### Course Detail Block
- **Course Class**: core | special | easy
- **Special Course Kind**: lab_or_experiment, physical_education, strict_attendance, awkward_teacher, hard_to_escape, easy_to_fail
- **Target Level**: pass_only | high_score_needed  
- **Personal Fail Risk**: easy_to_fail | possible_to_fail | unlikely_to_fail
- **Attendance Mechanisms**: Multi-select from full_roll_call_every_session, random_student_check_every_session, etc.
- **Recorded-Absence Rules**: max_recorded_absences, fail_threshold_absences, score_loss_per_recorded_absence, has_mandatory_sessions
- **Key Session Types**: first_session, pre_final_session, teacher_announced_important_session, small_class_high_risk_session
- **Escape Feasibility**: escape_feasibility_tier + escape_environment_tags (fixed_seating, no_rear_route, etc.)

#### Short-Term Replanning Block
- Weather modifiers, temporary goal shifts, upcoming events, body state
- Temporary overrides that don't rewrite semester data
- Support for rare-event feedback triggering bounded replanning

## Decision Engine Specification

### Deterministic Guardrail Sublayer

The guardrail layer enforces hard constraints before any agentic processing:

#### Decision Objective Priority
1. Do not break hard constraints
2. Stay above user's acceptable academic line  
3. Maximize usable free time
4. Reduce unnecessary money and commute cost
5. Prefer actions user is actually willing to execute

#### Available Action States (ordered by free-time preservation)
- `skip`: Do not attend, no substitute
- `substitute_attendance`: Use paid substitute instead of attending  
- `arrive_then_leave_early`: Appear for attendance requirement, then leave
- `attend_full`: Attend normally from start to end

#### Required Decision Stages
1. **Build decision context**: Collect timetable facts, user profile, course specifics, short-term modifiers
2. **Check hard blockers**: Fail-threshold pressure, recorded-absence limits, must-attend sessions
3. **Estimate occurrence pressure**: Academic, attendance-catch, free-time value, execution-cost pressures
4. **Filter impossible actions**: Remove actions violating explicit requirements or user preferences  
5. **Compare remaining actions**: Prefer most free-time-efficient action within acceptable boundaries
6. **Finalize bounded action material**: Prepare feasible action set for candidate planning

#### Planning Modes
- **`safe_max_mode`** (default): Continue toward more usable free time until safety margin becomes too weak
- **`target_free_time_mode`**: Stop once user's requested free-time target is sufficiently reached

### Multi-Agent Architecture Integration

#### Agent Roster v1
- **Structurer Agent**: Converts messy inputs to structured fields, detects contradictions
- **Academic Guardian**: Evaluates academic safety, absence pressure, key-session importance
- **Time Maximizer**: Evaluates free-time gains, early/late class avoidance, time-use goals  
- **Execution Realist**: Evaluates commute burden, substitute costs, classroom awkwardness
- **Judge Agent**: Selects final plan from candidate set, provides concise rationale

#### Debate Protocol
- Structured, not free-form debate
- Each agent receives same candidate set, context snapshot, planning mode, semester phase
- Agents return compact structured reviews with preferred ordering, objections, supporting reasons
- Agents can flag missing information that lowers confidence

#### Judge Protocol  
- Reads structured context, candidate plans, three debate reviews, current planning mode
- Outputs selected candidate, concise rationale, optional fallback candidate, user-facing notes
- Rationale stays short enough for single-plan UX

## Output Specification

### Core Output Principle
The product behaves as a **decision terminal**, not an analytics console. Users should immediately answer: "What should I do for this class occurrence?"

### Output Object Structure

#### Plan-Level Wrapper
- `plan_id`: Unique identifier for saving, comparison, feedback tracking
- `planning_window`: Time range covered (today, this_week, current_phase)  
- `strategy_snapshot`: Minimal summary of settings that produced this plan
- `judge_short_rationale`: Very short explanation for final plan choice
- `plan_items`: Ordered list of action items (main user content)
- `tuning_controls`: Post-generation adjustment directions (`more_conservative`, `more_aggressive`)

#### Action-Plan Item
- `plan_item_id`: Identifier for editing, feedback, local override
- `course_id`: Stable reference to course (course_name_display for display)
- `date`: Calendar date of class occurrence  
- `time_slot`: Scheduled class time (class-period label or concrete times)
- `attendance_status`: Single most important field (skip | substitute_attendance | arrive_then_leave_early | attend_full)
- `execution_note`: Short plain-language instruction for user
- `event_feedback_allowed`: Flag for rare-event feedback submission

#### Execution-Support Fields
- `must_attend_reason`: Why attendance is required (first session, pre-final, etc.)
- `estimated_commute_time_cost`: Travel time if attending
- `estimated_substitute_cost`: Money cost if using substitute
- `leave_early_note`: Practical guidance for arrive_then_leave_early actions

### Tuning Controls
- **`more_conservative`**: Regenerates with more attendance-preserving pressure
  - Hint: "Expect more attendance on borderline classes."
- **`more_aggressive`**: Regenerates with stronger free-time priority  
  - Hint: "Expect more free time, especially from borderline classes."

## Development Guidelines

### LLM Integration Principles
- LLM acts as **structurer, candidate generator, debate participant, judge support** - not unconstrained final decider
- Planning-critical extracted fields require user confirmation before trusted storage
- Maintain deterministic fallback paths for all agentic components
- Never let LLM invent outputs outside candidate set that passed deterministic guardrails

### Implementation Constraints
- Preserve hard constraints: recorded-absence limits, must-attend enforcement, action vocabulary, output schema
- Keep one final user-facing plan only; debate remains internal
- Do not overbuild analytics dashboards before core action list works
- If timeline tight, keep import parser simple and prefer pasted structured text

### Testing Strategy
- Test deterministic guardrails independently before adding agentic layers
- Verify candidate generation stays within feasible boundaries
- Ensure judge selects only from provided candidate set
- Validate output mapping produces stable action-plan structure

## Current System State (v0.1.0)

### ✅ Verified Functionality
- Course table screenshot parsing: Handles control characters and异常JSON
- Excel table import: Correctly processes row-column alignment
- LLM call tracing: Core Langfuse tracking works properly
- Multi-agent decision: Three specialized agents collaborate effectively
- User preference configuration: Strategy intensity adjustments supported
- Time slot display: Chinese format time slots ("第一.二节") functional

### ⚠️ Known Limitations
- UI tests partially failing due to path issues (core functionality unaffected)
- Langfuse shallow logging disabled to avoid proxy conflicts
- Proxy environment requires removing local proxy configuration when using TUN VPN

### Future Improvement Areas
**Technical Debt**: Fix UI test paths, re-evaluate Langfuse shallow logging necessity, optimize LLM call frequency
**Feature Extensions**: Mobile responsiveness, additional LLM provider support, historical data learning optimization  
**UX Enhancements**: Better error messaging, progress indicators for long operations, bulk course configuration

---
*This technical specification consolidates input-model-spec-v0.1.md, agent-decision-architecture-spec-v0.1.md, decision-engine-spec-v0.1.md, and action-plan-output-spec-v0.1.md into a unified developer reference.*