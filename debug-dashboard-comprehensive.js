// Comprehensive dashboard visibility debugger for PostgreSQL deployments
async function debugDashboardIssue(deploymentUrl) {
  console.log('🔍 Comprehensive Dashboard Visibility Debug');
  console.log('📍 Testing deployment:', deploymentUrl);
  
  try {
    // 1. Test health endpoint
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${deploymentUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('Health status:', healthData);
    
    // 2. Test warm-up endpoint
    console.log('\n2️⃣ Testing warm-up endpoint...');
    const warmupResponse = await fetch(`${deploymentUrl}/api/warmup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const warmupData = await warmupResponse.json();
    console.log('Warm-up result:', warmupData);
    
    // 3. Check initial evaluations
    console.log('\n3️⃣ Checking initial evaluations...');
    const initialResponse = await fetch(`${deploymentUrl}/api/evaluations`);
    const initialData = await initialResponse.json();
    console.log('Initial evaluations:', initialData);
    
    // 4. Create test evaluation
    console.log('\n4️⃣ Creating test evaluation...');
    const testEvaluation = {
      id: Date.now(),
      name: `Debug Test ${new Date().toISOString()}`,
      instructions: 'Debug test for dashboard visibility',
      status: 'draft',
      totalItems: 0,
      originalData: [],
      criteria: [{
        id: 1,
        name: 'Test Criteria',
        type: 'rating',
        scale: 5,
        description: 'Test description'
      }],
      columnRoles: []
    };
    
    const createResponse = await fetch(`${deploymentUrl}/api/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvaluation)
    });
    const createData = await createResponse.json();
    console.log('Create result:', createData);
    
    // 5. Immediately check if evaluation appears
    console.log('\n5️⃣ Checking if evaluation appears immediately...');
    const afterCreateResponse = await fetch(`${deploymentUrl}/api/evaluations`);
    const afterCreateData = await afterCreateResponse.json();
    console.log('Evaluations after create:', afterCreateData);
    
    // 6. Wait and check again
    console.log('\n6️⃣ Waiting 2 seconds and checking again...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const delayedResponse = await fetch(`${deploymentUrl}/api/evaluations`);
    const delayedData = await delayedResponse.json();
    console.log('Evaluations after delay:', delayedData);
    
    // 7. Analysis
    console.log('\n📊 ANALYSIS:');
    console.log('- Database mode:', healthData.databaseMode);
    console.log('- Warm-up success:', warmupData.success);
    console.log('- Initial count:', initialData.data?.length || 0);
    console.log('- After create count:', afterCreateData.data?.length || 0);
    console.log('- After delay count:', delayedData.data?.length || 0);
    console.log('- Evaluation immediately visible:', (afterCreateData.data?.length || 0) > (initialData.data?.length || 0));
    
    return {
      healthOk: healthResponse.ok,
      warmupOk: warmupResponse.ok,
      createOk: createResponse.ok,
      immediatelyVisible: (afterCreateData.data?.length || 0) > (initialData.data?.length || 0),
      visibleAfterDelay: (delayedData.data?.length || 0) > (initialData.data?.length || 0)
    };
  } catch (error) {
    console.error('Debug error:', error);
    return { error: error.message };
  }
}

// Usage: debugDashboardIssue('https://your-deployment-url.azurewebsites.net')
if (typeof module !== 'undefined') {
  module.exports = debugDashboardIssue;
}
