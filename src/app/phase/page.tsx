import React from "react";
import Link from "next/link";

import PhaseForm from "@/components/forms/phase-form";
import { getSemesterPhaseConfig } from "@/lib/repo/semester-phase";
import { saveSemesterPhase } from "@/server/actions/save-semester-phase";

export const dynamic = "force-dynamic";

export default async function PhasePage() {
  const config = await getSemesterPhaseConfig();

  return (
    <main className="page">
      <section className="section-title">
        <h1>学期阶段</h1>
        <p>调整默认阶段模板，并按需添加例外规则。</p>
      </section>

      <div className="nav-row">
        <Link href="/import">导入</Link>
        <Link href="/profile">偏好</Link>
        <Link className="active" href="/phase">
          阶段
        </Link>
        <Link href="/courses">课程</Link>
        <Link href="/adjust">调整</Link>
      </div>

      <PhaseForm initialConfig={config} onSaveAction={saveSemesterPhase} />

      <div className="button-row">
        <Link className="button" href="/courses">
          继续填写课程
        </Link>
        <Link className="button ghost" href="/profile">
          返回偏好
        </Link>
      </div>
    </main>
  );
}
