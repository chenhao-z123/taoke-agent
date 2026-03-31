import type { HardBlocker, OccurrenceContext } from "@/lib/types/decision";

const GENERIC_KEY_SESSIONS = new Set([
  "midterm_related_session",
  "teacher_announced_important_session",
  "small_class_high_risk_session",
  "exam_hint_or_material_session",
  "assignment_check_session",
  "quiz_presentation_or_high_signin_session",
  "other_manual"
]);

export function evaluateHardBlockers(context: OccurrenceContext): HardBlocker[] {
  const blockers: HardBlocker[] = [];
  const keySessionTypes = context.course_details.key_session_types ?? [];

  if (
    context.semester_phase === "exploration" &&
    keySessionTypes.includes("first_session")
  ) {
    blockers.push({
      id: "first_session_forced_attendance",
      reason: "Attend the first session during exploration to gather course signals.",
      severity: "hard"
    });
  }

  if (keySessionTypes.includes("pre_final_session")) {
    blockers.push({
      id: "pre_final_forced_attendance",
      reason: "Attend the pre-final session because final-period classes stay conservative.",
      severity: "hard"
    });
  }

  if (keySessionTypes.some((sessionType) => GENERIC_KEY_SESSIONS.has(sessionType))) {
    blockers.push({
      id: "key_session_forced_attendance",
      reason: "Attend this key session because it is marked as important.",
      severity: "hard"
    });
  }

  const maxRecordedAbsences = context.course_details.max_recorded_absences;
  const failThresholdAbsences = context.course_details.fail_threshold_absences;

  if (
    (typeof maxRecordedAbsences === "number" && maxRecordedAbsences <= 1) ||
    (typeof failThresholdAbsences === "number" && failThresholdAbsences <= 1)
  ) {
    blockers.push({
      id: "near_absence_limit_pressure",
      reason: "The configured absence buffer is extremely small, so attendance pressure rises.",
      severity: "soft"
    });
  }

  const missingInformation =
    context.course_details.field_confidence === "low" ||
    context.course_details.absence_rule_confidence === "low" ||
    context.course_details.attendance_modes.includes("unclear_or_irregular");

  if (missingInformation) {
    blockers.push({
      id: "missing_information_caution",
      reason: "Information quality is weak, so aggressive recommendations need extra caution.",
      severity: "soft"
    });
  }

  return blockers;
}

export function getForcedAttendanceReason(
  blockers: HardBlocker[]
): string | undefined {
  return blockers.find((blocker) => blocker.severity === "hard")?.reason;
}
