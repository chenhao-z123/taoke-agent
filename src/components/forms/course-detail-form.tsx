"use client";

import React, { useMemo, useState, useTransition } from "react";

import type { CourseDetailDraftExtractionResult } from "@/lib/schema/extraction";
import type {
  AttendanceMode,
  CourseClass,
  CourseDetailInput,
  CourseTargetLevel,
  EscapeEnvironmentTag,
  EscapeFeasibilityTier,
  FieldConfidence,
  FrequencyTier,
  KeySessionType,
  PersonalFailRisk,
  SignInThenLeaveFeasibility,
  TimetableCourseInput
} from "@/lib/types/input";

type CourseDetailFormProps = {
  courses: TimetableCourseInput[];
  initialDetails: CourseDetailInput[];
  onExtractDraftAction: (input: {
    course_name_ref: string;
    raw_text: string;
    timetable_context?: TimetableCourseInput;
  }) => Promise<CourseDetailDraftExtractionResult>;
  onSaveAction: (
    input: CourseDetailInput[]
  ) => Promise<{ course_details: CourseDetailInput[] }>;
};

const courseClasses: CourseClass[] = ["core", "special", "easy"];
const courseTargetLevels: CourseTargetLevel[] = ["pass_only", "high_score_needed"];
const personalFailRisks: PersonalFailRisk[] = [
  "easy_to_fail",
  "possible_to_fail",
  "unlikely_to_fail"
];
const attendanceModes: AttendanceMode[] = [
  "full_roll_call_every_session",
  "random_student_check_every_session",
  "random_full_roll_call",
  "full_roll_call_when_class_small",
  "paper_sign_in_before_class",
  "location_based_sign_in",
  "qr_code_sign_in",
  "visual_or_verbal_confirmation",
  "unclear_or_irregular",
  "other_manual"
];
const frequencyTiers: FrequencyTier[] = ["low", "medium", "high", "unknown"];
const confidenceOptions: FieldConfidence[] = ["high", "medium", "low"];
const signInThenLeaveOptions: SignInThenLeaveFeasibility[] = ["no", "maybe", "yes"];
const escapeFeasibilityOptions: EscapeFeasibilityTier[] = ["easy", "medium", "hard"];
const escapeEnvironmentTags: EscapeEnvironmentTag[] = [
  "fixed_seating",
  "no_rear_route",
  "awkward_exit_path",
  "teacher_has_wide_line_of_sight",
  "small_classroom",
  "stairs_or_back_rows_available",
  "custom"
];
const keySessionTypes: KeySessionType[] = [
  "first_session",
  "midterm_related_session",
  "pre_final_session",
  "teacher_announced_important_session",
  "small_class_high_risk_session",
  "exam_hint_or_material_session",
  "assignment_check_session",
  "quiz_presentation_or_high_signin_session",
  "other_manual"
];
const specialCourseKinds = [
  "lab_or_experiment",
  "physical_education",
  "strict_attendance",
  "awkward_teacher",
  "hard_to_escape",
  "easy_to_fail",
  "other_manual"
];

const courseClassLabels: Record<CourseClass, string> = {
  core: "核心课",
  special: "特殊课",
  easy: "轻松课"
};

const confidenceLabels: Record<FieldConfidence, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const courseTargetLevelLabels: Record<CourseTargetLevel, string> = {
  pass_only: "只求通过",
  high_score_needed: "需要高分"
};

const personalFailRiskLabels: Record<PersonalFailRisk, string> = {
  easy_to_fail: "容易挂科",
  possible_to_fail: "可能挂科",
  unlikely_to_fail: "不太会挂科"
};

const attendanceModeLabels: Record<AttendanceMode, string> = {
  full_roll_call_every_session: "每次课全点名",
  random_student_check_every_session: "每次课随机点人",
  random_full_roll_call: "随机全点名",
  full_roll_call_when_class_small: "小班时全点名",
  paper_sign_in_before_class: "课前纸质签到",
  location_based_sign_in: "定位签到",
  qr_code_sign_in: "二维码签到",
  visual_or_verbal_confirmation: "口头/目视确认",
  unclear_or_irregular: "不明确/不固定",
  other_manual: "其他（手动补充）"
};

