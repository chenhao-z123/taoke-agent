#!/usr/bin/env tsx

// Test Langfuse integration directly
import { Langfuse } from 'langfuse';

// Clear proxy variables like test_1
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

async function testLangfuse() {
  console.log('Testing Langfuse integration...');
  
  const langfuse = new Langfuse({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
    baseUrl: process.env.LANGFUSE_BASE_URL || 'https://us.cloud.langfuse.com'
  });

  try {
    const trace = langfuse.trace({
      id: `test-${Date.now()}`,
      name: 'Webpack Build Test',
      metadata: {
        test_type: 'build_verification',
        environment: 'node'
      }
    });

    console.log('Trace created successfully');
    await langfuse.shutdownAsync();
    console.log('✅ Langfuse integration working!');
  } catch (error) {
    console.error('❌ Langfuse integration failed:', error);
  }
}

testLangfuse();