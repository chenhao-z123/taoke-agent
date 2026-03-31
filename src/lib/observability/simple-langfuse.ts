import { LangfuseClient } from "@langfuse/client";
import { randomUUID } from "node:crypto";

let langfuseClient: LangfuseClient | null = null;

function hasLangfuseConfig() {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && 
    process.env.LANGFUSE_SECRET_KEY
  );
}

export function getLangfuseClient() {
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

export async function recordLlmCall(params: {
  name: string;
  model: string;
  input: any;
  output?: any;
  metadata?: Record<string, any>;
  status?: "success" | "error";
  errorMessage?: string;
}) {
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
            name: params.name,
            input: params.input,
            output: params.output,
            metadata: params.metadata
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
            name: "llm.generate",
            model: params.model,
            input: params.input,
            output: params.output,
            metadata: {
              ...params.metadata,
              status: params.status,
              error_message: params.errorMessage
            }
          }
        }
      ]
    });

    // Flush to ensure traces are sent
    await client.flush();
    
  } catch (error) {
    console.warn("[langfuse] Failed to record LLM call:", error);
  }
}

export async function flushLangfuseTracing() {
  try {
    const client = getLangfuseClient();
    if (client) {
      await client.flush();
    }
  } catch (error) {
    console.warn("[langfuse] Failed to flush tracing:", error);
  }
}