const frequencyLabels: Record<FrequencyTier, string> = {
  low: "低",
  medium: "中",
  high: "高",
  unknown: "未知"
};

const signInThenLeaveLabels: Record<SignInThenLeaveFeasibility, string> = {
  no: "不可行",
  maybe: "可能可行",
  yes: "可行"
};

const escapeFeasibilityLabels: Record<EscapeFeasibilityTier, string> = {
  easy: "容易",
  medium: "一般",
  hard: "困难"
};

const escapeEnvironmentLabels: Record<EscapeEnvironmentTag, string> = {
  fixed_seating: "固定座位",
  no_rear_route: "没有后排路线",
  awkward_exit_path: "离场路线尴尬",
  teacher_has_wide_line_of_sight: "老师视野覆盖广",
  small_classroom: "教室较小",
  stairs_or_back_rows_available: "可走楼梯或后排",
  custom: "自定义"
};

const keySessionLabels: Record<KeySessionType, string> = {
  first_session: "第一次课",
  midterm_related_session: "与期中相关的课",
  pre_final_session: "期末前关键课",
  teacher_announced_important_session: "老师明确强调的重要课",
  small_class_high_risk_session: "小班高风险课",
  exam_hint_or_material_session: "考试提示/划重点课",
  assignment_check_session: "作业检查课",
  quiz_presentation_or_high_signin_session: "测验/展示/高签到风险课",
  other_manual: "其他（手动补充）"
};

const specialCourseKindLabels: Record<(typeof specialCourseKinds)[number], string> = {
  lab_or_experiment: "实验/上机",
  physical_education: "体育课",
  strict_attendance: "严考勤课程",
  awkward_teacher: "老师风格难应对",
  hard_to_escape: "难以中途离开",
  easy_to_fail: "容易挂科",
  other_manual: "其他（手动补充）"
};

const defaultDetail = (courseName: string): CourseDetailInput => ({
  course_name_ref: courseName,
  course_class: "core",
  course_target_level: "pass_only",
  personal_fail_risk: "possible_to_fail",
  attendance_modes: ["unclear_or_irregular"],
  field_confidence: "medium"
});

const normalizeDetails = (
  courses: TimetableCourseInput[],
  initialDetails: CourseDetailInput[]
): CourseDetailInput[] => {
  const existingMap = new Map(
    initialDetails.map((detail) => [detail.course_name_ref, detail])
  );

  return courses.map((course) =>
    existingMap.get(course.course_name) ?? defaultDetail(course.course_name)
  );
};

const toggleArrayValue = <T,>(
  list: T[],
  value: T,
  enforceOne = false
): T[] => {
  if (list.includes(value)) {
    if (enforceOne && list.length === 1) {
      return list;
    }
    return list.filter((item) => item !== value);
  }
  return [...list, value];
};

