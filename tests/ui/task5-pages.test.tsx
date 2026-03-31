import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";

import type {
  CourseDetailInput,
  SemesterPhaseConfigInput,
  ShortTermModifiersInput,
  TimetableCourseInput,
  UserProfileInput
} from "../../src/lib/types/input";
import type { TimetableExtractionResult } from "../../src/lib/schema/extraction";

import CourseDetailForm from "../../src/components/forms/course-detail-form";
import ImportForm from "../../src/components/forms/import-form";
import PhaseForm from "../../src/components/forms/phase-form";
import ProfileForm from "../../src/components/forms/profile-form";
import RareEventForm from "../../src/components/forms/rare-event-form";
import ShortTermForm from "../../src/components/forms/short-term-form";


vi.mock("../../src/lib/repo/timetable", () => ({
  listImportedTimetableCourses: vi.fn().mockResolvedValue([])
}));

vi.mock("../../src/lib/repo/user-profile", () => ({
  getUserProfile: vi.fn().mockResolvedValue(null)
}));

vi.mock("../../src/lib/repo/semester-phase", () => ({
  getSemesterPhaseConfig: vi.fn().mockResolvedValue(null)
}));

vi.mock("../../src/lib/repo/course-details", () => ({
  listCourseDetails: vi.fn().mockResolvedValue([])
}));

vi.mock("../../src/lib/repo/short-term", () => ({
  getShortTermModifiers: vi.fn().mockResolvedValue(null)
}));

