import React from "react";

import { localizeDisplayText } from "@/components/plan/display-text";
import type { ActionPlanOutput } from "@/lib/types/output";

type TuningControlsProps = {
  plan: ActionPlanOutput;
  onGenerateAction: () => Promise<void>;
  onRetuneAction: (formData: FormData) => Promise<void>;
};

export default function TuningControls({
  plan,
  onGenerateAction,
  onRetuneAction
}: TuningControlsProps) {
  const controls = [
    {
      label: "更保守",
      hint: plan.tuning_controls.more_conservative.hint,
      tuning: "more_conservative"
    },
    {
      label: "更激进",
      hint: plan.tuning_controls.more_aggressive.hint,
      tuning: "more_aggressive"
    }
  ];

  return (
    <section className="card">
      <div className="section-title">
        <h2>调节控制</h2>
        <p>需要重新生成时，可在这里调整计划方向。</p>
      </div>

      <form action={onGenerateAction} className="button-row">
        <button className="button secondary" type="submit">
          按已保存输入重新生成
        </button>
      </form>

      <div className="form-grid" style={{ marginTop: "16px" }}>
        {controls.map((control) => (
          <form key={control.label} action={onRetuneAction} className="panel">
            <input type="hidden" name="tuning" value={control.tuning} />
            <h3>{control.label}</h3>
            <p className="helper-text" style={{ marginTop: "8px" }}>
              {localizeDisplayText(control.hint) || "暂无说明。"}
            </p>
            <div className="button-row">
              <button className="button ghost" type="submit">
                {control.label}
              </button>
            </div>
          </form>
        ))}
      </div>
    </section>
  );
}
