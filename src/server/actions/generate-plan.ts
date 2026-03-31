"use server";

import { randomUUID } from "crypto";

import { buildOccurrenceContext } from "@/lib/decision/context";
import { orchestratePlan, type PlanningLlmMode } from "@/lib/decision/planner";
import { replaceGeneratedPlan } from "@/lib/repo/plan";
import { listImportedTimetableCourses } from "@/lib/repo/timetable";
import { mapPlanToOutput } from "@/lib/output/plan-output";
import type { CandidatePlannerTuning } from "@/lib/candidates/candidate-planner";
import { flushLangfuseTracing } from "@/lib/observability/langfuse";
import type { PlanningWindow } from "@/lib/types/output";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildOccurrenceDate(dayOfWeek: number): string {
  const today = new Date();
  const result = new Date(today);
  const distance = (dayOfWeek - today.getDay() + 7) % 7;

  result.setDate(today.getDate() + distance);

  return formatDate(result);
}

function buildPlanningWindow(dates: string[]): PlanningWindow {
  const sortedDates = [...dates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  if (!startDate || !endDate) {
    throw new Error("Cannot build planning window without occurrence dates");
  }

  return {
    start_date: startDate,
    end_date: endDate,
    view: "this_week"
  };
}

async function buildSavedOccurrenceContexts() {
  const courses = await listImportedTimetableCourses();

  if (courses.length === 0) {
    throw new Error("Import timetable data before generating a plan");
  }

  return Promise.all(
    courses.flatMap((course) =>
      course.time_slots.map((slot) =>
        buildOccurrenceContext({
          course_name_ref: course.course_name,
          occurrence_week: course.week_range?.start_week ?? 1,
          occurrence: {
            date: buildOccurrenceDate(slot.day_of_week),
            time_slot: slot.time
          }
        })
      )
    )
  );
}

export async function generatePlanWithTuning(
  tuning?: CandidatePlannerTuning,
  planning_llm_mode?: PlanningLlmMode
) {
  try {
    const occurrences = await buildSavedOccurrenceContexts();
    const planner_result = await orchestratePlan({
      occurrences,
      tuning,
      planning_llm_mode
    });
    const plan = mapPlanToOutput({
      plan_id: randomUUID(),
      planning_window: buildPlanningWindow(
        planner_result.selected_plan_items.map((item) => item.occurrence.date)
      ),
      planner_result
    });

    return { plan: await replaceGeneratedPlan(plan) };
  } finally {
    await flushLangfuseTracing();
  }
}

export async function generatePlan() {
  return generatePlanWithTuning();
}
