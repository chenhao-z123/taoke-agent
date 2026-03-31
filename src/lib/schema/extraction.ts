import { z } from "zod";

import { timetableCourseSchema } from "@/lib/schema/input";

export const optionalNonEmptyStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

export const extractedWeekRangeSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const match = value.match(/(\d+)\D+(\d+)/);

  if (!match) {
    return value;
  }

  return {
    start_week: Number(match[1]),
    end_week: Number(match[2])
  };
}, timetableCourseSchema.shape.week_range.unwrap());

export const extractedCourseTypeOrCreditSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}, timetableCourseSchema.shape.course_type_or_credit);

const dayOfWeekLookup = new Map<string, number>([
  ["周日", 0],
  ["星期日", 0],
  ["周天", 0],
  ["sun", 0],
  ["sunday", 0],
  ["周一", 1],
  ["星期一", 1],
  ["mon", 1],
  ["monday", 1],
  ["周二", 2],
  ["星期二", 2],
  ["tue", 2],
  ["tues", 2],
  ["tuesday", 2],
  ["周三", 3],
  ["星期三", 3],
  ["wed", 3],
  ["weds", 3],
  ["wednesday", 3],
  ["周四", 4],
  ["星期四", 4],
  ["thu", 4],
  ["thur", 4],
  ["thurs", 4],
  ["thursday", 4],
  ["周五", 5],
  ["星期五", 5],
  ["fri", 5],
  ["friday", 5],
  ["周六", 6],
  ["星期六", 6],
  ["sat", 6],
  ["saturday", 6]
]);

const normalizeDayOfWeek = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return value;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const directMatch = dayOfWeekLookup.get(trimmed);
  if (directMatch !== undefined) {
    return directMatch;
  }

  const normalized = trimmed.replace(/[^a-z]/g, "");

  return dayOfWeekLookup.get(normalized) ?? value;
};

