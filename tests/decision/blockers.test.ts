import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CourseDetailInput,
  SemesterPhaseConfigInput,
  FreeTimeTarget,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";
import type { OccurrenceContext } from "../../src/lib/types/decision";

import {
  buildOccurrenceContext,
  type BuildOccurrenceContextInput
} from "../../src/lib/decision/context";
import {
  evaluateHardBlockers,
  getForcedAttendanceReason
} from "../../src/lib/decision/blockers";

const {
  mockListImportedTimetableCourses,
  mockListCourseDetails,
  mockGetUserProfile,
  mockGetSemesterPhaseConfig,
  mockGetShortTermModifiers
} = vi.hoisted(() => ({
  mockListImportedTimetableCourses: vi.fn<() => Promise<TimetableCourseInput[]>>(),
  mockListCourseDetails: vi.fn<() => Promise<CourseDetailInput[]>>(),
  mockGetUserProfile: vi.fn<() => Promise<UserProfileInput | null>>(),
  mockGetSemesterPhaseConfig: vi.fn<
    () => Promise<SemesterPhaseConfigInput | null>
  >(),
  mockGetShortTermModifiers: vi.fn<
    () => Promise<ShortTermModifiersInput | null>
  >()
}));

vi.mock("../../src/lib/repo/timetable", () => ({
  listImportedTimetableCourses: mockListImportedTimetableCourses
}));

vi.mock("../../src/lib/repo/course-details", () => ({
  listCourseDetails: mockListCourseDetails
}));

vi.mock("../../src/lib/repo/user-profile", () => ({
  getUserProfile: mockGetUserProfile
}));

vi.mock("../../src/lib/repo/semester-phase", () => ({
  getSemesterPhaseConfig: mockGetSemesterPhaseConfig
}));

vi.mock("../../src/lib/repo/short-term", () => ({
  getShortTermModifiers: mockGetShortTermModifiers
}));

const baseCourse = (): TimetableCourseInput => ({
  course_name: "Advanced Calculus",
  time_slots: [{ day_of_week: 1, time: "第一.二节" }],
  location: "Main Building"
});

const baseDetails = (): CourseDetailInput => ({
  course_name_ref: "Advanced Calculus",
  course_class: "core",
  course_target_level: "pass_only",
  personal_fail_risk: "unlikely_to_fail",
  attendance_modes: ["unclear_or_irregular"],
  field_confidence: "high",
  absence_rule_confidence: "high",
  sign_in_then_leave_feasibility: "maybe",
  escape_feasibility_tier: "medium"
});

const baseProfile = (): UserProfileInput => ({
  planning_mode: "target_free_time_mode",
  free_time_target: {
    type: "usable_hours",
    value: 6
  },
  strategy_tier: "balanced",
  risk_tier: "medium",
  execution_pressure: "medium",
  score_buffer_preference: "some",
  prefer_large_blocks: true,
  prefer_skip_early_classes: true,
  prefer_skip_late_classes: false,
  substitute_attendance_enabled: true,
  substitute_attendance_default_cost: 40,
  sign_in_then_leave_willingness: true,
  retroactive_remedy_enabled: false
});

const basePhaseConfig = (): SemesterPhaseConfigInput => ({
  phase_template: [
    { start_week: 1, end_week: 2, phase: "exploration" },
    { start_week: 3, end_week: 6, phase: "normal_release" },
    { start_week: 7, end_week: 9, phase: "midterm_tightening" },
    { start_week: 10, end_week: 14, phase: "post_midterm_release" },
    { start_week: 15, end_week: 16, phase: "final_tightening" }
  ]
});

const baseShortTerm = (): ShortTermModifiersInput => ({
  weather_modifier: "cold rain",
  upcoming_events: ["internship interview"],
  body_state: "tired"
});

const baseOccurrenceInput = (): BuildOccurrenceContextInput => ({
  course_name_ref: "Advanced Calculus",
  occurrence_week: 15,
  occurrence: {
    date: "2026-06-08",
    time_slot: "08:00-09:35"
  }
});

