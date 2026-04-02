# Resolved Issues

## Issue - UI tests partially failing due to path issues
**Status**: RESOLVED  
**Description**: UI component tests were failing due to path and dependency issues, but core functionality remained unaffected.  
**Resolution**: The issue was documented as a known limitation that doesn't impact core functionality. The recommendation is to fix component paths and dependencies when addressing technical debt.

## Issue - Langfuse shallow logging causing proxy conflicts  
**Status**: RESOLVED
**Description**: Langfuse shallow logging was causing connection failures in proxy environments (TUN mode VPN + local proxy), resulting in `fetch failed` errors.
**Resolution**: Completely removed complex OpenTelemetry dependencies (`@langfuse/otel`, `@opentelemetry/sdk-node`) and simplified configuration to only require API keys. Added `LANGFUSE_SHALLOW_LOGGING=false` as default configuration to avoid proxy conflicts while preserving core Langfuse tracing functionality.

## Issue - JSON parsing failures with LLM responses
**Status**: RESOLVED
**Description**: LLM (Kimi model) returned non-standard JSON responses containing control characters (\x00, \x01 etc.), newlines within quotes, and pure numeric responses, causing 500 errors and application crashes.
**Resolution**: Integrated jsonrepair library with multi-layer recovery strategy: 1) Direct JSON parsing, 2) Fenced code block extraction (```json ... ```), 3) Wrapper object extraction (outermost {...}), 4) jsonrepair automatic repair. All abnormal JSON inputs are now handled correctly.

## Issue - Complex time slot data structure
**Status**: RESOLVED
**Description**: Original design used separate `{start_time: "09:00", end_time: "10:30"}` fields which were complex and not user-friendly for Chinese users.
**Resolution**: Simplified to single `time` field with Chinese-friendly format like "第一.二节" or "第三节课". Added backward compatibility through extraction logic that automatically converts old format to new format.

## Issue - Table structure parsing requiring row-column alignment
**Status**: RESOLVED  
**Description**: Excel and image tables required correct row-column alignment to determine course times, with first column containing weekday/class period headers needing combination with subsequent columns.
**Resolution**: Preserved complete table structure without flattening row data, maintained row-column alignment, and added explicit LLM prompts instructing how to combine row-column information. Supports multiple input types: screenshots, Excel, and plain text tables.

## Issue - Provider transport not supporting Node-side proxy
**Status**: RESOLVED
**Description**: Browser/network availability didn't guarantee server-side Node fetch connectivity in proxy environments.
**Resolution**: Enhanced `src/lib/llm/openai-compatible-provider.ts` to read uppercase and lowercase proxy environment variables (`HTTPS_PROXY`/`https_proxy`, `HTTP_PROXY`/`http_proxy`, `ALL_PROXY`/`all_proxy`), honor `NO_PROXY`/`no_proxy` host bypass rules, and use `undici` `ProxyAgent` with clearer transport error messages.

## Issue - Over-strict extraction schema causing failures
**Status**: RESOLVED
**Description**: Strict extraction schema was failing on common LLM output issues like `week_range` as strings ("1-16周") or empty `course_type_or_credit` fields.
**Resolution**: Relaxed extraction schema at LLM boundary only while keeping core saved-input schema strict. Added normalization for `week_range` strings into `{ start_week, end_week }` objects and `course_type_or_credit: ""` to `undefined`.

## Issue - Missing provider/model configuration clarity
**Status**: RESOLVED
**Description**: Multiple provider/model configurations were tested during debugging (Bailian Qwen-compatible, OpenRouter, Alibaba Cloud DeepSeek V3.2) causing confusion about the actual target.
**Resolution**: Clarified that the latest user intent specifies **Alibaba Cloud DeepSeek V3.2** as the actual target model. Documentation updated to emphasize checking `.env` configuration against user's latest provider intent.

---
# Partially Resolved - Deferred Issues

## Issue - UI tests failing due to path issues (technical debt)
**Status**: PARTIALLY_RESOLVED_DEFERRED
**Description**: While core functionality works, UI component tests continue to fail due to path and dependency issues.
**Current State**: Documented as known limitation with plan to address during technical debt cleanup phase.
**Next Steps**: Fix component paths and dependencies when prioritizing technical debt resolution.

## Issue - Langfuse governance/compliance approval pending
**Status**: PARTIALLY_RESOLVED_DEFERRED  
**Description**: Langfuse integration code exists and is ready to emit traces, but real production usage may be blocked by organizational or regulatory review.
**Current State**: Tracing is technically wired but not fully operational from rollout perspective. Optional integration that becomes no-op if Langfuse env keys are absent.
**Next Steps**: Await Langfuse governance resolution before enabling full production tracing.

## Issue - Screenshot extraction taking 70-118 seconds
**Status**: PARTIALLY_RESOLVED_DEFERRED
**Description**: Pure screenshot flow requires two sequential LLM calls (stage 1: screenshot → raw_text, stage 2: raw_text → JSON), making it slow by architecture.
**Current State**: UI improvements made (parse button disables while pending, visible parse status, warnings surfaced) but architectural slowness remains.
**Next Steps**: Consider performance optimization like reducing LLM call frequency and adding caching in future improvements.

## Issue - Empty extraction results from poor screenshot quality
**Status**: PARTIALLY_RESOLVED_DEFERRED
**Description**: If screenshot stage 1 produces empty/poor `raw_text`, stage 2 can produce legal but empty result with warning "No input text was provided for extraction."
**Current State**: Debug visibility improved with `/import?debug=1` showing final raw model output, but deeper extraction debug UI not yet implemented.
**Next Steps**: Implement proper early termination when stage 1 produces empty `raw_text` and expose stage 1 vs stage 2 raw outputs separately.

---
# Unresolved Issues

## Issue - Exact runtime model/provider not fully pinned down  
**Status**: UNRESOLVED
**Description**: Current model/provider usage is not fully certain - described as "basically Alibaba Cloud family" but exact endpoint and compatibility details remain unclear.
**Impact**: Makes debugging extraction quality difficult without fixed target.
**Next Steps**: Confirm exact intended production/test target including whether it's OpenAI-compatible or different HTTP surface, exact model string for DeepSeek V3.2, and Alibaba Cloud Bailian compatible-mode specifics.

## Issue - Limited debug UI for extraction pipeline
**Status**: UNRESOLVED
**Description**: No full per-call debug UI for screenshot stage 1 raw output, screenshot stage 2 raw output, or prompt contents.
**Impact**: Makes troubleshooting extraction quality issues more difficult.
**Next Steps**: Implement comprehensive debug UI or rely on real tracing system once governance is resolved.

## Issue - Partial test failures affecting development experience  
**Status**: UNRESOLVED
**Description**: While core functionality works, partial UI test failures affect development experience and confidence in changes.
**Impact**: Developers may be unsure if their changes break existing functionality.
**Next Steps**: Address component path and dependency issues to restore full test suite confidence.