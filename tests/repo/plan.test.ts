import { afterEach, describe, expect, it } from "vitest";

import { db } from "../../src/lib/db";
import { getLatestGeneratedPlan, replaceGeneratedPlan } from "../../src/lib/repo/plan";
import { replaceImportedTimetableCourses } from "../../src/lib/repo/timetable";
import type { ActionPlanOutput } from "../../src/lib/types/output";

const samplePlan: ActionPlanOutput = {
  plan_id: "plan-001",
  planning_window: {
    start_date: "2026-03-01",
    end_date: "2026-03-07",
    view: "this_week"
  },
  available_time_views: ["today", "this_week"],
  strategy_snapshot: {
    strategy_tier: "balanced",
    risk_tier: "medium",
    semester_phase: "normal_release"
  },
  tuning_controls: {
    more_conservative: { hint: "Ease off" },
    more_aggressive: { hint: "Push harder" }
  },
  judge_short_rationale: "Stay steady this week",
  plan_items: [
    {
      plan_item_id: "item-001",
      course_id: "course-001",
      date: "2026-03-02",
      time_slot: "09:00-10:30",
      attendance_status: "attend_full",
      execution_note: "Attend to keep momentum",
      event_feedback_allowed: true,
      course_name_display: "course-001",
      location_display: "Room 101",
      teacher_name_display: "Prof. Lin"
    },
    {
      plan_item_id: "item-002",
      course_id: "course-002",
      date: "2026-03-03",
      time_slot: "13:00-14:30",
      attendance_status: "skip",
      execution_note: "Recover and study",
      course_name_display: "course-002",
      location_display: "Room 202",
      teacher_name_display: "Prof. Xu"
    }
  ]
};

afterEach(async () => {
  await db.generatedPlanItem.deleteMany();
  await db.generatedPlan.deleteMany();
  await db.timetableCourse.deleteMany();
});

describe("generated plan repository", () => {
  it("persists and reads back a generated plan snapshot", async () => {
    await replaceImportedTimetableCourses([
      {
        course_name: "course-001",
        time_slots: [{ day_of_week: 1, time: "第一.二节" }],
        location: "Room 101",
        teacher_name: "Prof. Lin"
      },
      {
        course_name: "course-002",
        time_slots: [{ day_of_week: 2, time: "第七.八节" }],
        location: "Room 202",
        teacher_name: "Prof. Xu"
      }
    ]);

    await replaceGeneratedPlan(samplePlan);

    const savedPlan = await getLatestGeneratedPlan();

    expect(savedPlan).toEqual(samplePlan);
  });

  it("keeps date-only item strings and display metadata across save/load", async () => {
    await replaceImportedTimetableCourses([
      {
        course_name: "course-001",
        time_slots: [{ day_of_week: 1, time: "第一.二节" }],
        location: "Room 101",
        teacher_name: "Prof. Lin"
      }
    ]);

    await replaceGeneratedPlan({
      ...samplePlan,
      plan_items: [samplePlan.plan_items[0]!]
    });

    const savedPlan = await getLatestGeneratedPlan();
    const savedItem = savedPlan?.plan_items[0];

    expect(savedItem?.date).toBe("2026-03-02");
    expect(savedItem?.course_name_display).toBe("course-001");
    expect(savedItem?.location_display).toBe("Room 101");
    expect(savedItem?.teacher_name_display).toBe("Prof. Lin");
  });
});
