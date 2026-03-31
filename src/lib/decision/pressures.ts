import type { PressureEstimate, PressureLevel, OccurrenceContext } from "@/lib/types/decision";

function toPressureLevel(score: number): PressureLevel {
  if (score >= 4) {
    return "high";
  }

  if (score >= 2) {
    return "medium";
  }

  return "low";
}

function parseStartHour(timeSlot: string): number | null {
  const match = timeSlot.match(/^(\d{2}):(\d{2})/);

  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function estimateAcademicPressureScore(context: OccurrenceContext): number {
  let score = 0;

  if (context.course_details.course_target_level === "high_score_needed") {
    score += 2;
  }

  if (context.course_details.personal_fail_risk === "easy_to_fail") {
    score += 2;
  } else if (context.course_details.personal_fail_risk === "possible_to_fail") {
    score += 1;
  }

  if (context.semester_phase === "midterm_tightening") {
    score += 1;
  }

  if (context.semester_phase === "final_tightening") {
    score += 2;
  }

  if ((context.course_details.score_loss_per_recorded_absence ?? 0) >= 5) {
    score += 1;
  }

  if ((context.course_details.max_recorded_absences ?? Infinity) <= 2) {
    score += 1;
  }

  if ((context.course_details.fail_threshold_absences ?? Infinity) <= 2) {
    score += 1;
  }

  return score;
}

function estimateCatchPressureScore(context: OccurrenceContext): number {
  let score = 0;
  const attendanceModes = context.course_details.attendance_modes;

  if (
    attendanceModes.includes("full_roll_call_every_session") ||
    attendanceModes.includes("random_student_check_every_session")
  ) {
    score += 3;
  }

  if (
    attendanceModes.includes("random_full_roll_call") ||
    attendanceModes.includes("full_roll_call_when_class_small") ||
    attendanceModes.includes("paper_sign_in_before_class") ||
    attendanceModes.includes("location_based_sign_in") ||
    attendanceModes.includes("qr_code_sign_in")
  ) {
    score += 2;
  }

  if (context.course_details.full_roll_call_frequency_tier === "high") {
    score += 2;
  } else if (context.course_details.full_roll_call_frequency_tier === "medium") {
    score += 1;
  }

  if (context.course_details.random_check_frequency_tier === "high") {
    score += 2;
  } else if (context.course_details.random_check_frequency_tier === "medium") {
    score += 1;
  }

  if ((context.course_details.key_session_types ?? []).length > 0) {
    score += 1;
  }

  if (
    context.course_details.field_confidence === "low" ||
    context.course_details.absence_rule_confidence === "low" ||
    attendanceModes.includes("unclear_or_irregular")
  ) {
    score += 1;
  }

  if (context.semester_phase === "exploration") {
    score += 1;
  }

  return score;
}

function estimateFreeTimeValuePressureScore(context: OccurrenceContext): number {
  let score = 0;
  const startHour = parseStartHour(context.occurrence.time_slot);

  if (context.user_profile.prefer_large_blocks) {
    score += 1;
  }

  if (
    context.user_profile.prefer_skip_early_classes &&
    startHour !== null &&
    startHour < 9
  ) {
    score += 2;
  }

  if (
    context.user_profile.prefer_skip_late_classes &&
    startHour !== null &&
    startHour >= 17
  ) {
    score += 2;
  }

  if ((context.user_profile.preferred_time_use_cases?.length ?? 0) > 0) {
    score += 1;
  }

  if (context.short_term_modifiers?.weather_modifier) {
    score += 1;
  }

  if (context.short_term_modifiers?.temporary_goal_shift) {
    score += 1;
  }

  if ((context.short_term_modifiers?.upcoming_events?.length ?? 0) > 0) {
    score += 1;
  }

  if (context.short_term_modifiers?.body_state) {
    score += 1;
  }

  return score;
}

function estimateExecutionCostPressureScore(context: OccurrenceContext): number {
  let score = 0;
  const substituteCost =
    context.course_details.substitute_attendance_cost_override ??
    context.user_profile.substitute_attendance_default_cost ??
    0;

  if (context.user_profile.execution_pressure === "high") {
    score += 2;
  } else if (context.user_profile.execution_pressure === "medium") {
    score += 1;
  }

  if (substituteCost >= 100) {
    score += 2;
  } else if (substituteCost >= 50) {
    score += 1;
  }

  if (!context.user_profile.sign_in_then_leave_willingness) {
    score += 1;
  }

  if (context.course_details.sign_in_then_leave_feasibility === "no") {
    score += 1;
  }

  if (context.course_details.escape_feasibility_tier === "hard") {
    score += 2;
  } else if (context.course_details.escape_feasibility_tier === "medium") {
    score += 1;
  }

  if ((context.course_details.escape_environment_tags?.length ?? 0) > 0) {
    score += 1;
  }

  return score;
}

export function estimatePressures(context: OccurrenceContext): PressureEstimate {
  return {
    academic: toPressureLevel(estimateAcademicPressureScore(context)),
    catch: toPressureLevel(estimateCatchPressureScore(context)),
    free_time_value: toPressureLevel(
      estimateFreeTimeValuePressureScore(context)
    ),
    execution_cost: toPressureLevel(
      estimateExecutionCostPressureScore(context)
    )
  };
}
