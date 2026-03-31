"use client";

import React, { useState, useTransition } from "react";

import type {
  CourseDetailInput,
  RareEventFeedbackInput,
  RareEventType
} from "@/lib/types/input";

type RareEventFormProps = {
  courses: CourseDetailInput[];
  onSaveAction: (input: {
    course_name_ref: string;
    feedback: RareEventFeedbackInput;
  }) => Promise<{ course_detail: CourseDetailInput }>;
};

const rareEventTypes: RareEventType[] = [
  "rare_full_roll_call",
  "rare_random_check",
  "unexpected_sign_in",
  "teacher_became_stricter",
  "other_manual"
];

const rareEventTypeLabels: Record<RareEventType, string> = {
  rare_full_roll_call: "罕见全点名",
  rare_random_check: "罕见随机抽查",
  unexpected_sign_in: "突发签到",
  teacher_became_stricter: "老师变严格",
  other_manual: "其他（手动补充）"
};

export default function RareEventForm({
  courses,
  onSaveAction
}: RareEventFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const courseName = formData.get("course_name_ref")?.toString() ?? "";

    if (!courseName) {
      setErrorMessage("请先选择课程，再提交反馈。");
      return;
    }

    const feedback: RareEventFeedbackInput = {
      event_type: formData.get("event_type") as RareEventType
    };

    const note = formData.get("note")?.toString().trim();
    const occurredAt = formData.get("occurred_at")?.toString().trim();

    if (note) {
      feedback.note = note;
    }
    if (occurredAt) {
      feedback.occurred_at = occurredAt;
    }

    startTransition(async () => {
      try {
        await onSaveAction({ course_name_ref: courseName, feedback });
         setMessage("罕见事件反馈已保存。");
      } catch (error) {
         setErrorMessage("罕见事件反馈保存失败。");
      }
    });
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-title">
         <h2>罕见事件反馈</h2>
         <p>
           报告低概率出勤事件，以便规划器调整后续建议。
         </p>
      </div>

      {courses.length === 0 ? (
        <div className="notice" style={{ marginTop: "12px" }}>
           请先补充课程详情，再提交罕见事件反馈。
        </div>
      ) : (
        <>
          <div className="form-grid" style={{ marginTop: "18px" }}>
            <div className="form-row">
               <label htmlFor="course_name_ref">课程</label>
              <select id="course_name_ref" name="course_name_ref" defaultValue="">
                 <option value="">请选择课程</option>
                {courses.map((course) => (
                  <option key={course.course_name_ref} value={course.course_name_ref}>
                    {course.course_name_ref}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
               <label htmlFor="event_type">事件类型</label>
              <select id="event_type" name="event_type" defaultValue={rareEventTypes[0]}>
                {rareEventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>
                    {rareEventTypeLabels[eventType]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
               <label htmlFor="occurred_at">发生时间</label>
              <input
                id="occurred_at"
                name="occurred_at"
                 placeholder="2026-03-10"
              />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: "12px" }}>
             <label htmlFor="note">备注</label>
             <textarea id="note" name="note" placeholder="请描述发生了什么。" />
          </div>
          <div className="button-row">
            <button className="button" type="submit" disabled={isPending}>
               提交罕见事件
            </button>
          </div>
        </>
      )}

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="notice">{errorMessage}</div> : null}
    </form>
  );
}
