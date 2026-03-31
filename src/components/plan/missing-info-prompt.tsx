import React from "react";

import { localizeDisplayText } from "@/components/plan/display-text";

type MissingInfoPromptProps = {
  prompt?: string | null;
};

export default function MissingInfoPrompt({ prompt }: MissingInfoPromptProps) {
  if (!prompt) {
    return null;
  }

  return (
    <section className="card">
      <div className="section-title">
        <h2>信息补充提示</h2>
        <p>{localizeDisplayText(prompt)}</p>
      </div>
    </section>
  );
}
