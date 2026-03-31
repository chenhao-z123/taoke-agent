import React from "react";

import { localizeDisplayText } from "@/components/plan/display-text";

type JudgeRationaleProps = {
  rationale?: string | null;
};

export default function JudgeRationale({ rationale }: JudgeRationaleProps) {
  if (!rationale) {
    return null;
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>裁决理由</h2>
        <p>{localizeDisplayText(rationale)}</p>
      </div>
    </section>
  );
}
