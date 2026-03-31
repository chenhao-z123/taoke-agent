#!/usr/bin/env tsx

// 测试修复后的Langfuse实现（保留TUN环境）
import { recordLangfuseModelCall } from './src/lib/observability/langfuse-shallow';

async function testLangfuse() {
  console.log('🔍 测试修复后的Langfuse实现（保留TUN环境）...');
  
  // 验证代理变量仍然存在  
  console.log('HTTP_PROXY:', process.env.HTTP_PROXY);
  console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY);
  
  try {
    await recordLangfuseModelCall({
      provider: "test",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", 
      model: "qwen3.5-plus",
      schemaName: "tun-fix-test-trace",
      schemaDescription: "TUN模式修复测试",
      systemPrompt: "你是一个有用的助手。",
      userPrompt: "你好，这是TUN模式修复测试消息。",
      hasImageInput: false,
      rawOutput: "这是来自LLM的测试响应。",
      parsedOutput: { result: "success" },
      durationMs: 120,
      status: "success"
    });
    
    console.log('✅ Langfuse测试完成！请检查仪表板中的 "tun-fix-test-trace" 追踪。');
  } catch (error) {
    console.error('❌ Langfuse测试失败:', error);
  }
}

testLangfuse();