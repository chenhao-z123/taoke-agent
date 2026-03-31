import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import type { ActionPlanOutput } from "../../src/lib/types/output";

const samplePlan: ActionPlanOutput = {
  plan_id: "plan-001",
  planning_window: {
    start_date: "2026-04-06",
    end_date: "2026-04-12",
    view: "this_week"
  },
  available_time_views: ["today", "this_week", "current_phase"],
  strategy_snapshot: {
    strategy_tier: "balanced",
    risk_tier: "medium",
    semester_phase: "normal_release",
    short_term_modifiers: {
      temporary_goal_shift: "protect study block"
    }
  },
  judge_short_rationale: "Balanced keeps objections manageable.",
  tuning_controls: {
    more_conservative: { hint: "Expect more attendance on borderline classes." },
    more_aggressive: { hint: "Expect more free time on borderline classes." }
  },
  selected_candidate_id: "balanced",
  judge_summary: "balanced best balances the current tradeoffs.",
  debate_summary: "academic_guardian: execution_friendly > balanced > time_priority",
  missing_info_prompt: "Low confidence in attendance information may affect one recommendation.",
  plan_items: [
    {
      plan_item_id: "plan-001-item-1",
      course_id: "Core Theory",
      date: "2026-04-07",
      time_slot: "08:00-09:35",
      attendance_status: "substitute_attendance",
      execution_note: "Use substitute attendance to preserve some safety.",
      event_feedback_allowed: true,
      risk_level: "medium"
    }
  ]
};

const { mockGetLatestGeneratedPlan } = vi.hoisted(() => ({
  mockGetLatestGeneratedPlan: vi.fn()
}));

vi.mock("../../src/lib/repo/plan", () => ({
  getLatestGeneratedPlan: mockGetLatestGeneratedPlan
}));

describe("Task 11 plan components", () => {
  it("renders the root layout with zh-CN language", async () => {
    const { default: RootLayout } = await import("../../src/app/layout");
    const html = renderToStaticMarkup(<RootLayout>{null}</RootLayout>);

    expect(html).toContain('lang="zh-CN"');
  });

  it("renders the plan table layout", async () => {
    const { default: PlanTable } = await import("../../src/components/plan/plan-table");
    const html = renderToStaticMarkup(<PlanTable plan={samplePlan} />);

    expect(html).toContain("Core Theory");
    expect(html).toContain("替代出勤");
    expect(html).toContain("本周");
  });

  it("renders tuning controls and summary helpers", async () => {
    const { default: TuningControls } = await import(
      "../../src/components/plan/tuning-controls"
    );
    const { default: JudgeRationale } = await import(
      "../../src/components/plan/judge-rationale"
    );
    const { default: MissingInfoPrompt } = await import(
      "../../src/components/plan/missing-info-prompt"
    );

    const tuningHtml = renderToStaticMarkup(
      <TuningControls
        plan={samplePlan}
        onGenerateAction={async () => {}}
        onRetuneAction={async () => {}}
      />
    );
    const rationaleHtml = renderToStaticMarkup(
      <JudgeRationale rationale={samplePlan.judge_short_rationale} />
    );
    const missingHtml = renderToStaticMarkup(
      <MissingInfoPrompt prompt={samplePlan.missing_info_prompt} />
    );

    expect(tuningHtml).toContain("更保守");
    expect(tuningHtml).toContain("更激进");
    expect(tuningHtml).toContain("按已保存输入重新生成");
    expect(rationaleHtml).toContain("裁决理由");
    expect(missingHtml).toContain("信息补充提示");
  });
});

describe("Task 11 page", () => {
  it("renders the action plan page with saved plan content", async () => {
    mockGetLatestGeneratedPlan.mockResolvedValue(samplePlan);

    const { default: PlanPage } = await import("../../src/app/plan/page");
    const html = renderToStaticMarkup(await PlanPage());

    expect(html).toContain("行动计划");
    expect(html).toContain("Core Theory");
    expect(html).toContain("平衡型");
    expect(html).toContain("更保守");
    expect(html).toContain("更激进");
  });

  it("renders a generate-plan control when no saved plan exists", async () => {
    mockGetLatestGeneratedPlan.mockResolvedValue(null);

    const { default: PlanPage } = await import("../../src/app/plan/page");
    const html = renderToStaticMarkup(await PlanPage());

    expect(html).toContain("尚未生成计划");
    expect(html).toContain("立即生成计划");
  });
});
