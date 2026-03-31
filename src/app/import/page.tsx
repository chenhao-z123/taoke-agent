import React from "react";
import Link from "next/link";

import ImportForm from "@/components/forms/import-form";
import { listImportedTimetableCourses } from "@/lib/repo/timetable";
import { extractImportedTimetable } from "@/server/actions/extract-imported-timetable";
import { saveImportedTimetable } from "@/server/actions/save-imported-timetable";

export const dynamic = "force-dynamic";

export default async function ImportPage(props: {
  searchParams?: Promise<{ debug?: string | string[] | undefined }>;
}) {
  const courses = await listImportedTimetableCourses();
  const resolvedSearchParams = await props?.searchParams;
  const debugParam = resolvedSearchParams?.debug;
  const debugRawOutput = Array.isArray(debugParam)
    ? debugParam[0] === "1"
    : debugParam === "1";

  return (
    <main className="page">
      <section className="section-title">
        <h1>导入课表</h1>
        <p>粘贴来自教务系统或课表导出的文本内容。</p>
      </section>

      <div className="nav-row">
        <Link className="active" href="/import">
          导入
        </Link>
        <Link href="/profile">偏好</Link>
        <Link href="/phase">阶段</Link>
        <Link href="/courses">课程</Link>
        <Link href="/adjust">调整</Link>
      </div>

      <ImportForm
        initialCourses={courses}
        onExtractAction={extractImportedTimetable}
        onSaveAction={saveImportedTimetable}
        debugRawOutput={debugRawOutput}
      />

      <div className="button-row">
        <Link className="button" href="/profile">
          继续填写偏好
        </Link>
        <Link className="button ghost" href="/">
          返回首页
        </Link>
      </div>
    </main>
  );
}