type Task6OccurrenceContext = OccurrenceContext & {
  planning_mode: UserProfileInput["planning_mode"];
  free_time_target?: FreeTimeTarget;
  occurrence_week: number;
};

const makeContext = (
  overrides: Partial<Task6OccurrenceContext> = {}
): Task6OccurrenceContext => ({
  course: baseCourse(),
  course_details: baseDetails(),
  user_profile: baseProfile(),
  planning_mode: "safe_max_mode",
  free_time_target: undefined,
  semester_phase: "normal_release",
  short_term_modifiers: baseShortTerm(),
  occurrence_week: 5,
  occurrence: {
    date: "2026-04-01",
    time_slot: "08:00-09:35"
  },
  ...overrides
});

describe("buildOccurrenceContext", () => {
  beforeEach(() => {
    mockListImportedTimetableCourses.mockResolvedValue([baseCourse()]);
    mockListCourseDetails.mockResolvedValue([baseDetails()]);
    mockGetUserProfile.mockResolvedValue(baseProfile());
    mockGetSemesterPhaseConfig.mockResolvedValue(basePhaseConfig());
    mockGetShortTermModifiers.mockResolvedValue(baseShortTerm());
  });

  it("threads semester phase, short-term modifiers, planning mode, and free-time target", async () => {
    const context = await buildOccurrenceContext(baseOccurrenceInput());

    expect(context.semester_phase).toBe("final_tightening");
    expect(context.short_term_modifiers).toEqual(baseShortTerm());
    expect(context.planning_mode).toBe("target_free_time_mode");
    expect(context.free_time_target).toEqual({
      type: "usable_hours",
      value: 6
    });
  });
});

describe("evaluateHardBlockers", () => {
  it("forces attendance for a first-session exploration class", () => {
    const blockers = evaluateHardBlockers(
      makeContext({
        semester_phase: "exploration",
        course_details: {
          ...baseDetails(),
          key_session_types: ["first_session"]
        }
      })
    );

    expect(getForcedAttendanceReason(blockers)).toContain("first session");
    expect(blockers).toContainEqual(
      expect.objectContaining({
        id: "first_session_forced_attendance",
        severity: "hard"
      })
    );
  });

  it("forces attendance for a pre-final session", () => {
    const blockers = evaluateHardBlockers(
      makeContext({
        semester_phase: "final_tightening",
        course_details: {
          ...baseDetails(),
          key_session_types: ["pre_final_session"]
        }
      })
    );

    expect(getForcedAttendanceReason(blockers)).toContain("pre-final");
    expect(blockers).toContainEqual(
      expect.objectContaining({
        id: "pre_final_forced_attendance",
        severity: "hard"
      })
    );
  });

  it("forces attendance for an announced key session", () => {
    const blockers = evaluateHardBlockers(
      makeContext({
        course_details: {
          ...baseDetails(),
          key_session_types: ["teacher_announced_important_session"]
        }
      })
    );

    expect(getForcedAttendanceReason(blockers)).toContain("key session");
    expect(blockers).toContainEqual(
      expect.objectContaining({
        id: "key_session_forced_attendance",
        severity: "hard"
      })
    );
  });

  it("adds a soft blocker when the course has almost no absence buffer", () => {
    const blockers = evaluateHardBlockers(
      makeContext({
        course_details: {
          ...baseDetails(),
          max_recorded_absences: 1,
          fail_threshold_absences: 1
        }
      })
    );

    expect(blockers).toContainEqual(
      expect.objectContaining({
        id: "near_absence_limit_pressure",
        severity: "soft"
      })
    );
  });

  it("adds a caution blocker when information quality is weak", () => {
    const blockers = evaluateHardBlockers(
      makeContext({
        course_details: {
          ...baseDetails(),
          field_confidence: "low",
          absence_rule_confidence: "low",
          attendance_modes: ["unclear_or_irregular"]
        }
      })
    );

    expect(blockers).toContainEqual(
      expect.objectContaining({
        id: "missing_information_caution",
        severity: "soft"
      })
    );
  });
});
