import { listCourseDetails } from "@/lib/repo/course-details";
import { getSemesterPhaseConfig } from "@/lib/repo/semester-phase";
import { getShortTermModifiers } from "@/lib/repo/short-term";
import { listImportedTimetableCourses } from "@/lib/repo/timetable";
import { getUserProfile } from "@/lib/repo/user-profile";
import type { SemesterPhase, SemesterPhaseConfigInput } from "@/lib/types/input";
import type { OccurrenceContext, OccurrenceTimeSlot } from "@/lib/types/decision";

export type BuildOccurrenceContextInput = {
  course_name_ref: string;
  occurrence_week: number;
  occurrence: OccurrenceTimeSlot;
};

function resolveSemesterPhaseForWeek(
  config: SemesterPhaseConfigInput,
  occurrenceWeek: number
): SemesterPhase {
  const overrideMatch = config.phase_rule_overrides?.find(
    (segment) =>
      occurrenceWeek >= segment.start_week && occurrenceWeek <= segment.end_week
  );

  if (overrideMatch) {
    return overrideMatch.phase;
  }

  const templateMatch = config.phase_template.find(
    (segment) =>
      occurrenceWeek >= segment.start_week && occurrenceWeek <= segment.end_week
  );

  if (!templateMatch) {
    throw new Error(`No semester phase configured for week ${occurrenceWeek}`);
  }

  return templateMatch.phase;
}

export async function buildOccurrenceContext(
  input: BuildOccurrenceContextInput
): Promise<OccurrenceContext> {
  const [courses, courseDetails, userProfile, semesterPhaseConfig, shortTermModifiers] =
    await Promise.all([
      listImportedTimetableCourses(),
      listCourseDetails(),
      getUserProfile(),
      getSemesterPhaseConfig(),
      getShortTermModifiers()
    ]);

  if (!userProfile) {
    throw new Error("User profile is required before building occurrence context");
  }

  if (!semesterPhaseConfig) {
    throw new Error(
      "Semester phase config is required before building occurrence context"
    );
  }

  const course = courses.find(
    (candidate) => candidate.course_name === input.course_name_ref
  );

  if (!course) {
    throw new Error(`Imported course not found for ${input.course_name_ref}`);
  }

  const detail = courseDetails.find(
    (candidate) => candidate.course_name_ref === input.course_name_ref
  );

  if (!detail) {
    throw new Error(`Course detail not found for ${input.course_name_ref}`);
  }

  return {
    course,
    course_details: detail,
    user_profile: userProfile,
    planning_mode: userProfile.planning_mode,
    free_time_target: userProfile.free_time_target,
    semester_phase: resolveSemesterPhaseForWeek(
      semesterPhaseConfig,
      input.occurrence_week
    ),
    short_term_modifiers: shortTermModifiers ?? undefined,
    occurrence_week: input.occurrence_week,
    occurrence: input.occurrence
  };
}

export { resolveSemesterPhaseForWeek };
