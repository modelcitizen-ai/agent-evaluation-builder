#!/usr/bin/env node

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.log('Usage: node test-evaluation-flow.js <deployment-url>');
  console.log('Example: node test-evaluation-flow.js https://myapp.azurewebsites.net');
  process.exit(1);
}

console.log('🔍 Testing Evaluation Creation Flow');
console.log(`📍 Testing deployment: ${baseUrl}`);
console.log();

async function testFlow() {
  try {
    // 1. Check initial state
    console.log('1️⃣  Checking initial state...');
    const initialResponse = await fetch(`${baseUrl}/api/evaluations`);
    const initialData = await initialResponse.json();
    console.log(`   Initial evaluation count: ${initialData.data ? initialData.data.length : 0}`);
    console.log();

    // 2. Create test evaluation
    console.log('2️⃣  Creating test evaluation...');
    const testEvaluation = {
      name: `Test Evaluation ${new Date().toISOString()}`,
      instructions: 'Test evaluation for dashboard visibility debugging',
      originalData: [],
      criteria: [
        {
          id: 1,
          name: 'Test Criteria',
          type: 'rating',
          scale: 5,
          description: 'Test description'
        }
      ]
    };

    const createResponse = await fetch(`${baseUrl}/api/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvaluation)
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed with status ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    console.log(`   ✅ Evaluation created successfully: ID ${createData.data.id}`);
    console.log();

    // 3. Wait a moment and check if it appears
    console.log('3️⃣  Checking if evaluation appears immediately...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

    const afterResponse = await fetch(`${baseUrl}/api/evaluations`);
    const afterData = await afterResponse.json();
    const newCount = afterData.data ? afterData.data.length : 0;
    
    console.log(`   Evaluation count after creation: ${newCount}`);
    
    if (newCount > (initialData.data ? initialData.data.length : 0)) {
      console.log('   ✅ SUCCESS: Evaluation appears immediately!');
      console.log(`   📝 Newest evaluation: ${afterData.data[afterData.data.length - 1].name}`);
    } else {
      console.log('   ❌ ISSUE: Evaluation not visible immediately');
      
      // Try again after longer delay
      console.log('   🔄 Waiting 2 seconds and checking again...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const retryResponse = await fetch(`${baseUrl}/api/evaluations`);
      const retryData = await retryResponse.json();
      const retryCount = retryData.data ? retryData.data.length : 0;
      
      if (retryCount > (initialData.data ? initialData.data.length : 0)) {
        console.log('   ⚠️  DELAYED: Evaluation appeared after delay');
        console.log('   This indicates a timing/caching issue');
      } else {
        console.log('   ❌ PERSISTENT: Evaluation still not visible');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFlow();
