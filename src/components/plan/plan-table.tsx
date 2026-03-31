import React from "react";

import type {
  ActionPlanItemOutput,
  ActionPlanOutput
} from "@/lib/types/output";
import {
  localizeAttendanceStatus,
  localizeDisplayText,
  localizeRiskTier,
  localizeSemesterPhase,
  localizeStrategyTier,
  localizeTimeView
} from "@/components/plan/display-text";

type PlanTableProps = {
  plan: ActionPlanOutput;
};

const buildShortTermSummary = (
  modifiers: ActionPlanOutput["strategy_snapshot"]["short_term_modifiers"]
) => {
  if (!modifiers) {
    return "无";
  }

  const parts: string[] = [];

  if (modifiers.temporary_goal_shift) {
    parts.push(`短期目标：${modifiers.temporary_goal_shift}`);
  }
  if (modifiers.weather_modifier) {
    parts.push(`天气：${modifiers.weather_modifier}`);
  }
  if (modifiers.body_state) {
    parts.push(`身体状态：${modifiers.body_state}`);
  }
  if (modifiers.time_value_adjustment_note) {
    parts.push(`时间价值调整：${modifiers.time_value_adjustment_note}`);
  }
  if (modifiers.upcoming_events?.length) {
    parts.push(`近期事件：${modifiers.upcoming_events.join("、")}`);
  }

  return parts.length > 0 ? parts.join("｜") : "无";
};

const buildDetailLines = (item: ActionPlanItemOutput) => {
  const lines: string[] = [];

  if (item.risk_level) {
    lines.push(`风险等级：${localizeRiskTier(item.risk_level)}`);
  }
  if (item.decision_confidence) {
    lines.push(`决策置信度：${localizeDisplayText(item.decision_confidence)}`);
  }
  if (item.missing_info_summary) {
    lines.push(`信息缺口：${localizeDisplayText(item.missing_info_summary)}`);
  }
  if (item.phase_context_note) {
    lines.push(localizeDisplayText(item.phase_context_note));
  }
  if (item.short_term_override_note) {
    lines.push(localizeDisplayText(item.short_term_override_note));
  }
  if (item.recorded_absence_impact) {
    lines.push(`记缺勤影响：${localizeDisplayText(item.recorded_absence_impact)}`);
  }
  if (item.rare_event_replan_note) {
    lines.push(localizeDisplayText(item.rare_event_replan_note));
  }
  if (item.constraint_hits && item.constraint_hits.length > 0) {
    lines.push(`命中约束：${item.constraint_hits.join("、")}`);
  }
  if (item.estimated_commute_time_cost !== undefined) {
    lines.push(`通勤时间成本：${item.estimated_commute_time_cost}`);
  }
  if (item.estimated_substitute_cost !== undefined) {
    lines.push(`替代出勤成本：${item.estimated_substitute_cost}`);
  }
  if (item.time_value_score !== undefined) {
    lines.push(`时间价值分：${item.time_value_score}`);
  }
  if (item.money_cost_score !== undefined) {
    lines.push(`金钱成本分：${item.money_cost_score}`);
  }
  if (item.event_feedback_allowed !== undefined) {
    lines.push(
      `事件反馈：${item.event_feedback_allowed ? "可提交" : "不可提交"}`
    );
  }

  return lines;
};

export default function PlanTable({ plan }: PlanTableProps) {
  const viewLabel = localizeTimeView(plan.planning_window.view);
  const dateRange = `${plan.planning_window.start_date} → ${
    plan.planning_window.end_date
  }`;
  const availableViews = plan.available_time_views
    ? plan.available_time_views.map(localizeTimeView).join("、")
    : "-";
  const snapshot = plan.strategy_snapshot;

  return (
    <section className="card">
        <div className="section-title">
          <h2>计划时间范围</h2>
          <p>
            视图：{viewLabel} · {dateRange}
          </p>
        </div>

      <div className="form-grid" style={{ marginTop: "16px" }}>
          <div className="panel">
          <h3>策略快照</h3>
          <div className="list" style={{ marginTop: "12px" }}>
            <div>
              <strong>策略风格：</strong> {localizeStrategyTier(snapshot.strategy_tier)}
            </div>
            <div>
              <strong>风险偏好：</strong> {localizeRiskTier(snapshot.risk_tier)}
            </div>
            <div>
              <strong>学期阶段：</strong> {localizeSemesterPhase(snapshot.semester_phase)}
            </div>
            <div>
              <strong>短期修正：</strong>{" "}
              {buildShortTermSummary(snapshot.short_term_modifiers)}
            </div>
          </div>
        </div>
        <div className="panel">
          <h3>可切换视图</h3>
          <p className="helper-text" style={{ marginTop: "12px" }}>
            {availableViews}
          </p>
        </div>
      </div>

      <div style={{ marginTop: "18px", overflowX: "auto" }}>
        {plan.plan_items.length === 0 ? (
          <p className="helper-text">当前还没有可显示的计划项。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>课程</th>
                <th>时间</th>
                <th>建议</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {plan.plan_items.map((item) => {
                const detailLines = buildDetailLines(item);
                const courseName = item.course_name_display ?? item.course_id;
                const location = item.location_display;
                const teacher = item.teacher_name_display;

                return (
                  <tr key={item.plan_item_id}>
                    <td>
                      <div>
                        <strong>{courseName}</strong>
                      </div>
                      {location ? (
                        <div className="helper-text">地点：{location}</div>
                      ) : null}
                      {teacher ? (
                        <div className="helper-text">教师：{teacher}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{item.date}</div>
                      <div className="helper-text">{item.time_slot}</div>
                    </td>
                    <td>
                      <div>
                        <strong>{localizeAttendanceStatus(item.attendance_status)}</strong>
                      </div>
                      <div className="helper-text">{localizeDisplayText(item.execution_note)}</div>
                      {item.must_attend_reason ? (
                        <div className="helper-text">
                          必须参加：{localizeDisplayText(item.must_attend_reason)}
                        </div>
                      ) : null}
                      {item.leave_early_note ? (
                        <div className="helper-text">{localizeDisplayText(item.leave_early_note)}</div>
                      ) : null}
                    </td>
                    <td>
                      {detailLines.length === 0 ? (
                        <span className="helper-text">-</span>
                      ) : (
                        <div className="helper-text">
                          {detailLines.map((line, index) => (
                            <div key={`${item.plan_item_id}-detail-${index}`}>{line}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
