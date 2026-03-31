import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createOpenAiCompatibleFetchOptions,
  OpenAiCompatibleLlmProvider
} from "../../src/lib/llm/openai-compatible-provider";
import * as langfuseShallow from "../../src/lib/observability/langfuse-shallow";
import {
  resetTraceDelegateForTests,
  setTraceDelegateForTests,
  type TraceUpdate
} from "../../src/lib/observability/langfuse";

const originalEnv = {
  HTTP_PROXY: process.env.HTTP_PROXY,
  HTTPS_PROXY: process.env.HTTPS_PROXY,
  ALL_PROXY: process.env.ALL_PROXY,
  NO_PROXY: process.env.NO_PROXY,
  http_proxy: process.env.http_proxy,
  https_proxy: process.env.https_proxy,
  all_proxy: process.env.all_proxy,
  no_proxy: process.env.no_proxy
};

afterEach(() => {
  process.env.HTTP_PROXY = originalEnv.HTTP_PROXY;
  process.env.HTTPS_PROXY = originalEnv.HTTPS_PROXY;
  process.env.ALL_PROXY = originalEnv.ALL_PROXY;
  process.env.NO_PROXY = originalEnv.NO_PROXY;
  process.env.http_proxy = originalEnv.http_proxy;
  process.env.https_proxy = originalEnv.https_proxy;
  process.env.all_proxy = originalEnv.all_proxy;
  process.env.no_proxy = originalEnv.no_proxy;
  resetTraceDelegateForTests();
});

describe("createOpenAiCompatibleFetchOptions", () => {
  it("adds a dispatcher when an HTTPS proxy is configured", () => {
    process.env.HTTPS_PROXY = "http://127.0.0.1:7890";
    delete process.env.HTTP_PROXY;
    delete process.env.ALL_PROXY;

    const options = createOpenAiCompatibleFetchOptions(
      "https://openrouter.ai/api/v1/chat/completions"
    );

    expect(options.dispatcher).toBeDefined();
  });

  it("does not add a dispatcher when no proxy environment variables are set", () => {
    delete process.env.HTTPS_PROXY;
    delete process.env.HTTP_PROXY;
    delete process.env.ALL_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.all_proxy;
    delete process.env.no_proxy;

    const options = createOpenAiCompatibleFetchOptions(
      "https://openrouter.ai/api/v1/chat/completions"
    );

    expect(options.dispatcher).toBeUndefined();
  });

  it("adds a dispatcher when only lowercase proxy environment variables are configured", () => {
    delete process.env.HTTPS_PROXY;
    delete process.env.HTTP_PROXY;
    delete process.env.ALL_PROXY;
    process.env.https_proxy = "http://127.0.0.1:7890";
    delete process.env.http_proxy;
    delete process.env.all_proxy;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;

    const options = createOpenAiCompatibleFetchOptions(
      "https://openrouter.ai/api/v1/chat/completions"
    );

    expect(options.dispatcher).toBeDefined();
  });

  it("does not add a dispatcher when the target host is covered by NO_PROXY", () => {
    process.env.HTTPS_PROXY = "http://127.0.0.1:7890";
    delete process.env.HTTP_PROXY;
    delete process.env.ALL_PROXY;
    process.env.NO_PROXY = ".aliyuncs.com,localhost";
    delete process.env.no_proxy;

    const options = createOpenAiCompatibleFetchOptions(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    );

    expect(options.dispatcher).toBeUndefined();
  });
});

describe("OpenAiCompatibleLlmProvider", () => {
  it("surfaces timeout errors with a proxy hint for server-side connectivity issues", async () => {
    const provider = new OpenAiCompatibleLlmProvider({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "test-key",
      model: "test-model"
    });

    const originalFetch = global.fetch;
    global.fetch = (async () => {
      throw new TypeError("fetch failed", {
        cause: { code: "UND_ERR_CONNECT_TIMEOUT" }
      });
    }) as typeof fetch;

    await expect(
      provider.generateObject({
        schemaName: "Test",
        schemaDescription: "Test schema",
        responseSchema: {} as never,
        systemPrompt: "system",
        userPrompt: "user"
      })
    ).rejects.toThrow(/proxy|timeout|连接/i);

    global.fetch = originalFetch;
  });

  it("sends multimodal user content when an image data url is provided", async () => {
    const provider = new OpenAiCompatibleLlmProvider({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "test-key",
      model: "test-model"
    });

    const originalFetch = global.fetch;
    let capturedBody = "";
    global.fetch = (async (_input, init) => {
      capturedBody = String(init?.body ?? "");

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ ok: true })
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }) as typeof fetch;

    await provider.generateObject({
      schemaName: "Test",
      schemaDescription: "Test schema",
      responseSchema: {} as never,
      systemPrompt: "system",
      userPrompt: "user",
      userImageDataUrl: "data:image/png;base64,ZmFrZS1pbWFnZQ=="
    });

    const payload = JSON.parse(capturedBody) as {
      messages: Array<{ role: string; content: unknown }>;
    };

    expect(Array.isArray(payload.messages[1]?.content)).toBe(true);
    expect(payload.messages[1]?.content).toEqual([
      {
        type: "text",
        text: expect.stringContaining("Return one JSON object named Test")
      },
      {
        type: "image_url",
        image_url: {
          url: "data:image/png;base64,ZmFrZS1pbWFnZQ=="
        }
      }
    ]);

    global.fetch = originalFetch;
  });

  it("recovers JSON from fenced or wrapped response content", async () => {
    const provider = new OpenAiCompatibleLlmProvider({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: "test-key",
      model: "test-model"
    });

    const originalFetch = global.fetch;
    global.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "Here you go:\n```json\n{\"ok\":true}\n```\nThanks!"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )) as typeof fetch;

    const result = await provider.generateObject({
      schemaName: "Test",
      schemaDescription: "Test schema",
      responseSchema: {} as never,
      systemPrompt: "system",
      userPrompt: "user"
    });

    expect(result).toEqual({ bad: 'line1line2' });

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        rawOutput: '{"bad":"line1\nline2"}',
        errorMessage: expect.stringContaining("control character")
      })
    );

    global.fetch = originalFetch;
  });
});
