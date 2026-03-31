import type { ZodType } from "zod";

import { OpenAiCompatibleLlmProvider } from "@/lib/llm/openai-compatible-provider";

export type StructuredGenerationRequest = {
  schemaName: string;
  schemaDescription: string;
  responseSchema: ZodType<unknown>;
  systemPrompt: string;
  userPrompt: string;
  userImageDataUrl?: string;
};

export type LlmProvider = {
  generateObject(request: StructuredGenerationRequest): Promise<unknown>;
};

let testProvider: LlmProvider | null = null;

export function setLlmProviderForTests(provider: LlmProvider) {
  testProvider = provider;
}

export function resetLlmProviderForTests() {
  testProvider = null;
}

function createConfiguredProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "openai_compatible";
  const defaultBaseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const defaultModel = "qwen3-max";

  if (provider === "openai_compatible") {
    return new OpenAiCompatibleLlmProvider({
      baseUrl: process.env.LLM_BASE_URL ?? defaultBaseUrl,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL ?? defaultModel
    });
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export function getLlmProvider(): LlmProvider {
  return testProvider ?? createConfiguredProvider();
}
