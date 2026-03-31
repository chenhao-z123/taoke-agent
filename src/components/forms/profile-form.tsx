"use client";

import React, { useMemo, useState, useTransition } from "react";

import type {
  PlanningMode,
  PreferredTimeUseCase,
  ScoreBufferPreference,
  StrategyTier,
  UserProfileInput
} from "@/lib/types/input";

type ProfileFormProps = {
  initialProfile: UserProfileInput | null;
  onSaveAction: (input: UserProfileInput) => Promise<{ profile: UserProfileInput }>;
};

type FreeTimeTargetType = NonNullable<UserProfileInput["free_time_target"]>["type"];

const defaultProfile: UserProfileInput = {
  planning_mode: "safe_max_mode",
  strategy_tier: "balanced",
  risk_tier: "medium",
  execution_pressure: "medium",
  score_buffer_preference: "some",
  prefer_large_blocks: true,
  prefer_skip_early_classes: false,
  prefer_skip_late_classes: false,
  substitute_attendance_enabled: false,
  sign_in_then_leave_willingness: false,
  retroactive_remedy_enabled: false
};

const planningModes: PlanningMode[] = ["safe_max_mode", "target_free_time_mode"];
const strategyTiers: StrategyTier[] = ["safe", "balanced", "aggressive"];
const scoreBuffers: ScoreBufferPreference[] = ["minimal", "some", "large"];
const preferredTimeUseCases: PreferredTimeUseCase[] = [
  "study",
  "internship",
  "travel",
  "sleep",
  "gaming",
  "custom"
];

const weekdayOptions = [
  { label: "周日", value: 0 },
  { label: "周一", value: 1 },
  { label: "周二", value: 2 },
  { label: "周三", value: 3 },
  { label: "周四", value: 4 },
  { label: "周五", value: 5 },
  { label: "周六", value: 6 }
];

const planningModeLabels: Record<PlanningMode, string> = {
  safe_max_mode: "稳妥上限模式",
  target_free_time_mode: "目标空闲时间模式"
};

const strategyTierLabels: Record<StrategyTier, string> = {
  safe: "稳妥型",
  balanced: "平衡型",
  aggressive: "进取型"
};

const scoreBufferLabels: Record<ScoreBufferPreference, string> = {
  minimal: "尽量少",
  some: "适中",
  large: "尽量多"
};

const useCaseLabels: Record<PreferredTimeUseCase, string> = {
  study: "学习",
  internship: "实习",
  travel: "出行",
  sleep: "睡眠",
  gaming: "娱乐",
  custom: "自定义"
};

