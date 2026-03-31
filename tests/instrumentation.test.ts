import { describe, expect, it, vi } from "vitest";

import * as langfuseObservability from "../src/lib/observability/langfuse";

describe("instrumentation register", () => {
  it("initializes Langfuse tracing during Next startup registration", async () => {
    const initializeSpy = vi
      .spyOn(langfuseObservability, "initializeLangfuseTracing")
      .mockResolvedValue(true);

    const { register } = await import("../instrumentation");

    await register();

    expect(initializeSpy).toHaveBeenCalledTimes(1);
  });
});
