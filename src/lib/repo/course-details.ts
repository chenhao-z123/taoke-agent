import type { CourseDetailInput, RareEventFeedbackInput } from "@/lib/types/input";

import { db } from "@/lib/db";
import { courseDetailSchema } from "@/lib/schema/input";

const MAX_RARE_EVENT_FEEDBACK = 20;

const mapCourseDetailRow = (row: {
  courseNameRef: string;
  courseClass: string;
  fieldConfidence: string | null;
  specialCourseKind: string | null;
  courseTargetLevel: string;
  specialReasonNote: string | null;
  personalFailRisk: string;
  attendanceModes: unknown;
  fullRollCallFrequencyTier: string | null;
  randomCheckFrequencyTier: string | null;
  maxRecordedAbsences: number | null;
  failThresholdAbsences: number | null;
  scoreLossPerRecordedAbsence: number | null;
  hasMandatorySessions: boolean | null;
  absenceRuleNote: string | null;
  absenceRuleConfidence: string | null;
  gradingComponents: unknown;
  gradingRawNote: string | null;
  attendanceRequirementRawInput: string | null;
  attendanceRequirementStructuredSummary: string | null;
  signInThenLeaveFeasibility: string | null;
  escapeFeasibilityTier: string | null;
  escapeEnvironmentTags: unknown;
  escapeEnvironmentNote: string | null;
  substituteAttendanceAllowedForCourse: boolean | null;
  substituteAttendanceCostOverride: number | null;
  substituteAttendanceNote: string | null;
  keySessionTypes: unknown;
  rareEventFeedback: unknown;
  courseNotes: string | null;
}) =>
  courseDetailSchema.parse({
    course_name_ref: row.courseNameRef,
    course_class: row.courseClass,
    field_confidence: row.fieldConfidence ?? undefined,
    special_course_kind: row.specialCourseKind ?? undefined,
    course_target_level: row.courseTargetLevel,
    special_reason_note: row.specialReasonNote ?? undefined,
    personal_fail_risk: row.personalFailRisk,
    attendance_modes: row.attendanceModes,
    full_roll_call_frequency_tier: row.fullRollCallFrequencyTier ?? undefined,
    random_check_frequency_tier: row.randomCheckFrequencyTier ?? undefined,
    max_recorded_absences: row.maxRecordedAbsences ?? undefined,
    fail_threshold_absences: row.failThresholdAbsences ?? undefined,
    score_loss_per_recorded_absence: row.scoreLossPerRecordedAbsence ?? undefined,
    has_mandatory_sessions: row.hasMandatorySessions ?? undefined,
    absence_rule_note: row.absenceRuleNote ?? undefined,
    absence_rule_confidence: row.absenceRuleConfidence ?? undefined,
    grading_components: row.gradingComponents ?? undefined,
    grading_raw_note: row.gradingRawNote ?? undefined,
    attendance_requirement_raw_input: row.attendanceRequirementRawInput ?? undefined,
    attendance_requirement_structured_summary:
      row.attendanceRequirementStructuredSummary ?? undefined,
    sign_in_then_leave_feasibility: row.signInThenLeaveFeasibility ?? undefined,
    escape_feasibility_tier: row.escapeFeasibilityTier ?? undefined,
    escape_environment_tags: row.escapeEnvironmentTags ?? undefined,
    escape_environment_note: row.escapeEnvironmentNote ?? undefined,
    substitute_attendance_allowed_for_course:
      row.substituteAttendanceAllowedForCourse ?? undefined,
    substitute_attendance_cost_override:
      row.substituteAttendanceCostOverride ?? undefined,
    substitute_attendance_note: row.substituteAttendanceNote ?? undefined,
    key_session_types: row.keySessionTypes ?? undefined,
    rare_event_feedback: row.rareEventFeedback ?? undefined,
    course_notes: row.courseNotes ?? undefined
  });

export async function replaceCourseDetails(
  details: CourseDetailInput[]
): Promise<CourseDetailInput[]> {
  await db.$transaction(async (tx) => {
    await tx.courseDetail.deleteMany();

    for (const detail of details) {
      await tx.courseDetail.create({
        data: {
          courseNameRef: detail.course_name_ref,
          courseClass: detail.course_class,
          fieldConfidence: detail.field_confidence ?? undefined,
          specialCourseKind: detail.special_course_kind ?? undefined,
          courseTargetLevel: detail.course_target_level,
          specialReasonNote: detail.special_reason_note ?? undefined,
          personalFailRisk: detail.personal_fail_risk,
          attendanceModes: detail.attendance_modes,
          fullRollCallFrequencyTier: detail.full_roll_call_frequency_tier ?? undefined,
          randomCheckFrequencyTier: detail.random_check_frequency_tier ?? undefined,
          maxRecordedAbsences: detail.max_recorded_absences ?? undefined,
          failThresholdAbsences: detail.fail_threshold_absences ?? undefined,
          scoreLossPerRecordedAbsence:
            detail.score_loss_per_recorded_absence ?? undefined,
          hasMandatorySessions: detail.has_mandatory_sessions ?? undefined,
          absenceRuleNote: detail.absence_rule_note ?? undefined,
          absenceRuleConfidence: detail.absence_rule_confidence ?? undefined,
          gradingComponents: detail.grading_components ?? undefined,
          gradingRawNote: detail.grading_raw_note ?? undefined,
          attendanceRequirementRawInput:
            detail.attendance_requirement_raw_input ?? undefined,
          attendanceRequirementStructuredSummary:
            detail.attendance_requirement_structured_summary ?? undefined,
          signInThenLeaveFeasibility: detail.sign_in_then_leave_feasibility ?? undefined,
          escapeFeasibilityTier: detail.escape_feasibility_tier ?? undefined,
          escapeEnvironmentTags: detail.escape_environment_tags ?? undefined,
          escapeEnvironmentNote: detail.escape_environment_note ?? undefined,
          substituteAttendanceAllowedForCourse:
            detail.substitute_attendance_allowed_for_course ?? undefined,
          substituteAttendanceCostOverride:
            detail.substitute_attendance_cost_override ?? undefined,
          substituteAttendanceNote: detail.substitute_attendance_note ?? undefined,
          keySessionTypes: detail.key_session_types ?? undefined,
          rareEventFeedback: detail.rare_event_feedback ?? undefined,
          courseNotes: detail.course_notes ?? undefined
        }
      });
    }
  });

  return listCourseDetails();
}

