# Campus Energy Optimizer — Compressed Handoff (2026-03-24)

## 1. Current state

The repo is currently in a healthy state from a code-verification perspective:

- `pnpm test` ✅ (`28` files, `137` tests)
- `pnpm typecheck` ✅

This session focused on three connected areas:

1. screenshot timetable extraction hardening
2. debug visibility for malformed or empty extraction results
3. lightweight external tracing integration via Langfuse

---

## 2. Screenshot extraction status

### Implemented

- `/import` supports single-image screenshot input
  - file upload
  - paste image
- screenshot extraction now uses a **two-stage path** in `src/lib/extraction/timetable-llm.ts`
  - stage 1: screenshot → `raw_text`
  - stage 2: `raw_text` → final timetable JSON
- extraction normalization was improved in `src/lib/schema/extraction.ts`
  - OCR-like weekday values normalized
  - Chinese weekday values like `周二` / `星期二` normalized
  - non-ideal time strings normalized toward `HH:MM`
- provider JSON recovery was hardened in `src/lib/llm/openai-compatible-provider.ts`
  - plain JSON
  - fenced JSON
  - wrapped JSON text

### Important current behavior

Screenshot extraction is **slow by architecture** right now because pure screenshot flow does **two sequential LLM calls**.

Observed real runtime symptom:

- `/import` POSTs taking roughly `70s-118s`

This is not a fake UI bug. The UI bug that made it feel worse was fixed:

- parse button now disables while pending
- visible parse status is shown
- warnings are surfaced

### Known weak point still present

If stage 1 returns empty or poor `raw_text`, stage 2 can still produce a **legal but empty** result:

```json
{
  "courses": [],
  "malformed_rows": [],
  "warnings": ["No input text was provided for extraction."]
}
```

So "解析完成，但未识别到课程" does **not** mean the post-filter was too strict. It usually means screenshot stage 1 did not recover useful text.

---

## 3. Debug visibility status

### Implemented

- invalid schema output is now surfaced instead of being collapsed into a generic message
- `/import?debug=1` shows **final raw model output**

This means:

- if the model returns malformed JSON / schema-invalid JSON, the page can show the raw payload
- if the result is valid but empty, the page can still show the final raw output when debug mode is enabled

### Not implemented yet

There is **not yet** a full per-call debug UI for:

- screenshot stage 1 raw output
- screenshot stage 2 raw output
- prompt contents

We discussed this and concluded that the correct long-term answer is not more ad-hoc page debug, but a real tracing system.

---

## 4. Langfuse tracing status

### Implemented

Lightweight optional Langfuse integration was added.

New dependency/config path:

- `@langfuse/tracing`
- `@langfuse/otel`
- `@opentelemetry/sdk-node`

Main integration file:

- `src/lib/observability/langfuse.ts`

Current tracing coverage:

- provider-level generation tracing for all `generateObject()` calls
- semantic trace steps for extraction and planner/agent flows

Current semantic step names include:

- `timetable.extract`
- `timetable.screenshot_stage1`
- `timetable.screenshot_stage2`
- `timetable.direct_extraction`
- `course_detail.extract`
- `planner.orchestrate`
- `planner.agent.academic_guardian`
- `planner.agent.time_maximizer`
- `planner.agent.execution_realist`
- `planner.judge.llm`

### Important implementation property

Tracing is **optional**.

If Langfuse env keys are absent, tracing becomes a no-op and does not block app behavior.

---

## 5. Current blocker / unresolved operational issue

The user's latest note is that **Langfuse governance/compliance approval is not yet settled**.

That means:

- the code integration exists
- the project is ready to emit traces
- but real production usage may still be blocked by organizational or regulatory review

So tracing is technically wired, but not yet fully operational from a rollout perspective.

---

## 6. Provider/model status note

Current model/provider usage is **not fully pinned down**.

The user's latest note:

- model used in testing is **not fully certain**
- it is **basically Alibaba Cloud family** (`阿里云系`)

This is important because earlier sessions also had provider/model drift across:

- Qwen-compatible paths
- Alibaba-compatible endpoints
- DeepSeek-related targets

### Practical consequence

Do **not** assume current runtime behavior reflects one stable model target.

Before any deeper extraction-quality debugging, re-check:

- `LLM_PROVIDER`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `LLM_API_KEY`

The exact test target is still a live uncertainty.

---

## 7. Most relevant files now

### Tracing

- `src/lib/observability/langfuse.ts`
- `src/lib/llm/openai-compatible-provider.ts`
- `src/lib/llm/provider.ts`

### Screenshot extraction

- `src/lib/extraction/timetable-llm.ts`
- `src/lib/schema/extraction.ts`
- `src/server/actions/extract-imported-timetable.ts`

### Import/debug UI

- `src/app/import/page.tsx`
- `src/components/forms/import-form.tsx`

### Planner / agent tracing

- `src/lib/decision/planner.ts`
- `src/lib/agents/llm-academic-guardian.ts`
- `src/lib/agents/llm-time-maximizer.ts`
- `src/lib/agents/llm-execution-realist.ts`
- `src/lib/agents/llm-judge.ts`

---

## 8. Most likely next steps

### Priority 1 — stabilize the real model target

Confirm the actual runtime model/provider being used in testing.

Right now, debugging extraction quality without a fixed target is noisy.

### Priority 2 — improve screenshot failure semantics

Most useful next product fix:

- if screenshot stage 1 produces empty `raw_text`, stop early and report that explicitly
- avoid treating that state as a silent "successful but empty" extraction

### Priority 3 — decide tracing rollout path

Once Langfuse governance is resolved:

- set real Langfuse cloud env vars
- run a real smoke trace
- verify trace visibility for screenshot stage 1/stage 2 and planner flows

### Priority 4 — only if needed, add deeper extraction debug

If screenshot quality remains poor after target-model stabilization:

- expose stage 1 raw output separately
- compare stage 1 output vs stage 2 output
- use that to determine whether the issue is visual reading or structuring