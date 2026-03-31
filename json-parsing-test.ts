// Extracted parseJsonFromContent function from openai-compatible-provider.ts
import { jsonrepair } from "jsonrepair";

function tryParseJson(content: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch {
    return { ok: false };
  }
}

function extractFencedJson(content: string): string | undefined {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match?.[1]?.trim();
}

function extractWrappedJsonObject(content: string): string | undefined {
  const start = content.indexOf("{");
  if (start === -1) {
    return undefined;
  }

  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < content.length; i++) {
    const char = content[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (inString) {
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      braceCount++;
    } else if (char === "}") {
      braceCount--;
      if (braceCount === 0) {
        return content.substring(start, i + 1);
      }
    }
  }

  return undefined;
}

function parseJsonFromContent(content: unknown): unknown {
  let stringContent: string;
  
  if (typeof content !== 'string') {
    stringContent = String(content);
  } else {
    stringContent = content;
  }

  const trimmed = stringContent.trim();
  
  const direct = tryParseJson(trimmed);
  if (direct.ok) {
    return direct.value;
  }

  const fenced = extractFencedJson(trimmed);
  if (fenced) {
    const parsed = tryParseJson(fenced);
    if (parsed.ok) {
      return parsed.value;
    }
  }

  const wrapped = extractWrappedJsonObject(trimmed);
  if (wrapped) {
    const parsed = tryParseJson(wrapped);
    if (parsed.ok) {
      return parsed.value;
    }
  }

  try {
    const repaired = jsonrepair(stringContent);
    return JSON.parse(repaired);
  } catch (repairError) {
    throw new Error(`Invalid JSON content: ${trimmed.substring(0, 100)}...`);
  }
}

// Test case 1: LLM returning pure numbers instead of JSON objects
try {
  const numberResult = parseJsonFromContent(42);
  console.log("Number test passed:", numberResult);
} catch (e) {
  console.error("Number test failed:", e);
}

// Test case 2: Control characters in JSON strings
try {
  const controlCharResult = parseJsonFromContent('{"course":"Math\\u0000101"}');
  console.log("Control character test passed:", controlCharResult);
} catch (e) {
  console.error("Control character test failed:", e);
}

// Test case 3: Malformed JSON that needs repair
try {
  const malformedResult = parseJsonFromContent('{"course": "Math" "time": "9-10"}');
  console.log("Malformed JSON test passed:", malformedResult);
} catch (e) {
  console.error("Malformed JSON test failed:", e);
}

// Test case 4: Valid JSON
try {
  const validResult = parseJsonFromContent('{"course": "Math", "time": "9-10"}');
  console.log("Valid JSON test passed:", validResult);
} catch (e) {
  console.error("Valid JSON test failed:", e);
}
