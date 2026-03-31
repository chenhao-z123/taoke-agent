import React from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

import JudgeRationale from "@/components/plan/judge-rationale";
import MissingInfoPrompt from "@/components/plan/missing-info-prompt";
import PlanTable from "@/components/plan/plan-table";
import TuningControls from "@/components/plan/tuning-controls";
import { localizeCandidateId, localizeDisplayText } from "@/components/plan/display-text";
import { getLatestGeneratedPlan } from "@/lib/repo/plan";
import { generatePlan } from "@/server/actions/generate-plan";
import { retunePlan } from "@/server/actions/retune-plan";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const plan = await getLatestGeneratedPlan();

  async function handleGeneratePlan() {
    "use server";

    await generatePlan();
    revalidatePath("/plan");
  }

  async function handleRetunePlan(formData: FormData) {
    "use server";

    const tuning = formData.get("tuning");

    if (tuning !== "more_conservative" && tuning !== "more_aggressive") {
      throw new Error("Invalid tuning control");
    }

    await retunePlan({ tuning });
    revalidatePath("/plan");
  }

  return (
    <main className="page">
      <section className="section-title">
        <h1>行动计划</h1>
        <p>查看最新计划结果，并以清晰、直观的方式安排下一步行动。</p>
      </section>

      <div className="nav-row">
        <Link href="/import">导入</Link>
        <Link href="/profile">偏好</Link>
        <Link href="/phase">阶段</Link>
        <Link href="/courses">课程</Link>
        <Link href="/adjust">调整</Link>
        <Link className="active" href="/plan">
          计划
        </Link>
      </div>

      {!plan ? (
        <section className="card">
          <div className="section-title">
            <h2>尚未生成计划</h2>
            <p>完成输入流程后，即可在这里生成并查看行动计划。</p>
          </div>
          <div className="button-row">
            <form action={handleGeneratePlan}>
              <button className="button" type="submit">
                立即生成计划
              </button>
            </form>
            <Link className="button secondary" href="/adjust">
              返回短期调整
            </Link>
            <Link className="button ghost" href="/">
              返回首页
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="section-title">
              <h2>计划总览</h2>
              <p>查看已保存计划的核心信息与裁决摘要。</p>
            </div>
            <div className="list" style={{ marginTop: "12px" }}>
              <div>
                <strong>计划编号：</strong> {plan.plan_id}
              </div>
              {plan.selected_candidate_id ? (
                <div>
                  <strong>当前方案：</strong> {localizeCandidateId(plan.selected_candidate_id)}
                </div>
              ) : null}
              {plan.judge_summary ? (
                <div>
                  <strong>裁决摘要：</strong> {localizeDisplayText(plan.judge_summary)}
                </div>
              ) : null}
              {plan.debate_summary ? (
                <div>
                  <strong>讨论摘要：</strong> {localizeDisplayText(plan.debate_summary)}
                </div>
              ) : null}
            </div>
          </section>

          <JudgeRationale rationale={plan.judge_short_rationale} />
          <MissingInfoPrompt prompt={plan.missing_info_prompt} />
          <PlanTable plan={plan} />
          <TuningControls
            plan={plan}
            onGenerateAction={handleGeneratePlan}
            onRetuneAction={handleRetunePlan}
          />
        </>
      )}
    </main>
  );
}
