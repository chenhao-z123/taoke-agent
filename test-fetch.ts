#!/usr/bin/env tsx

async function testFetch() {
  console.log('Testing fetch with proxy...');
  
  try {
    const response = await fetch('https://us.cloud.langfuse.com/api/public/health');
    const data = await response.json();
    console.log('✅ Fetch successful:', data);
  } catch (error) {
    console.error('❌ Fetch failed:', error);
  }
}

testFetch();