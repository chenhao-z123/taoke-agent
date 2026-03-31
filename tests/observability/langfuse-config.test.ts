import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resetLangfuseDiagnosticsForTests } from "../../src/lib/observability/langfuse";

describe("Langfuse Configuration", () => {
  beforeAll(() => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    process.env.LANGFUSE_BASE_URL = "https://us.cloud.langfuse.com";
  });

  afterAll(() => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_BASE_URL;
    resetLangfuseDiagnosticsForTests();
  });

  it("should initialize Langfuse with valid config", async () => {
    const { initializeLangfuseTracing } = await import("../../src/lib/observability/langfuse");
    
    const result = await initializeLangfuseTracing();
    expect(result).toBe(true);
  });
});