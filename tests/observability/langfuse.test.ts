import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetLangfuseDiagnosticsForTests,
  withTraceObservation
} from "../../src/lib/observability/langfuse";

const originalEnv = {
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
  LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL
};

afterEach(() => {
  process.env.LANGFUSE_PUBLIC_KEY = originalEnv.LANGFUSE_PUBLIC_KEY;
  process.env.LANGFUSE_SECRET_KEY = originalEnv.LANGFUSE_SECRET_KEY;
  process.env.LANGFUSE_BASE_URL = originalEnv.LANGFUSE_BASE_URL;
  resetLangfuseDiagnosticsForTests();
  vi.restoreAllMocks();
});

describe("withTraceObservation", () => {
  it("warns once when Langfuse tracing is unavailable", async () => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await withTraceObservation("first", {}, async () => "ok");
    await withTraceObservation("second", {}, async () => "ok");

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