describe("Task 5 form components", () => {
  it("renders the import form layout", () => {
    const html = renderToStaticMarkup(
      <ImportForm
        initialCourses={[]}
        onExtractAction={async () => ({ courses: [], malformed_rows: [], warnings: [] })}
        onSaveAction={async () => ({ courses: [] })}
      />
    );

    expect(html).toContain("粘贴课表");
    expect(html).toContain("上传课表截图");
    expect(html).toContain("上传 Excel / CSV");
    expect(html).toContain("粘贴截图");
    expect(html).toContain("智能解析预览");
    expect(html).toContain("原始补充说明");
  });

  it("shows pending parse feedback and disables parse while extracting", () => {
    const html = renderToStaticMarkup(
      <ImportForm
        initialCourses={[]}
        onExtractAction={async () => ({ courses: [], malformed_rows: [], warnings: [] })}
        onSaveAction={async () => ({ courses: [] })}
        pendingOverride
      />
    );

    expect(html).toContain("解析状态");
    expect(html).toContain("智能解析进行中");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>智能解析预览<\/button>/);
  });

  it("renders extraction warnings after parsing", () => {
    const html = renderToStaticMarkup(
      <ImportForm
        initialCourses={[]}
        onExtractAction={async () => ({ courses: [], malformed_rows: [], warnings: [] })}
        onSaveAction={async () => ({ courses: [] })}
        initialParseResult={{
          courses: [],
          malformed_rows: [],
          warnings: ["未识别到完整的课程行"]
        }}
      />
    );

    expect(html).toContain("解析提示");
    expect(html).toContain("未识别到完整的课程行");
  });

  it("hides debug raw output by default", () => {
    const parseResult = {
      courses: [],
      malformed_rows: [],
      warnings: [],
      raw_output: "DEBUG_RAW_OUTPUT"
    } as TimetableExtractionResult & { raw_output: string };

    const html = renderToStaticMarkup(
      <ImportForm
        initialCourses={[]}
        onExtractAction={async () => ({ courses: [], malformed_rows: [], warnings: [] })}
        onSaveAction={async () => ({ courses: [] })}
        initialParseResult={parseResult}
      />
    );

    expect(html).not.toContain("DEBUG_RAW_OUTPUT");
  });

  it("shows debug raw output when enabled", () => {
    const parseResult = {
      courses: [],
      malformed_rows: [],
      warnings: [],
      raw_output: "DEBUG_RAW_OUTPUT"
    } as TimetableExtractionResult & { raw_output: string };

    const DebugImportForm =
      ImportForm as React.ComponentType<
        React.ComponentProps<typeof ImportForm> & { debugRawOutput?: boolean }
      >;

    const html = renderToStaticMarkup(
      <DebugImportForm
        initialCourses={[]}
        onExtractAction={async () => ({ courses: [], malformed_rows: [], warnings: [] })}
        onSaveAction={async () => ({ courses: [] })}
        initialParseResult={parseResult}
        debugRawOutput
      />
    );

    expect(html).toContain("DEBUG_RAW_OUTPUT");
  });

  it("renders server-provided extraction errors instead of a generic message", async () => {
    const onExtractAction = vi
      .fn()
      .mockRejectedValue(new Error("模型输出无效：BAD_OUTPUT_MARKER"));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    root.render(
      <ImportForm
        initialCourses={[]}
        onExtractAction={onExtractAction}
        onSaveAction={async () => ({ courses: [] })}
      />
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const textarea = container.querySelector(
      "#timetable-text"
    ) as HTMLTextAreaElement | null;
    expect(textarea).toBeTruthy();

    if (textarea) {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      valueSetter?.call(textarea, "课程名 | 周一 09:00-10:30");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    await Promise.resolve();

    const parseButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "智能解析预览"
    );
    expect(parseButton).toBeTruthy();

    parseButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.innerHTML).toContain("模型输出无效：BAD_OUTPUT_MARKER");

    root.unmount();
    container.remove();
  });

  it("renders the profile form layout", () => {
    const html = renderToStaticMarkup(
      <ProfileForm
        initialProfile={null}
        onSaveAction={async () => ({ profile: {} as UserProfileInput })}
      />
    );

    expect(html).toContain("规划模式");
    expect(html).toContain("策略风格");
    expect(html).toContain("稳妥上限模式");
    expect(html).toContain("平衡型");
  });

  it("renders the semester phase form layout", () => {
    const html = renderToStaticMarkup(
      <PhaseForm
        initialConfig={null}
        onSaveAction={async () =>
          ({ semester_phase_config: {} as SemesterPhaseConfigInput })
        }
      />
    );

    expect(html).toContain("学期阶段模板");
    expect(html).toContain("探索期");
  });

  it("renders the course detail form layout", () => {
    const courses: TimetableCourseInput[] = [
      {
        course_name: "Physics",
        time_slots: [{ day_of_week: 1, time: "第一.二节" }]
      }
    ];

    const html = renderToStaticMarkup(
      <CourseDetailForm
        courses={courses}
        initialDetails={[]}
        onExtractDraftAction={async () => ({
          draft: { course_name_ref: "Physics" },
          warnings: [],
          missing_fields: []
        })}
        onSaveAction={async () => ({ course_details: [] as CourseDetailInput[] })}
      />
    );

    expect(html).toContain("课程类型");
    expect(html).toContain("出勤方式");
    expect(html).toContain("核心课");
    expect(html).toContain("口头/目视确认");
    expect(html).toContain("智能提取当前课程信息");
    expect(html).toContain("课程原始说明");
  });

  it("renders the short-term modifier form layout", () => {
    const html = renderToStaticMarkup(
      <ShortTermForm
        initialShortTerm={null}
        onSaveAction={async () =>
          ({ short_term_modifiers: {} as ShortTermModifiersInput })
        }
      />
    );

    expect(html).toContain("天气修正");
    expect(html).toContain("近期事件");
  });

  it("renders the rare event report form layout", () => {
    const courses: CourseDetailInput[] = [
      {
        course_name_ref: "Physics",
        course_class: "core",
        course_target_level: "pass_only",
        personal_fail_risk: "possible_to_fail",
        attendance_modes: ["unclear_or_irregular"]
      }
    ];

    const html = renderToStaticMarkup(
      <RareEventForm
        courses={courses}
        onSaveAction={async () => ({ course_detail: {} as CourseDetailInput })}
      />
    );

    expect(html).toContain("罕见事件反馈");
    expect(html).toContain("老师变严格");
  });
});

describe("Task 5 pages", () => {
  it("renders the landing page", async () => {
    const { default: HomePage } = await import("../../src/app/page");
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain("校园能耗优化器");
    expect(html).toContain("开始录入流程");
  });

  it("renders the import page", async () => {
    const { default: ImportPage } = await import("../../src/app/import/page");
    const html = renderToStaticMarkup(await ImportPage({}));

    expect(html).toContain("导入课表");
  });

  it("renders the profile page", async () => {
    const { default: ProfilePage } = await import("../../src/app/profile/page");
    const html = renderToStaticMarkup(await ProfilePage());

    expect(html).toContain("偏好与设置");
  });

  it("renders the phase page", async () => {
    const { default: PhasePage } = await import("../../src/app/phase/page");
    const html = renderToStaticMarkup(await PhasePage());

    expect(html).toContain("学期阶段");
  });

  it("renders the courses page", async () => {
    const { default: CoursesPage } = await import("../../src/app/courses/page");
    const html = renderToStaticMarkup(await CoursesPage());

    expect(html).toContain("课程详情");
  });

  it("renders the adjust page", async () => {
    const { default: AdjustPage } = await import("../../src/app/adjust/page");
    const html = renderToStaticMarkup(await AdjustPage());

    expect(html).toContain("短期调整");
  });
});
