#!/usr/bin/env tsx

import 'dotenv/config';
import { recordLangfuseModelCall } from './src/lib/observability/langfuse-shallow';

async function testLangfuse() {
  console.log('Testing Langfuse connection...');
  
  try {
    await recordLangfuseModelCall({
      provider: "test",
      baseUrl: "https://test.com",
      model: "test-model",
      schemaName: "test-schema",
      schemaDescription: "Test schema for debugging",
      systemPrompt: "Test system prompt",
      userPrompt: "Test user prompt",
      hasImageInput: false,
      rawOutput: "Test output",
      parsedOutput: { test: "result" },
      durationMs: 100,
      status: "success"
    });
    
    console.log('✅ Langfuse test successful! Check your Langfuse dashboard.');
  } catch (error) {
    console.error('❌ Langfuse test failed:', error);
  }
}

testLangfuse();