const normalizeTimeString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return value;
  }

  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);

  if (!match) {
    return value;
  }

  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  if (minutes < 0 || minutes > 59) {
    return value;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return value;
    }

    const adjustedHours =
      meridiem === "am" ? (hours === 12 ? 0 : hours) : hours === 12 ? 12 : hours + 12;

    return `${String(adjustedHours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  if (hours < 0 || hours > 23) {
    return value;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const baseTimeSlotSchema = timetableCourseSchema.shape.time_slots.element;

export const extractedTimeSlotSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const slot = value as Record<string, unknown>;
  
  let timeValue: string | undefined;
  if (typeof slot.time === "string") {
    timeValue = slot.time.trim();
  } else if (typeof slot.start_time === "string" && typeof slot.end_time === "string") {
    timeValue = `${slot.start_time}-${slot.end_time}`;
  }

  return {
    ...slot,
    day_of_week: normalizeDayOfWeek(slot.day_of_week),
    time: timeValue
  };
}, baseTimeSlotSchema);

const extractedTimetableCourseSchema = timetableCourseSchema.extend({
  time_slots: z.array(extractedTimeSlotSchema).min(1),
  week_range: extractedWeekRangeSchema.optional(),
  course_type_or_credit: extractedCourseTypeOrCreditSchema
});

export const extractImportedTimetableRequestSchema = z
  .object({
    raw_text: optionalNonEmptyStringSchema,
    image_data_url: optionalNonEmptyStringSchema,
    related_context: optionalNonEmptyStringSchema
  })
  .refine((value) => Boolean(value.raw_text ?? value.image_data_url), {
    message: "Either raw_text or image_data_url is required"
  });

export const malformedRowSchema = z.object({
  row: z.string().min(1),
  reason: z.string().min(1)
});

export const timetableExtractionResultSchema = z.object({
  courses: z.array(extractedTimetableCourseSchema),
  malformed_rows: z.array(malformedRowSchema).default([]),
  warnings: z.array(z.string()).default([]),
  raw_output: z.string().optional()
});

const fieldConfidenceSchema = z.enum(["high", "medium", "low"]);
const courseClassSchema = z.enum(["core", "special", "easy"]);
const specialCourseKindSchema = z.enum([
  "lab_or_experiment",
  "physical_education",
  "strict_attendance",
  "awkward_teacher",
  "hard_to_escape",
  "easy_to_fail",
  "other_manual"
]);
const courseTargetLevelSchema = z.enum(["pass_only", "high_score_needed"]);
const personalFailRiskSchema = z.enum([
  "easy_to_fail",
  "possible_to_fail",
  "unlikely_to_fail"
]);
const attendanceModeSchema = z.enum([
  "full_roll_call_every_session",
  "random_student_check_every_session",
  "random_full_roll_call",
  "full_roll_call_when_class_small",
  "paper_sign_in_before_class",
  "location_based_sign_in",
  "qr_code_sign_in",
  "visual_or_verbal_confirmation",
  "unclear_or_irregular",
  "other_manual"
]);
const frequencyTierSchema = z.enum(["low", "medium", "high", "unknown"]);
const signInThenLeaveFeasibilitySchema = z.enum(["no", "maybe", "yes"]);
const escapeFeasibilityTierSchema = z.enum(["easy", "medium", "hard"]);
const escapeEnvironmentTagSchema = z.enum([
  "fixed_seating",
  "no_rear_route",
  "awkward_exit_path",
  "teacher_has_wide_line_of_sight",
  "small_classroom",
  "stairs_or_back_rows_available",
  "custom"
]);
const keySessionTypeSchema = z.enum([
  "first_session",
  "midterm_related_session",
  "pre_final_session",
  "teacher_announced_important_session",
  "small_class_high_risk_session",
  "exam_hint_or_material_session",
  "assignment_check_session",
  "quiz_presentation_or_high_signin_session",
  "other_manual"
]);
const rareEventTypeSchema = z.enum([
  "rare_full_roll_call",
  "rare_random_check",
  "unexpected_sign_in",
  "teacher_became_stricter",
  "other_manual"
]);

const gradingComponentSchema = z.object({
  name: z.string().min(1),
  weight_percent: z.number().finite().optional(),
  weight_note: z.string().min(1).optional()
});

const rareEventFeedbackSchema = z.object({
  event_type: rareEventTypeSchema,
  note: z.string().min(1).optional(),
  occurred_at: z.string().min(1).optional()
});

export const courseDetailDraftSchema = z.object({
  course_name_ref: z.string().min(1),
  course_class: courseClassSchema.optional(),
  field_confidence: fieldConfidenceSchema.optional(),
  special_course_kind: specialCourseKindSchema.optional(),
  course_target_level: courseTargetLevelSchema.optional(),
  special_reason_note: z.string().min(1).optional(),
  personal_fail_risk: personalFailRiskSchema.optional(),
  attendance_modes: z.array(attendanceModeSchema).min(1).optional(),
  full_roll_call_frequency_tier: frequencyTierSchema.optional(),
  random_check_frequency_tier: frequencyTierSchema.optional(),
  max_recorded_absences: z.number().int().min(0).optional(),
  fail_threshold_absences: z.number().int().min(0).optional(),
  score_loss_per_recorded_absence: z.number().finite().optional(),
  has_mandatory_sessions: z.boolean().optional(),
  absence_rule_note: z.string().min(1).optional(),
  absence_rule_confidence: fieldConfidenceSchema.optional(),
  grading_components: z.array(gradingComponentSchema).optional(),
  grading_raw_note: z.string().min(1).optional(),
  attendance_requirement_raw_input: z.string().min(1).optional(),
  attendance_requirement_structured_summary: z.string().min(1).optional(),
  sign_in_then_leave_feasibility: signInThenLeaveFeasibilitySchema.optional(),
  escape_feasibility_tier: escapeFeasibilityTierSchema.optional(),
  escape_environment_tags: z.array(escapeEnvironmentTagSchema).optional(),
  escape_environment_note: z.string().min(1).optional(),
  substitute_attendance_allowed_for_course: z.boolean().optional(),
  substitute_attendance_cost_override: z.number().finite().optional(),
  substitute_attendance_note: z.string().min(1).optional(),
  key_session_types: z.array(keySessionTypeSchema).optional(),
  rare_event_feedback: z.array(rareEventFeedbackSchema).optional(),
  course_notes: z.string().min(1).optional()
});

export const extractCourseDetailDraftRequestSchema = z.object({
  course_name_ref: z.string().min(1),
  raw_text: z.string().min(1),
  timetable_context: timetableCourseSchema.optional()
});

export const courseDetailDraftExtractionResultSchema = z.object({
  draft: courseDetailDraftSchema,
  warnings: z.array(z.string()).default([]),
  missing_fields: z.array(z.string()).default([])
});

export type CourseDetailDraft = z.infer<typeof courseDetailDraftSchema>;
export type TimetableExtractionResult = z.infer<typeof timetableExtractionResultSchema>;
export type CourseDetailDraftExtractionResult = z.infer<
  typeof courseDetailDraftExtractionResultSchema
>;
