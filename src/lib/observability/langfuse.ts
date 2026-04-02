// Simple Langfuse implementation for server actions
// The actual Langfuse tracing is handled in the LLM provider directly

export type TraceKind = "span" | "generation";
export type TraceUpdate = {
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  level?: string;
  statusMessage?: string;
  model?: string;
  modelParameters?: Record<string, string | number>;
  usageDetails?: Record<string, number>;
  completionStartTime?: Date;
};
export type TraceObservation = {
  update: (update: TraceUpdate) => void;
};

type TraceDelegate = {
  withObservation: <T>(
    name: string,
    options: {
      kind: TraceKind;
      initialUpdate?: TraceUpdate;
    },
    callback: (observation: TraceObservation) => Promise<T>
  ) => Promise<T>;
};

const noopObservation: TraceObservation = {
  update: () => {}
};

let testTraceDelegate: TraceDelegate | null = null;

export function setTraceDelegateForTests(delegate: TraceDelegate) {
  testTraceDelegate = delegate;
}

export function resetTraceDelegateForTests() {
  testTraceDelegate = null;
}

export async function withTraceObservation<T>(
  name: string,
  options: {
    kind?: TraceKind;
    initialUpdate?: TraceUpdate;
  },
  callback: (observation: TraceObservation) => Promise<T>
) {
  if (testTraceDelegate) {
    return testTraceDelegate.withObservation(
      name,
      {
        kind: options.kind ?? "span",
        initialUpdate: options.initialUpdate
      },
      callback
    );
  }

  // No-op implementation - just call the callback without tracing
  return callback(noopObservation);
}

// Simple flush implementation - no-op since actual flushing is handled in LLM provider
export async function flushLangfuseTracing() {
  // Actual Langfuse tracing and flushing happens in the LLM provider directly
  // This is just a compatibility stub for server actions
}

export async function initializeLangfuseTracing() {
  return true;
}