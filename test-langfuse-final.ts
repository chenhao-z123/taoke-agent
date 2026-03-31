#!/usr/bin/env tsx

// 测试Langfuse追踪功能
import { recordLangfuseModelCall } from './src/lib/observability/langfuse-shallow';

async function testLangfuse() {
  console.log('🔍 测试Langfuse追踪功能...');
  
  try {
    await recordLangfuseModelCall({
      provider: "test",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.5-plus",
      schemaName: "debug-test-trace",
      schemaDescription: "调试测试追踪",
      systemPrompt: "你是一个有用的助手。",
      userPrompt: "你好，这是一个调试测试消息。",
      hasImageInput: false,
      rawOutput: "这是来自LLM的测试响应。",
      parsedOutput: { result: "success" },
      durationMs: 100,
      status: "success"
    });
    
    console.log('✅ Langfuse测试完成！请检查仪表板中的 "debug-test-trace" 追踪。');
  } catch (error) {
    console.error('❌ Langfuse测试失败:', error);
  }
}

testLangfuse();