export default function ProfileForm({
  initialProfile,
  onSaveAction
}: ProfileFormProps) {
  const mergedProfile = useMemo(
    () => ({ ...defaultProfile, ...initialProfile }),
    [initialProfile]
  );
  const [planningMode, setPlanningMode] = useState<PlanningMode>(
    mergedProfile.planning_mode
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const freeTimeTargetValue = formData.get("free_time_target_value")?.toString();
    const freeTimeTargetType = formData.get("free_time_target_type")?.toString();
    const maxRecordedAbsences = formData
      .get("max_recorded_absences_override")
      ?.toString();
    const substituteCost = formData
      .get("substitute_attendance_default_cost")
      ?.toString();

    const preferredWeekdays = formData
      .getAll("preferred_weekdays")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    const preferredUseCases = formData
      .getAll("preferred_time_use_cases")
      .map((value) => value.toString()) as PreferredTimeUseCase[];

    const payload: UserProfileInput = {
      planning_mode: planningMode,
      strategy_tier: formData.get("strategy_tier") as StrategyTier,
      risk_tier: formData.get("risk_tier") as UserProfileInput["risk_tier"],
      execution_pressure: formData.get(
        "execution_pressure"
      ) as UserProfileInput["execution_pressure"],
      score_buffer_preference: formData.get(
        "score_buffer_preference"
      ) as ScoreBufferPreference,
      prefer_large_blocks: formData.get("prefer_large_blocks") === "on",
      prefer_skip_early_classes: formData.get("prefer_skip_early_classes") === "on",
      prefer_skip_late_classes: formData.get("prefer_skip_late_classes") === "on",
      substitute_attendance_enabled:
        formData.get("substitute_attendance_enabled") === "on",
      sign_in_then_leave_willingness:
        formData.get("sign_in_then_leave_willingness") === "on",
      retroactive_remedy_enabled:
        formData.get("retroactive_remedy_enabled") === "on"
    };

    if (planningMode === "target_free_time_mode" && freeTimeTargetValue) {
      payload.free_time_target = {
        type: (freeTimeTargetType ?? "sessions") as FreeTimeTargetType,
        value: Number(freeTimeTargetValue)
      };
    }

    if (maxRecordedAbsences) {
      payload.max_recorded_absences_override = Number(maxRecordedAbsences);
    }

    if (formData.get("caught_risk_tolerance_note")) {
      payload.caught_risk_tolerance_note = formData
        .get("caught_risk_tolerance_note")
        ?.toString();
    }

    if (preferredWeekdays.length > 0) {
      payload.preferred_weekdays = preferredWeekdays;
    }

    if (preferredUseCases.length > 0) {
      payload.preferred_time_use_cases = preferredUseCases;
    }

    if (substituteCost) {
      payload.substitute_attendance_default_cost = Number(substituteCost);
    }

    startTransition(async () => {
      try {
        await onSaveAction(payload);
        setMessage("偏好设置已保存。");
      } catch (error) {
        setErrorMessage("偏好设置保存失败，请检查必填项。");
      }
    });
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-title">
        <h2>偏好与设置</h2>
        <p>
          设置你的规划模式与风险倾向，生成计划前仍可随时继续调整。
        </p>
      </div>

      <div className="form-grid" style={{ marginTop: "18px" }}>
        <div className="form-row">
          <label htmlFor="planning_mode">规划模式</label>
          <select
            id="planning_mode"
            name="planning_mode"
            value={planningMode}
            onChange={(event) =>
              setPlanningMode(event.target.value as PlanningMode)
            }
          >
            {planningModes.map((mode) => (
              <option key={mode} value={mode}>
                {planningModeLabels[mode]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="strategy_tier">策略风格</label>
          <select
            id="strategy_tier"
            name="strategy_tier"
            defaultValue={mergedProfile.strategy_tier}
          >
            {strategyTiers.map((tier) => (
              <option key={tier} value={tier}>
                {strategyTierLabels[tier]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="risk_tier">风险承受度</label>
          <select id="risk_tier" name="risk_tier" defaultValue={mergedProfile.risk_tier}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="execution_pressure">执行压力</label>
          <select
            id="execution_pressure"
            name="execution_pressure"
            defaultValue={mergedProfile.execution_pressure}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="score_buffer_preference">成绩缓冲偏好</label>
          <select
            id="score_buffer_preference"
            name="score_buffer_preference"
            defaultValue={mergedProfile.score_buffer_preference}
          >
            {scoreBuffers.map((buffer) => (
              <option key={buffer} value={buffer}>
                {scoreBufferLabels[buffer]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {planningMode === "target_free_time_mode" ? (
        <div className="card" style={{ marginTop: "18px" }}>
          <div className="section-title">
            <h3>空闲时间目标</h3>
            <p>仅在目标空闲时间模式下需要填写。</p>
          </div>
          <div className="form-grid" style={{ marginTop: "12px" }}>
            <div className="form-row">
              <label htmlFor="free_time_target_type">目标类型</label>
              <select
                id="free_time_target_type"
                name="free_time_target_type"
                defaultValue={mergedProfile.free_time_target?.type ?? "sessions"}
              >
                 <option value="sessions">课次数</option>
                 <option value="hours">小时</option>
                 <option value="usable_hours">可用小时</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="free_time_target_value">目标数值</label>
              <input
                id="free_time_target_value"
                name="free_time_target_value"
                type="number"
                min={0}
                step={0.5}
                defaultValue={mergedProfile.free_time_target?.value ?? ""}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: "18px" }}>
        <div className="section-title">
          <h3>偏好提示</h3>
          <p>这些轻量提示会影响计划生成方向。</p>
        </div>
        <div className="pill-row" style={{ marginTop: "12px" }}>
          <label className="pill">
            <input
              name="prefer_large_blocks"
              type="checkbox"
              defaultChecked={mergedProfile.prefer_large_blocks}
            />
            偏好整块空闲时间
          </label>
          <label className="pill">
            <input
              name="prefer_skip_early_classes"
              type="checkbox"
              defaultChecked={mergedProfile.prefer_skip_early_classes}
            />
            偏好跳过早课
          </label>
          <label className="pill">
            <input
              name="prefer_skip_late_classes"
              type="checkbox"
              defaultChecked={mergedProfile.prefer_skip_late_classes}
            />
            偏好跳过晚课
          </label>
        </div>
      </div>

      <div className="card" style={{ marginTop: "18px" }}>
        <div className="section-title">
          <h3>出勤灵活度</h3>
          <p>描述替代出勤或签到后离开的现实可行性。</p>
        </div>
        <div className="form-grid" style={{ marginTop: "12px" }}>
          <label className="pill">
            <input
              name="substitute_attendance_enabled"
              type="checkbox"
              defaultChecked={mergedProfile.substitute_attendance_enabled}
            />
            接受替代出勤
          </label>
          <label className="pill">
            <input
              name="sign_in_then_leave_willingness"
              type="checkbox"
              defaultChecked={mergedProfile.sign_in_then_leave_willingness}
            />
            接受签到后离开
          </label>
          <label className="pill">
            <input
              name="retroactive_remedy_enabled"
              type="checkbox"
              defaultChecked={mergedProfile.retroactive_remedy_enabled}
            />
            可以事后补救
          </label>
        </div>
        <div className="form-grid" style={{ marginTop: "12px" }}>
          <div className="form-row">
            <label htmlFor="substitute_attendance_default_cost">
              替代出勤默认成本
            </label>
            <input
              id="substitute_attendance_default_cost"
              name="substitute_attendance_default_cost"
              type="number"
              min={0}
              step={1}
              defaultValue={mergedProfile.substitute_attendance_default_cost ?? ""}
            />
          </div>
          <div className="form-row">
            <label htmlFor="max_recorded_absences_override">
               最大记缺勤次数覆写
            </label>
            <input
              id="max_recorded_absences_override"
              name="max_recorded_absences_override"
              type="number"
              min={0}
              step={1}
              defaultValue={mergedProfile.max_recorded_absences_override ?? ""}
            />
          </div>
          <div className="form-row">
             <label htmlFor="caught_risk_tolerance_note">被抓风险备注</label>
            <input
              id="caught_risk_tolerance_note"
              name="caught_risk_tolerance_note"
              defaultValue={mergedProfile.caught_risk_tolerance_note ?? ""}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "18px" }}>
        <div className="section-title">
          <h3>空闲时间用途偏好</h3>
          <p>当你希望保留空闲时间时，可填写这些可选提示。</p>
        </div>
        <div className="form-row" style={{ marginTop: "12px" }}>
           <label>偏好日期</label>
          <div className="pill-row">
            {weekdayOptions.map((option) => (
              <label key={option.value} className="pill">
                <input
                  type="checkbox"
                  name="preferred_weekdays"
                  value={option.value}
                  defaultChecked={mergedProfile.preferred_weekdays?.includes(
                    option.value
                  )}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-row" style={{ marginTop: "12px" }}>
           <label>偏好时间用途</label>
          <div className="pill-row">
            {preferredTimeUseCases.map((useCase) => (
              <label key={useCase} className="pill">
                <input
                  type="checkbox"
                  name="preferred_time_use_cases"
                  value={useCase}
                  defaultChecked={mergedProfile.preferred_time_use_cases?.includes(
                    useCase
                  )}
                />
                 {useCaseLabels[useCase]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="button-row">
        <button className="button" type="submit" disabled={isPending}>
          保存偏好设置
        </button>
      </div>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="notice">{errorMessage}</div> : null}
    </form>
  );
}
