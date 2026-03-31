import { pathToFileURL } from "node:url";

import { db } from "../src/lib/db";
import { replaceCourseDetails } from "../src/lib/repo/course-details";
import { replaceSemesterPhaseConfig } from "../src/lib/repo/semester-phase";
import { replaceShortTermModifiers } from "../src/lib/repo/short-term";
import { replaceImportedTimetableCourses } from "../src/lib/repo/timetable";
import { replaceUserProfile } from "../src/lib/repo/user-profile";
import { generatePlan } from "../src/server/actions/generate-plan";

export async function seedDatabase() {
  await db.generatedPlanItem.deleteMany();
  await db.generatedPlan.deleteMany();
  await db.shortTermModifier.deleteMany();
  await db.courseDetail.deleteMany();
  await db.semesterPhaseConfig.deleteMany();
  await db.userProfile.deleteMany();
  await db.timetableCourse.deleteMany();

  await replaceImportedTimetableCourses([
    {
      course_name: "Campus Policy",
      time_slots: [{ day_of_week: 1, time: "第一.二节" }],
      location: "North Hall",
      teacher_name: "Prof. Lin",
      week_range: { start_week: 1, end_week: 16 }
    },
    {
      course_name: "Energy Systems",
      time_slots: [{ day_of_week: 3, time: "第七.八节" }],
      location: "South Hall",
      teacher_name: "Prof. Xu",
      week_range: { start_week: 1, end_week: 16 }
    }
  ]);

  await replaceUserProfile({
    planning_mode: "safe_max_mode",
    strategy_tier: "balanced",
    risk_tier: "medium",
    execution_pressure: "medium",
    score_buffer_preference: "some",
    prefer_large_blocks: true,
    prefer_skip_early_classes: true,
    prefer_skip_late_classes: false,
    preferred_time_use_cases: ["study", "internship"],
    substitute_attendance_enabled: true,
    substitute_attendance_default_cost: 40,
    sign_in_then_leave_willingness: true,
    retroactive_remedy_enabled: false
  });

  await replaceSemesterPhaseConfig({
    phase_template: [
      { start_week: 1, end_week: 2, phase: "exploration" },
      { start_week: 3, end_week: 8, phase: "normal_release" },
      { start_week: 9, end_week: 10, phase: "midterm_tightening" },
      { start_week: 11, end_week: 14, phase: "post_midterm_release" },
      { start_week: 15, end_week: 16, phase: "final_tightening" }
    ]
  });

  await replaceShortTermModifiers({
    weather_modifier: "light rain",
    temporary_goal_shift: "protect project work",
    upcoming_events: ["club presentation"]
  });

  await replaceCourseDetails([
    {
      course_name_ref: "Campus Policy",
      course_class: "easy",
      course_target_level: "pass_only",
      personal_fail_risk: "unlikely_to_fail",
      attendance_modes: ["visual_or_verbal_confirmation"],
      field_confidence: "high",
      absence_rule_confidence: "high",
      sign_in_then_leave_feasibility: "yes",
      escape_feasibility_tier: "easy"
    },
    {
      course_name_ref: "Energy Systems",
      course_class: "core",
      course_target_level: "high_score_needed",
      personal_fail_risk: "possible_to_fail",
      attendance_modes: ["paper_sign_in_before_class"],
      field_confidence: "high",
      absence_rule_confidence: "high",
      sign_in_then_leave_feasibility: "no",
      escape_feasibility_tier: "hard",
      substitute_attendance_cost_override: 90,
      key_session_types: ["exam_hint_or_material_session"]
    }
  ]);

  return generatePlan();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
