import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../src/lib/db";
import { replaceCourseDetails } from "../../src/lib/repo/course-details";
import { getLatestGeneratedPlan } from "../../src/lib/repo/plan";
import { replaceSemesterPhaseConfig } from "../../src/lib/repo/semester-phase";
import { replaceShortTermModifiers } from "../../src/lib/repo/short-term";
import { replaceImportedTimetableCourses } from "../../src/lib/repo/timetable";
import { replaceUserProfile } from "../../src/lib/repo/user-profile";
import * as planner from "../../src/lib/decision/planner";
import * as llmAcademicGuardian from "../../src/lib/agents/llm-academic-guardian";
import * as llmExecutionRealist from "../../src/lib/agents/llm-execution-realist";
import * as llmJudge from "../../src/lib/agents/llm-judge";
import * as llmTimeMaximizer from "../../src/lib/agents/llm-time-maximizer";
import * as langfuseObservability from "../../src/lib/observability/langfuse";
import {
  resetTraceDelegateForTests,
  setTraceDelegateForTests
} from "../../src/lib/observability/langfuse";
import {
  generatePlan,
  generatePlanWithTuning
} from "../../src/server/actions/generate-plan";
import { retunePlan } from "../../src/server/actions/retune-plan";

afterEach(async () => {
  await db.generatedPlanItem.deleteMany();
  await db.generatedPlan.deleteMany();
  await db.shortTermModifier.deleteMany();
  await db.courseDetail.deleteMany();
  await db.semesterPhaseConfig.deleteMany();
  await db.userProfile.deleteMany();
  await db.timetableCourse.deleteMany();
  resetTraceDelegateForTests();
  vi.restoreAllMocks();
});

beforeEach(() => {
  setTraceDelegateForTests({
    withObservation: async (_name, _options, callback) =>
      callback({
        update: () => {}
      })
  });
});

async function seedPlanInputs() {
  await replaceImportedTimetableCourses([
    {
      course_name: "Morning Elective",
      time_slots: [{ day_of_week: 1, time: "第一.二节" }],
      location: "North Hall",
      teacher_name: "Prof. Lin"
    },
    {
      course_name: "Core Theory",
      time_slots: [{ day_of_week: 3, time: "第七.八节" }],
      location: "South Hall",
      teacher_name: "Prof. Xu"
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
    preferred_time_use_cases: ["study"],
    substitute_attendance_enabled: true,
    substitute_attendance_default_cost: 40,
    sign_in_then_leave_willingness: true,
    retroactive_remedy_enabled: false
  });

  await replaceSemesterPhaseConfig({
    phase_template: [
      { start_week: 1, end_week: 2, phase: "exploration" },
      { start_week: 3, end_week: 10, phase: "normal_release" },
      { start_week: 11, end_week: 14, phase: "post_midterm_release" },
      { start_week: 15, end_week: 16, phase: "final_tightening" }
    ]
  });

  await replaceShortTermModifiers({
    temporary_goal_shift: "protect study block",
    weather_modifier: "light rain"
  });

  await replaceCourseDetails([
    {
      course_name_ref: "Morning Elective",
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
      course_name_ref: "Core Theory",
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
}

describe("generatePlan", () => {
  it("forwards planning_llm_mode to the planner", async () => {
    await seedPlanInputs();

    const llmError = new Error("LLM unavailable");
    vi.spyOn(
      llmAcademicGuardian,
      "reviewCandidatesAsAcademicGuardianWithLlm"
    ).mockRejectedValue(llmError);
    vi.spyOn(
      llmExecutionRealist,
      "reviewCandidatesAsExecutionRealistWithLlm"
    ).mockRejectedValue(llmError);
    vi.spyOn(
      llmTimeMaximizer,
      "reviewCandidatesAsTimeMaximizerWithLlm"
    ).mockRejectedValue(llmError);
    vi.spyOn(llmJudge, "selectCandidateWithLlmJudge").mockRejectedValue(llmError);

    const spy = vi.spyOn(planner, "orchestratePlan");

    await generatePlanWithTuning(undefined, "debate_and_judge");

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        planning_llm_mode: "debate_and_judge"
      })
    );
  });

  it("builds and persists a generated plan from saved inputs", async () => {
    await seedPlanInputs();

    const result = await generatePlan();
    const savedPlan = await getLatestGeneratedPlan();

    expect(result.plan.plan_items.length).toBeGreaterThan(0);
    expect(result.plan.selected_candidate_id).toBeTruthy();
    expect(savedPlan?.plan_id).toBe(result.plan.plan_id);
  });

  it("flushes Langfuse tracing after plan generation", async () => {
    const flushSpy = vi
      .spyOn(langfuseObservability, "flushLangfuseTracing")
      .mockResolvedValue(undefined);
    await seedPlanInputs();

    await generatePlan();

    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});

describe("retunePlan", () => {
  it("regenerates the persisted plan in a more conservative direction", async () => {
    await seedPlanInputs();

    const baseline = await generatePlan();
    const retuned = await retunePlan({ tuning: "more_conservative" });

    const baselineMorning = baseline.plan.plan_items.find(
      (item: ActionPlanItemOutput) => item.course_id === "Morning Elective"
    );
    const retunedMorning = retuned.plan.plan_items.find(
      (item: ActionPlanItemOutput) => item.course_id === "Morning Elective"
    );

    expect(baselineMorning?.attendance_status).not.toBeUndefined();
    expect(retunedMorning?.attendance_status).not.toBeUndefined();
    expect(retuned.plan.plan_id).not.toBe(baseline.plan.plan_id);
  });
});
import type { ActionPlanItemOutput } from "../../src/lib/types/output";
