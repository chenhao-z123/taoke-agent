import { randomUUID } from "node:crypto";

import { LangfuseClient } from "@langfuse/client";

type LangfuseModelCallRecord = {
  provider: string;
  baseUrl: string;
  model: string;
  schemaName: string;
  schemaDescription: string;
  systemPrompt: string;
  userPrompt: string;
  hasImageInput: boolean;
  rawOutput?: string;
  parsedOutput?: unknown;
  errorMessage?: string;
  durationMs: number;
  status: "success" | "error";
};

let langfuseClient: LangfuseClient | null = null;

function hasLangfuseConfig() {
  if (process.env.LANGFUSE_SHALLOW_LOGGING === "false") {
    return false;
  }
  
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && 
    process.env.LANGFUSE_SECRET_KEY
  );
}

function getLangfuseClient() {
  if (!hasLangfuseConfig()) {
    return null;
  }

  if (!langfuseClient) {
    langfuseClient = new LangfuseClient({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL
    });
  }

  return langfuseClient;
}

export function resetLangfuseShallowClientForTests() {
  langfuseClient = null;
}

export async function recordLangfuseModelCall(record: LangfuseModelCallRecord) {
  // 保存原始代理环境变量
  const originalHttpProxy = process.env.HTTP_PROXY;
  const originalHttpsProxy = process.env.HTTPS_PROXY;
  const originalHttpProxyLower = process.env.http_proxy;
  const originalHttpsProxyLower = process.env.https_proxy;
  const originalNoProxy = process.env.NO_PROXY;
  const originalNoProxyLower = process.env.no_proxy;
  
  // 临时清除代理环境变量以避免fetch问题
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  delete process.env.NO_PROXY;
  delete process.env.no_proxy;

  try {
    const client = getLangfuseClient();
    if (!client) {
      return;
    }

    const traceId = randomUUID().replace(/-/g, "");
    const observationId = randomUUID().replace(/-/g, "");

    const timestamp = new Date().toISOString();

    await client.api.ingestion.batch({
      batch: [
        {
          id: randomUUID(),
          timestamp,
          type: "trace-create",
          body: {
            id: traceId,
            name: record.schemaName,
            input: {
              system_prompt: record.systemPrompt,
              user_prompt: record.userPrompt,
              has_image_input: record.hasImageInput
            },
            output: record.rawOutput,
            metadata: {
              provider: record.provider,
              base_url: record.baseUrl,
              schema_description: record.schemaDescription,
              duration_ms: record.durationMs,
              status: record.status,
              error_message: record.errorMessage
            }
          }
        },
        {
          id: randomUUID(),
          timestamp,
          type: "observation-create",
          body: {
            id: observationId,
            traceId,
            type: "GENERATION",
            name: "llm.generateObject",
            model: record.model,
            input: {
              schema_name: record.schemaName,
              schema_description: record.schemaDescription,
              system_prompt: record.systemPrompt,
              user_prompt: record.userPrompt,
              has_image_input: record.hasImageInput
            },
            output: record.rawOutput,
            metadata: {
              provider: record.provider,
              base_url: record.baseUrl,
              parsed_output: record.parsedOutput,
              duration_ms: record.durationMs,
              status: record.status,
              error_message: record.errorMessage
            }
          }
        }
      ]
    });

    // 强制刷新并发送队列中的所有追踪数据
    await client.flush();
  } catch (error) {
    if (error instanceof Error) {
      console.warn("[langfuse] shallow model call logging failed", {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        console.warn("[langfuse] This may be a proxy configuration issue. To disable shallow logging temporarily, set LANGFUSE_SHALLOW_LOGGING=false in your .env file");
      }
    } else {
      console.warn("[langfuse] shallow model call logging failed", error);
    }
  } finally {
    // 恢复原始代理环境变量
    if (originalHttpProxy !== undefined) process.env.HTTP_PROXY = originalHttpProxy;
    if (originalHttpsProxy !== undefined) process.env.HTTPS_PROXY = originalHttpsProxy;
    if (originalHttpProxyLower !== undefined) process.env.http_proxy = originalHttpProxyLower;
    if (originalHttpsProxyLower !== undefined) process.env.https_proxy = originalHttpsProxyLower;
    if (originalNoProxy !== undefined) process.env.NO_PROXY = originalNoProxy;
    if (originalNoProxyLower !== undefined) process.env.no_proxy = originalNoProxyLower;
  }
}