export async function listCourseDetails(): Promise<CourseDetailInput[]> {
  const rows = await db.courseDetail.findMany({
    orderBy: {
      createdAt: "asc"
    }
  });

  return rows.map((row) =>
    mapCourseDetailRow({
      courseNameRef: row.courseNameRef,
      courseClass: row.courseClass,
      fieldConfidence: row.fieldConfidence,
      specialCourseKind: row.specialCourseKind,
      courseTargetLevel: row.courseTargetLevel,
      specialReasonNote: row.specialReasonNote,
      personalFailRisk: row.personalFailRisk,
      attendanceModes: row.attendanceModes,
      fullRollCallFrequencyTier: row.fullRollCallFrequencyTier,
      randomCheckFrequencyTier: row.randomCheckFrequencyTier,
      maxRecordedAbsences: row.maxRecordedAbsences,
      failThresholdAbsences: row.failThresholdAbsences,
      scoreLossPerRecordedAbsence: row.scoreLossPerRecordedAbsence,
      hasMandatorySessions: row.hasMandatorySessions,
      absenceRuleNote: row.absenceRuleNote,
      absenceRuleConfidence: row.absenceRuleConfidence,
      gradingComponents: row.gradingComponents,
      gradingRawNote: row.gradingRawNote,
      attendanceRequirementRawInput: row.attendanceRequirementRawInput,
      attendanceRequirementStructuredSummary:
        row.attendanceRequirementStructuredSummary,
      signInThenLeaveFeasibility: row.signInThenLeaveFeasibility,
      escapeFeasibilityTier: row.escapeFeasibilityTier,
      escapeEnvironmentTags: row.escapeEnvironmentTags,
      escapeEnvironmentNote: row.escapeEnvironmentNote,
      substituteAttendanceAllowedForCourse: row.substituteAttendanceAllowedForCourse,
      substituteAttendanceCostOverride: row.substituteAttendanceCostOverride,
      substituteAttendanceNote: row.substituteAttendanceNote,
      keySessionTypes: row.keySessionTypes,
      rareEventFeedback: row.rareEventFeedback,
      courseNotes: row.courseNotes
    })
  );
}

export async function appendRareEventFeedback(
  courseNameRef: string,
  feedback: RareEventFeedbackInput
): Promise<CourseDetailInput> {
  const row = await db.courseDetail.findFirst({
    where: {
      courseNameRef
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (!row) {
    throw new Error("Course detail not found");
  }

  const existingFeedback = (row.rareEventFeedback ?? []) as RareEventFeedbackInput[];
  const boundedFeedback = [...existingFeedback, feedback].slice(
    -MAX_RARE_EVENT_FEEDBACK
  );

  const updated = await db.courseDetail.update({
    where: {
      id: row.id
    },
    data: {
      rareEventFeedback: boundedFeedback
    }
  });

  return mapCourseDetailRow({
    courseNameRef: updated.courseNameRef,
    courseClass: updated.courseClass,
    fieldConfidence: updated.fieldConfidence,
    specialCourseKind: updated.specialCourseKind,
    courseTargetLevel: updated.courseTargetLevel,
    specialReasonNote: updated.specialReasonNote,
    personalFailRisk: updated.personalFailRisk,
    attendanceModes: updated.attendanceModes,
    fullRollCallFrequencyTier: updated.fullRollCallFrequencyTier,
    randomCheckFrequencyTier: updated.randomCheckFrequencyTier,
    maxRecordedAbsences: updated.maxRecordedAbsences,
    failThresholdAbsences: updated.failThresholdAbsences,
    scoreLossPerRecordedAbsence: updated.scoreLossPerRecordedAbsence,
    hasMandatorySessions: updated.hasMandatorySessions,
    absenceRuleNote: updated.absenceRuleNote,
    absenceRuleConfidence: updated.absenceRuleConfidence,
    gradingComponents: updated.gradingComponents,
    gradingRawNote: updated.gradingRawNote,
    attendanceRequirementRawInput: updated.attendanceRequirementRawInput,
    attendanceRequirementStructuredSummary:
      updated.attendanceRequirementStructuredSummary,
    signInThenLeaveFeasibility: updated.signInThenLeaveFeasibility,
    escapeFeasibilityTier: updated.escapeFeasibilityTier,
    escapeEnvironmentTags: updated.escapeEnvironmentTags,
    escapeEnvironmentNote: updated.escapeEnvironmentNote,
    substituteAttendanceAllowedForCourse:
      updated.substituteAttendanceAllowedForCourse,
    substituteAttendanceCostOverride: updated.substituteAttendanceCostOverride,
    substituteAttendanceNote: updated.substituteAttendanceNote,
    keySessionTypes: updated.keySessionTypes,
    rareEventFeedback: updated.rareEventFeedback,
    courseNotes: updated.courseNotes
  });
}
