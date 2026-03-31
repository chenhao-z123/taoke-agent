import type { ActionPlanItemOutput, TimeView } from "@/lib/types/output";
import type { RiskTier, SemesterPhase, StrategyTier } from "@/lib/types/input";

const candidateLabels = {
  time_priority: "时间优先",
  balanced: "平衡型",
  execution_friendly: "执行友好型"
} as const;

const agentRoleLabels = {
  academic_guardian: "学业守护者",
  time_maximizer: "时间最大化者",
  execution_realist: "执行现实派"
} as const;

const strategyTierLabels: Record<StrategyTier, string> = {
  safe: "稳妥型",
  balanced: "平衡型",
  aggressive: "进取型"
};

const riskTierLabels: Record<RiskTier, string> = {
  low: "低",
  medium: "中",
  high: "高"
};

const semesterPhaseLabels: Record<SemesterPhase, string> = {
  exploration: "探索期",
  normal_release: "常规放松期",
  midterm_tightening: "期中收紧期",
  post_midterm_release: "期中后放松期",
  final_tightening: "期末收紧期"
};

const timeViewLabels: Record<TimeView, string> = {
  today: "今日",
  this_week: "本周",
  current_phase: "当前阶段",
  custom: "自定义"
};

const attendanceStatusLabels: Record<ActionPlanItemOutput["attendance_status"], string> = {
  skip: "跳过",
  substitute_attendance: "替代出勤",
  arrive_then_leave_early: "到场后提前离开",
  attend_full: "全程出勤"
};

const phraseReplacements: Array<[string, string]> = [
  ["Balanced keeps objections manageable.", "平衡型方案让整体反对意见更可控。"],
  [
    "Low confidence in attendance information may affect one recommendation.",
    "出勤信息置信度较低，可能影响其中一条建议。"
  ],
  [
    "Low confidence in course attendance information may affect this recommendation.",
    "课程出勤信息置信度较低，可能影响这条建议。"
  ],
  ["Use substitute attendance to preserve some safety.", "采用替代出勤，以保留一定稳妥空间。"],
  [
    "Use substitute attendance to keep coverage without spending a full in-person block.",
    "采用替代出勤，在不占用完整到课时段的前提下保持覆盖。"
  ],
  [
    "Skip this occurrence to preserve a higher-value free-time block.",
    "跳过这次课程，以保留更高价值的整块空闲时间。"
  ],
  [
    "Show up briefly, then leave early to preserve some time while reducing risk.",
    "先到场完成必要出勤，再提前离开，以兼顾时间与风险。"
  ],
  [
    "Attend in full because the current risk or execution profile does not support a freer action.",
    "当前风险或执行条件不支持更自由的选择，因此建议全程出勤。"
  ],
  [
    "Attend the first session during exploration to gather course signals.",
    "探索阶段建议参加第一次课，以收集课程信号。"
  ],
  [
    "Attend the pre-final session because final-period classes stay conservative.",
    "临近期末时建议参加考前关键课次，以保持稳妥。"
  ],
  ["Attend this key session because it is marked as important.", "该课次被标记为关键课，建议参加。"],
  ["This occurrence was replanned with bounded rare event caution.", "该课次已根据罕见事件进行有限重规划。"],
  ["Replanned with extra rare event caution.", "已按罕见事件谨慎重规划。"],
  ["best balances the current tradeoffs.", "最能兼顾当前取舍。"],
  ["keeps objections manageable.", "让整体反对意见保持在可控范围内。"]
];

const tokenReplacements = new Map<string, string>([
  ...Object.entries(candidateLabels),
  ...Object.entries(agentRoleLabels)
]);

export function localizeTimeView(view: TimeView): string {
  return timeViewLabels[view] ?? view;
}

export function localizeAttendanceStatus(
  status: ActionPlanItemOutput["attendance_status"]
): string {
  return attendanceStatusLabels[status] ?? status;
}

export function localizeStrategyTier(value: StrategyTier): string {
  return strategyTierLabels[value] ?? value;
}

export function localizeRiskTier(value: RiskTier): string {
  return riskTierLabels[value] ?? value;
}

export function localizeSemesterPhase(value: SemesterPhase): string {
  return semesterPhaseLabels[value] ?? value;
}

export function localizeCandidateId(value?: string | null): string {
  if (!value) {
    return "";
  }

  return candidateLabels[value as keyof typeof candidateLabels] ?? value;
}

export function localizeDisplayText(value?: string | null): string {
  if (!value) {
    return "";
  }

  let localized = value;

  for (const [source, target] of phraseReplacements) {
    localized = localized.replaceAll(source, target);
  }

  for (const [source, target] of tokenReplacements) {
    localized = localized.replaceAll(source, target);
  }

  return localized;
}
