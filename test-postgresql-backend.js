// Test script to create a new evaluation via API and demonstrate PostgreSQL backend
const testCreateEvaluation = async () => {
  console.log('🧪 Testing PostgreSQL Backend - Creating Evaluation');
  
  const testEvaluation = {
    name: `Test Evaluation ${Date.now()}`,
    instructions: 'This is a test evaluation to demonstrate PostgreSQL backend functionality.',
    criteria: [
      {
        id: 1,
        name: 'Quality',
        description: 'Rate the overall quality',
        type: 'scale',
        scale: { min: 1, max: 5 }
      },
      {
        id: 2,
        name: 'Relevance',
        description: 'How relevant is this content?',
        type: 'scale',
        scale: { min: 1, max: 10 }
      }
    ],
    data: [
      { id: 1, text: 'Sample item 1', type: 'text' },
      { id: 2, text: 'Sample item 2', type: 'text' },
      { id: 3, text: 'Sample item 3', type: 'text' }
    ]
  };

  try {
    console.log('📤 Sending POST request to /api/evaluations');
    const response = await fetch('/api/evaluations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEvaluation),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Evaluation created:', result);
    
    return result.data;
  } catch (error) {
    console.error('❌ Error creating evaluation:', error);
    throw error;
  }
};

// Test function to fetch all evaluations
const testFetchEvaluations = async () => {
  console.log('📤 Fetching all evaluations from API');
  try {
    const response = await fetch('/api/evaluations');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('📋 Current evaluations:', result);
    return result.data;
  } catch (error) {
    console.error('❌ Error fetching evaluations:', error);
    throw error;
  }
};

// Run the test
(async () => {
  try {
    console.log('🚀 Starting PostgreSQL Backend Test');
    
    // First, check current evaluations
    console.log('\n--- BEFORE CREATING NEW EVALUATION ---');
    const beforeEvaluations = await testFetchEvaluations();
    console.log(`Found ${beforeEvaluations.length} existing evaluations`);
    
    // Create a new evaluation
    console.log('\n--- CREATING NEW EVALUATION ---');
    const newEvaluation = await testCreateEvaluation();
    console.log('New evaluation ID:', newEvaluation.id);
    
    // Check evaluations after creation
    console.log('\n--- AFTER CREATING NEW EVALUATION ---');
    const afterEvaluations = await testFetchEvaluations();
    console.log(`Now found ${afterEvaluations.length} evaluations`);
    
    // Show the difference
    if (afterEvaluations.length > beforeEvaluations.length) {
      console.log('🎉 SUCCESS: New evaluation was successfully saved to PostgreSQL!');
      console.log('📊 PostgreSQL Backend is working correctly!');
    } else {
      console.log('⚠️  Something unexpected happened');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
})();
