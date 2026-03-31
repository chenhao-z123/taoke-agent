import React from "react";
import Link from "next/link";

import RareEventForm from "@/components/forms/rare-event-form";
import ShortTermForm from "@/components/forms/short-term-form";
import { listCourseDetails } from "@/lib/repo/course-details";
import { getShortTermModifiers } from "@/lib/repo/short-term";
import { reportRareEvent } from "@/server/actions/report-rare-event";
import { saveShortTerm } from "@/server/actions/save-short-term";

export const dynamic = "force-dynamic";

export default async function AdjustPage() {
  const shortTerm = await getShortTermModifiers();
  const courseDetails = await listCourseDetails();

  return (
    <main className="page">
      <section className="section-title">
        <h1>短期调整</h1>
        <p>记录临时修正因素与罕见事件反馈。</p>
      </section>

      <div className="nav-row">
        <Link href="/import">导入</Link>
        <Link href="/profile">偏好</Link>
        <Link href="/phase">阶段</Link>
        <Link href="/courses">课程</Link>
        <Link className="active" href="/adjust">
          调整
        </Link>
      </div>

      <ShortTermForm initialShortTerm={shortTerm} onSaveAction={saveShortTerm} />
      <RareEventForm courses={courseDetails} onSaveAction={reportRareEvent} />

      <div className="button-row">
        <Link className="button ghost" href="/courses">
          返回课程
        </Link>
        <Link className="button" href="/">
          返回首页
        </Link>
      </div>
    </main>
  );
}
