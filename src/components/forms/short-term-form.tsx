"use client";

import React, { useState, useTransition } from "react";

import type { ShortTermModifiersInput } from "@/lib/types/input";

type ShortTermFormProps = {
  initialShortTerm: ShortTermModifiersInput | null;
  onSaveAction: (
    input: ShortTermModifiersInput
  ) => Promise<{ short_term_modifiers: ShortTermModifiersInput }>;
};

const parseOptionalText = (value: FormDataEntryValue | null) => {
  const text = value?.toString().trim();
  return text ? text : undefined;
};

export default function ShortTermForm({
  initialShortTerm,
  onSaveAction
}: ShortTermFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const upcomingEventsText = formData.get("upcoming_events")?.toString() ?? "";
    const upcomingEvents = upcomingEventsText
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payload: ShortTermModifiersInput = {
      weather_modifier: parseOptionalText(formData.get("weather_modifier")),
      temporary_goal_shift: parseOptionalText(formData.get("temporary_goal_shift")),
      body_state: parseOptionalText(formData.get("body_state")),
      time_value_adjustment_note: parseOptionalText(
        formData.get("time_value_adjustment_note")
      )
    };

    if (upcomingEvents.length > 0) {
      payload.upcoming_events = upcomingEvents;
    }

    startTransition(async () => {
      try {
        await onSaveAction(payload);
        setMessage("短期修正已保存。");
      } catch (error) {
        setErrorMessage("短期修正保存失败。");
      }
    });
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-title">
        <h2>短期调整</h2>
        <p>记录可能影响出勤决策的临时因素。</p>
      </div>

      <div className="form-grid" style={{ marginTop: "18px" }}>
        <div className="form-row">
          <label htmlFor="weather_modifier">天气修正</label>
          <input
            id="weather_modifier"
            name="weather_modifier"
            defaultValue={initialShortTerm?.weather_modifier ?? ""}
            placeholder="如：暴雨、极端高温"
          />
        </div>
        <div className="form-row">
          <label htmlFor="temporary_goal_shift">临时目标变化</label>
          <input
            id="temporary_goal_shift"
            name="temporary_goal_shift"
            defaultValue={initialShortTerm?.temporary_goal_shift ?? ""}
            placeholder="如：本周优先准备实验"
          />
        </div>
        <div className="form-row">
          <label htmlFor="body_state">身体状态</label>
          <input
            id="body_state"
            name="body_state"
            defaultValue={initialShortTerm?.body_state ?? ""}
            placeholder="如：精力较低、病后恢复中"
          />
        </div>
        <div className="form-row">
          <label htmlFor="time_value_adjustment_note">时间价值备注</label>
          <input
            id="time_value_adjustment_note"
            name="time_value_adjustment_note"
            defaultValue={initialShortTerm?.time_value_adjustment_note ?? ""}
            placeholder="如：本周空闲时间价值更高"
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: "12px" }}>
         <label htmlFor="upcoming_events">近期事件</label>
        <textarea
          id="upcoming_events"
          name="upcoming_events"
          defaultValue={(initialShortTerm?.upcoming_events ?? []).join("\n")}
           placeholder="每行填写一个事件"
        />
      </div>

      <div className="button-row">
        <button className="button" type="submit" disabled={isPending}>
          保存短期调整
        </button>
      </div>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="notice">{errorMessage}</div> : null}
    </form>
  );
}
