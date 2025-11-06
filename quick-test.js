#!/usr/bin/env node

// Simple test to create an evaluation and check immediate visibility via API
const baseUrl = process.argv[2];
if (!baseUrl) {
  console.log('Usage: node quick-test.js <deployment-url>');
  process.exit(1);
}

async function quickTest() {
  try {
    console.log('Testing evaluation creation and immediate API visibility...');
    
    // Create test evaluation
    const testData = {
      name: `Quick Test ${Date.now()}`,
      instructions: 'Quick test evaluation',
      originalData: [],
      criteria: [{ id: 1, name: 'Test', type: 'rating', scale: 5 }]
    };

    const createResponse = await fetch(`${baseUrl}/api/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    console.log(`✅ Created evaluation ID: ${createResult.data.id}`);

    // Immediately check if it's visible
    const getResponse = await fetch(`${baseUrl}/api/evaluations`);
    const getResult = await getResponse.json();
    
    const found = getResult.data.find(e => e.id === createResult.data.id);
    if (found) {
      console.log('✅ Evaluation immediately visible via API');
      console.log(`Found: ${found.name}`);
      return true;
    } else {
      console.log('❌ Evaluation NOT visible via API immediately');
      return false;
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

quickTest();
