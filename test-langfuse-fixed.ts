#!/usr/bin/env tsx

// 清除代理环境变量以确保直连
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.NO_PROXY;
delete process.env.no_proxy;

import { recordLangfuseModelCall } from './src/lib/observability/langfuse-shallow';

async function testLangfuse() {
  console.log('Testing Langfuse connection with proxy env vars cleared...');
  
  // 验证环境变量
  console.log('LANGFUSE_PUBLIC_KEY set:', !!process.env.LANGFUSE_PUBLIC_KEY);
  console.log('LANGFUSE_SECRET_KEY set:', !!process.env.LANGFUSE_SECRET_KEY);
  console.log('Proxy vars cleared:', !process.env.HTTP_PROXY && !process.env.HTTPS_PROXY);
  
  try {
    await recordLangfuseModelCall({
      provider: "test",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model: "qwen3.5-plus",
      schemaName: "langfuse-debug-test",
      schemaDescription: "Debug test to verify Langfuse integration",
      systemPrompt: "You are a helpful assistant.",
      userPrompt: "Hello, this is a test message for debugging.",
      hasImageInput: false,
      rawOutput: "This is a test response from the LLM.",
      parsedOutput: { result: "success" },
      durationMs: 150,
      status: "success"
    });
    
    console.log('✅ Langfuse test completed successfully!');
    console.log('Check your Langfuse dashboard for trace: "langfuse-debug-test"');
  } catch (error) {
    console.error('❌ Langfuse test failed:', error);
  }
}

testLangfuse();