export default function CourseDetailForm({
  courses,
  initialDetails,
  onExtractDraftAction,
  onSaveAction
}: CourseDetailFormProps) {
  const [details, setDetails] = useState<CourseDetailInput[]>(
    normalizeDetails(courses, initialDetails)
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [rawDraftInputs, setRawDraftInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeDetail = useMemo(() => details[activeIndex], [details, activeIndex]);

  const updateDetail = (patch: Partial<CourseDetailInput>) => {
    setDetails((prev) =>
      prev.map((detail, index) =>
        index === activeIndex ? { ...detail, ...patch } : detail
      )
    );
  };

  const updateRawDraftInput = (courseName: string, value: string) => {
    setRawDraftInputs((prev) => ({
      ...prev,
      [courseName]: value
    }));
  };

  const handleExtractDraft = () => {
    const rawText = rawDraftInputs[activeDetail.course_name_ref]?.trim() ?? "";

    setMessage(null);
    setErrorMessage(null);

    if (!rawText) {
      setErrorMessage("请先填写课程原始说明，再进行智能提取。");
      return;
    }

    startTransition(async () => {
      try {
        const result = await onExtractDraftAction({
          course_name_ref: activeDetail.course_name_ref,
          raw_text: rawText,
          timetable_context: courses[activeIndex]
        });
        updateDetail(result.draft);
        setMessage("已提取当前课程的结构化字段草稿。");
      } catch (error) {
        setErrorMessage("智能提取失败，请补充说明后重试。");
      }
    });
  };

  const handleSave = () => {
    setMessage(null);
    setErrorMessage(null);

    const payload = details.map((detail) => ({
      ...detail,
      special_reason_note: detail.special_reason_note?.trim() || undefined,
      grading_raw_note: detail.grading_raw_note?.trim() || undefined,
      course_notes: detail.course_notes?.trim() || undefined,
      absence_rule_note: detail.absence_rule_note?.trim() || undefined,
      attendance_requirement_raw_input:
        detail.attendance_requirement_raw_input?.trim() || undefined,
      attendance_requirement_structured_summary:
        detail.attendance_requirement_structured_summary?.trim() || undefined,
      escape_environment_note: detail.escape_environment_note?.trim() || undefined,
      substitute_attendance_note: detail.substitute_attendance_note?.trim() || undefined
    }));

    startTransition(async () => {
      try {
        await onSaveAction(payload);
         setMessage("课程详情已保存。");
      } catch (error) {
         setErrorMessage("课程详情保存失败，请检查必填项。");
      }
    });
  };

  if (!activeDetail) {
    return (
      <div className="card">
        <p>暂无课程可编辑，请先导入课表。</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-title">
        <h2>课程详情</h2>
        <p>请按课程逐一补充信息，置信度标记将帮助规划器判断建议可靠性。</p>
      </div>

      <div className="split" style={{ marginTop: "18px" }}>
        <div className="panel">
          <h3>课程列表</h3>
          <div className="list" style={{ marginTop: "12px" }}>
            {courses.map((course, index) => (
              <button
                key={course.course_name}
                className={index === activeIndex ? "active" : undefined}
                type="button"
                onClick={() => setActiveIndex(index)}
              >
                <strong>{course.course_name}</strong>
                <div className="helper-text">
                  {course.time_slots.length} 个课次
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>{activeDetail.course_name_ref}</h3>

          <div className="form-row" style={{ marginTop: "12px" }}>
            <label>课程原始说明</label>
            <textarea
              value={rawDraftInputs[activeDetail.course_name_ref] ?? ""}
              onChange={(event) =>
                updateRawDraftInput(activeDetail.course_name_ref, event.target.value)
              }
              placeholder="粘贴课程说明、考勤规则、老师要求、评分方式等原始文本。"
            />
            <div className="button-row">
              <button
                className="button secondary"
                type="button"
                onClick={handleExtractDraft}
                disabled={isPending}
              >
                智能提取当前课程信息
              </button>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: "12px" }}>
            <div className="form-row">
               <label>课程类型</label>
              <select
                value={activeDetail.course_class}
                onChange={(event) =>
                  updateDetail({ course_class: event.target.value as CourseClass })
                }
              >
                {courseClasses.map((option) => (
                  <option key={option} value={option}>
                    {courseClassLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
               <label>字段置信度</label>
              <select
                value={activeDetail.field_confidence ?? ""}
                onChange={(event) =>
                  updateDetail({
                    field_confidence: event.target.value
                      ? (event.target.value as FieldConfidence)
                      : undefined
                  })
                }
              >
                 <option value="">未设置</option>
                {confidenceOptions.map((option) => (
                  <option key={option} value={option}>
                    {confidenceLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
               <label>课程目标等级</label>
              <select
                value={activeDetail.course_target_level}
                onChange={(event) =>
                  updateDetail({
                    course_target_level: event.target.value as CourseTargetLevel
                  })
                }
              >
                {courseTargetLevels.map((option) => (
                  <option key={option} value={option}>
                    {courseTargetLevelLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
               <label>个人挂科风险</label>
              <select
                value={activeDetail.personal_fail_risk}
                onChange={(event) =>
                  updateDetail({
                    personal_fail_risk: event.target.value as PersonalFailRisk
                  })
                }
              >
                {personalFailRisks.map((option) => (
                  <option key={option} value={option}>
                    {personalFailRiskLabels[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeDetail.course_class === "special" ? (
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <div className="form-row">
                 <label>特殊课程子类型</label>
                <select
                  value={activeDetail.special_course_kind ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      special_course_kind: event.target.value
                        ? (event.target.value as CourseDetailInput["special_course_kind"])
                        : undefined
                    })
                  }
                >
                   <option value="">请选择</option>
                  {specialCourseKinds.map((option) => (
                    <option key={option} value={option}>
                     {specialCourseKindLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                 <label>特殊原因备注</label>
                <textarea
                  value={activeDetail.special_reason_note ?? ""}
                  onChange={(event) =>
                    updateDetail({ special_reason_note: event.target.value })
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="panel" style={{ marginTop: "18px" }}>
             <h3>出勤方式</h3>
            <div className="pill-row" style={{ marginTop: "12px" }}>
              {attendanceModes.map((mode) => (
                <label key={mode} className="pill">
                  <input
                    type="checkbox"
                    checked={activeDetail.attendance_modes.includes(mode)}
                    onChange={() =>
                      updateDetail({
                        attendance_modes: toggleArrayValue(
                          activeDetail.attendance_modes,
                          mode,
                          true
                        )
                      })
                    }
                  />
                  {attendanceModeLabels[mode]}
                </label>
              ))}
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <div className="form-row">
                 <label>全点名频率</label>
                <select
                  value={activeDetail.full_roll_call_frequency_tier ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      full_roll_call_frequency_tier: event.target.value
                        ? (event.target.value as FrequencyTier)
                        : undefined
                    })
                  }
                >
                   <option value="">未设置</option>
                  {frequencyTiers.map((option) => (
                    <option key={option} value={option}>
                      {frequencyLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                 <label>抽查频率</label>
                <select
                  value={activeDetail.random_check_frequency_tier ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      random_check_frequency_tier: event.target.value
                        ? (event.target.value as FrequencyTier)
                        : undefined
                    })
                  }
                >
                   <option value="">未设置</option>
                  {frequencyTiers.map((option) => (
                    <option key={option} value={option}>
                      {frequencyLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>原始出勤要求</label>
              <textarea
                value={activeDetail.attendance_requirement_raw_input ?? ""}
                onChange={(event) =>
                  updateDetail({ attendance_requirement_raw_input: event.target.value })
                }
              />
            </div>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>出勤要求摘要</label>
              <textarea
                value={activeDetail.attendance_requirement_structured_summary ?? ""}
                onChange={(event) =>
                  updateDetail({
                    attendance_requirement_structured_summary: event.target.value
                  })
                }
              />
            </div>
          </div>

          <div className="panel" style={{ marginTop: "18px" }}>
             <h3>缺勤规则与关键课次</h3>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <div className="form-row">
                 <label>最大记缺勤次数</label>
                <input
                  type="number"
                  min={0}
                  value={activeDetail.max_recorded_absences ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      max_recorded_absences: event.target.value
                        ? Number(event.target.value)
                        : undefined
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>挂科阈值缺勤次数</label>
                <input
                  type="number"
                  min={0}
                  value={activeDetail.fail_threshold_absences ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      fail_threshold_absences: event.target.value
                        ? Number(event.target.value)
                        : undefined
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>每次缺勤扣分</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={activeDetail.score_loss_per_recorded_absence ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      score_loss_per_recorded_absence: event.target.value
                        ? Number(event.target.value)
                        : undefined
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>缺勤规则置信度</label>
                <select
                  value={activeDetail.absence_rule_confidence ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      absence_rule_confidence: event.target.value
                        ? (event.target.value as FieldConfidence)
                        : undefined
                    })
                  }
                >
                   <option value="">未设置</option>
                  {confidenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {confidenceLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>缺勤规则备注</label>
              <textarea
                value={activeDetail.absence_rule_note ?? ""}
                onChange={(event) =>
                  updateDetail({ absence_rule_note: event.target.value })
                }
              />
            </div>
            <label className="pill" style={{ marginTop: "12px" }}>
              <input
                type="checkbox"
                checked={activeDetail.has_mandatory_sessions ?? false}
                onChange={(event) =>
                  updateDetail({ has_mandatory_sessions: event.target.checked })
                }
              />
               存在必须参加的课次
            </label>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>关键课次类型</label>
              <div className="pill-row">
                {keySessionTypes.map((option) => (
                  <label key={option} className="pill">
                    <input
                      type="checkbox"
                      checked={activeDetail.key_session_types?.includes(option) ?? false}
                      onChange={() =>
                        updateDetail({
                          key_session_types: toggleArrayValue(
                            activeDetail.key_session_types ?? [],
                            option
                          )
                        })
                      }
                    />
                    {keySessionLabels[option]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: "18px" }}>
             <h3>执行可行性</h3>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <div className="form-row">
                 <label>签到后离开可行性</label>
                <select
                  value={activeDetail.sign_in_then_leave_feasibility ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      sign_in_then_leave_feasibility: event.target.value
                        ? (event.target.value as SignInThenLeaveFeasibility)
                        : undefined
                    })
                  }
                >
                   <option value="">未设置</option>
                  {signInThenLeaveOptions.map((option) => (
                    <option key={option} value={option}>
                      {signInThenLeaveLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                 <label>撤离可行性等级</label>
                <select
                  value={activeDetail.escape_feasibility_tier ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      escape_feasibility_tier: event.target.value
                        ? (event.target.value as EscapeFeasibilityTier)
                        : undefined
                    })
                  }
                >
                   <option value="">未设置</option>
                  {escapeFeasibilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {escapeFeasibilityLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>撤离环境标签</label>
              <div className="pill-row">
                {escapeEnvironmentTags.map((option) => (
                  <label key={option} className="pill">
                    <input
                      type="checkbox"
                      checked={activeDetail.escape_environment_tags?.includes(option) ?? false}
                      onChange={() =>
                        updateDetail({
                          escape_environment_tags: toggleArrayValue(
                            activeDetail.escape_environment_tags ?? [],
                            option
                          )
                        })
                      }
                    />
                    {escapeEnvironmentLabels[option]}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>撤离环境备注</label>
              <textarea
                value={activeDetail.escape_environment_note ?? ""}
                onChange={(event) =>
                  updateDetail({ escape_environment_note: event.target.value })
                }
              />
            </div>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <label className="pill">
                <input
                  type="checkbox"
                  checked={activeDetail.substitute_attendance_allowed_for_course ?? false}
                  onChange={(event) =>
                    updateDetail({
                      substitute_attendance_allowed_for_course: event.target.checked
                    })
                  }
                />
                 允许替代出勤
              </label>
              <div className="form-row">
                 <label>替代出勤成本覆写</label>
                <input
                  type="number"
                  min={0}
                  value={activeDetail.substitute_attendance_cost_override ?? ""}
                  onChange={(event) =>
                    updateDetail({
                      substitute_attendance_cost_override: event.target.value
                        ? Number(event.target.value)
                        : undefined
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>替代出勤备注</label>
                <input
                  value={activeDetail.substitute_attendance_note ?? ""}
                  onChange={(event) =>
                    updateDetail({ substitute_attendance_note: event.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: "18px" }}>
             <h3>备注</h3>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>评分备注</label>
              <textarea
                value={activeDetail.grading_raw_note ?? ""}
                onChange={(event) =>
                  updateDetail({ grading_raw_note: event.target.value })
                }
              />
            </div>
            <div className="form-row" style={{ marginTop: "12px" }}>
               <label>课程备注</label>
              <textarea
                value={activeDetail.course_notes ?? ""}
                onChange={(event) => updateDetail({ course_notes: event.target.value })}
              />
            </div>
          </div>

          {activeDetail.course_class === "special" &&
          !activeDetail.special_reason_note ? (
            <div className="notice" style={{ marginTop: "12px" }}>
               特殊课程在保存前必须填写原因备注。
            </div>
          ) : null}
        </div>
      </div>

      <div className="button-row">
        <button className="button" type="button" onClick={handleSave} disabled={isPending}>
           保存课程详情
        </button>
      </div>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="notice">{errorMessage}</div> : null}
    </div>
  );
}
