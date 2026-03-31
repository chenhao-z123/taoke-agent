import React from "react";
import Link from "next/link";

import CourseDetailForm from "@/components/forms/course-detail-form";
import { listCourseDetails } from "@/lib/repo/course-details";
import { listImportedTimetableCourses } from "@/lib/repo/timetable";
import { extractCourseDetailDraft } from "@/server/actions/extract-course-detail-draft";
import { saveCourseDetails } from "@/server/actions/save-course-details";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await listImportedTimetableCourses();
  const courseDetails = await listCourseDetails();

  return (
    <main className="page">
      <section className="section-title">
        <h1>课程详情</h1>
        <p>补充出勤规则、风险信号与信息置信度。</p>
      </section>

      <div className="nav-row">
        <Link href="/import">导入</Link>
        <Link href="/profile">偏好</Link>
        <Link href="/phase">阶段</Link>
        <Link className="active" href="/courses">
          课程
        </Link>
        <Link href="/adjust">调整</Link>
      </div>

      {courses.length === 0 ? (
        <div className="card">
          <h2>尚未导入课程</h2>
          <p>请先导入课表，之后才能编辑课程详情。</p>
          <div className="button-row">
            <Link className="button" href="/import">
              前往导入
            </Link>
          </div>
        </div>
      ) : (
        <CourseDetailForm
          courses={courses}
          initialDetails={courseDetails}
          onExtractDraftAction={extractCourseDetailDraft}
          onSaveAction={saveCourseDetails}
        />
      )}

      <div className="button-row">
        <Link className="button" href="/adjust">
          继续短期调整
        </Link>
        <Link className="button ghost" href="/phase">
          返回阶段
        </Link>
      </div>
    </main>
  );
}
