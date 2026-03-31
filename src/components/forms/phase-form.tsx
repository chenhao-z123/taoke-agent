"use client";

import React, { useMemo, useState, useTransition } from "react";

import type {
  SemesterPhase,
  SemesterPhaseConfigInput,
  SemesterPhaseSegment
} from "@/lib/types/input";

type PhaseFormProps = {
  initialConfig: SemesterPhaseConfigInput | null;
  onSaveAction: (
    input: SemesterPhaseConfigInput
  ) => Promise<{ semester_phase_config: SemesterPhaseConfigInput }>;
};

const defaultTemplate: SemesterPhaseSegment[] = [
  { start_week: 1, end_week: 2, phase: "exploration" },
  { start_week: 3, end_week: 7, phase: "normal_release" },
  { start_week: 8, end_week: 9, phase: "midterm_tightening" },
  { start_week: 10, end_week: 13, phase: "post_midterm_release" },
  { start_week: 14, end_week: 16, phase: "final_tightening" }
];

const phaseOptions: SemesterPhase[] = [
  "exploration",
  "normal_release",
  "midterm_tightening",
  "post_midterm_release",
  "final_tightening"
];

const phaseLabels: Record<SemesterPhase, string> = {
  exploration: "探索期",
  normal_release: "常规放松期",
  midterm_tightening: "期中收紧期",
  post_midterm_release: "期中后放松期",
  final_tightening: "期末收紧期"
};

const emptyOverride = (): SemesterPhaseSegment => ({
  start_week: 1,
  end_week: 1,
  phase: "normal_release",
  note: ""
});

export default function PhaseForm({
  initialConfig,
  onSaveAction
}: PhaseFormProps) {
  const initialTemplate = useMemo(
    () => initialConfig?.phase_template ?? defaultTemplate,
    [initialConfig]
  );
  const [templateSegments, setTemplateSegments] = useState<SemesterPhaseSegment[]>(
    initialTemplate
  );
  const [overrideSegments, setOverrideSegments] = useState<SemesterPhaseSegment[]>(
    initialConfig?.phase_rule_overrides ?? []
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateTemplate = (index: number, patch: Partial<SemesterPhaseSegment>) => {
    setTemplateSegments((prev) =>
      prev.map((segment, idx) => (idx === index ? { ...segment, ...patch } : segment))
    );
  };

  const updateOverride = (index: number, patch: Partial<SemesterPhaseSegment>) => {
    setOverrideSegments((prev) =>
      prev.map((segment, idx) => (idx === index ? { ...segment, ...patch } : segment))
    );
  };

  const handleSubmit = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const payload: SemesterPhaseConfigInput = {
      phase_template: templateSegments.map((segment) => ({
        ...segment,
        start_week: Number(segment.start_week),
        end_week: Number(segment.end_week),
        note: segment.note?.trim() || undefined
      }))
    };

    if (overrideSegments.length > 0) {
      payload.phase_rule_overrides = overrideSegments.map((segment) => ({
        ...segment,
        start_week: Number(segment.start_week),
        end_week: Number(segment.end_week),
        note: segment.note?.trim() || undefined
      }));
    }

    startTransition(async () => {
      try {
        await onSaveAction(payload);
        setMessage("学期阶段配置已保存。");
      } catch (error) {
        setErrorMessage("学期阶段配置保存失败。");
      }
    });
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="section-title">
        <h2>学期阶段模板</h2>
        <p>编辑本学期默认阶段流程，并按需添加例外规则。</p>
      </div>

      <div className="panel" style={{ marginTop: "16px" }}>
         <h3>阶段模板</h3>
        <div className="list" style={{ marginTop: "12px" }}>
          {templateSegments.map((segment, index) => (
            <div key={`template-${index}`} className="form-grid">
              <div className="form-row">
                 <label>开始周</label>
                <input
                  type="number"
                  min={1}
                  value={segment.start_week}
                  onChange={(event) =>
                    updateTemplate(index, {
                      start_week: Number(event.target.value)
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>结束周</label>
                <input
                  type="number"
                  min={1}
                  value={segment.end_week}
                  onChange={(event) =>
                    updateTemplate(index, {
                      end_week: Number(event.target.value)
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>阶段</label>
                <select
                  value={segment.phase}
                  onChange={(event) =>
                    updateTemplate(index, {
                      phase: event.target.value as SemesterPhase
                    })
                  }
                >
                  {phaseOptions.map((phase) => (
                    <option key={phase} value={phase}>
                       {phaseLabels[phase]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                 <label>备注</label>
                <input
                  value={segment.note ?? ""}
                  onChange={(event) =>
                    updateTemplate(index, { note: event.target.value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: "16px" }}>
        <div className="section-title">
           <h3>阶段例外规则</h3>
           <p className="helper-text">可选的细粒度例外设置。</p>
        </div>
        <div className="list" style={{ marginTop: "12px" }}>
          {overrideSegments.map((segment, index) => (
            <div key={`override-${index}`} className="form-grid">
              <div className="form-row">
                 <label>开始周</label>
                <input
                  type="number"
                  min={1}
                  value={segment.start_week}
                  onChange={(event) =>
                    updateOverride(index, {
                      start_week: Number(event.target.value)
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>结束周</label>
                <input
                  type="number"
                  min={1}
                  value={segment.end_week}
                  onChange={(event) =>
                    updateOverride(index, {
                      end_week: Number(event.target.value)
                    })
                  }
                />
              </div>
              <div className="form-row">
                 <label>阶段</label>
                <select
                  value={segment.phase}
                  onChange={(event) =>
                    updateOverride(index, {
                      phase: event.target.value as SemesterPhase
                    })
                  }
                >
                  {phaseOptions.map((phase) => (
                    <option key={phase} value={phase}>
                       {phaseLabels[phase]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                 <label>备注</label>
                <input
                  value={segment.note ?? ""}
                  onChange={(event) =>
                    updateOverride(index, { note: event.target.value })
                  }
                />
              </div>
              <div className="form-row">
                <label>&nbsp;</label>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    setOverrideSegments((prev) =>
                      prev.filter((_, idx) => idx !== index)
                    )
                  }
                >
                   删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            type="button"
            onClick={() => setOverrideSegments((prev) => [...prev, emptyOverride()])}
          >
             添加例外规则
          </button>
        </div>
      </div>

      <div className="button-row">
        <button className="button" type="submit" disabled={isPending}>
           保存学期阶段配置
        </button>
      </div>

      {message ? <div className="success">{message}</div> : null}
      {errorMessage ? <div className="notice">{errorMessage}</div> : null}
    </form>
  );
}
