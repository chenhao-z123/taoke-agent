import { afterEach, describe, expect, it, vi } from "vitest";

const mockTracerProvider = {
  getTracer: vi.fn(() => ({ startSpan: vi.fn() }))
};

const startMock = vi.fn(async () => undefined);
const setLangfuseTracerProviderMock = vi.fn();

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: class {
    _tracerProvider = mockTracerProvider;

    async start() {
      return startMock();
    }
  }
}));

vi.mock("@langfuse/tracing", async () => {
  const actual = await vi.importActual<typeof import("@langfuse/tracing")>(
    "@langfuse/tracing"
  );

  return {
    ...actual,
    setLangfuseTracerProvider: setLangfuseTracerProviderMock
  };
});

describe("initializeLangfuseTracing", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.LANGFUSE_PUBLIC_KEY = undefined;
    process.env.LANGFUSE_SECRET_KEY = undefined;
    process.env.LANGFUSE_BASE_URL = undefined;
  });

  it("binds Langfuse tracing to the started tracer provider", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    process.env.LANGFUSE_BASE_URL = "https://us.cloud.langfuse.com";

    const { initializeLangfuseTracing } = await import(
      "../../src/lib/observability/langfuse"
    );

    await initializeLangfuseTracing();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(setLangfuseTracerProviderMock).toHaveBeenCalledWith(mockTracerProvider);
  });
});
