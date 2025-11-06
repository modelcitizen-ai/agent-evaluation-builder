#!/usr/bin/env node

// Debug script to test PostgreSQL evaluation creation and dashboard visibility
// Usage: node debug-postgresql-dashboard.js <your-deployment-url>

const https = require('https');
const http = require('http');

if (process.argv.length < 3) {
  console.log('Usage: node debug-postgresql-dashboard.js <deployment-url>');
  console.log('Example: node debug-postgresql-dashboard.js https://myapp.azurewebsites.net');
  process.exit(1);
}

const baseUrl = process.argv[2].replace(/\/$/, ''); // Remove trailing slash

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function debugPostgreSQLDashboard() {
  console.log('🔍 Debugging PostgreSQL Dashboard Visibility Issue');
  console.log(`📍 Testing deployment: ${baseUrl}`);
  console.log('');

  try {
    // Step 1: Check if the API is accessible
    console.log('1️⃣  Testing API accessibility...');
    const healthCheck = await makeRequest(`${baseUrl}/api/evaluations`);
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Response:`, healthCheck.data);
    console.log('');

    if (healthCheck.status !== 200) {
      console.log('❌ API is not accessible. Check deployment status.');
      return;
    }

    const initialCount = healthCheck.data.success ? healthCheck.data.data.length : 0;
    console.log(`   Initial evaluation count: ${initialCount}`);
    console.log('');

    // Step 2: Create a test evaluation
    console.log('2️⃣  Creating test evaluation...');
    const testEvaluation = {
      id: Date.now(),
      name: `Test Evaluation ${new Date().toISOString()}`,
      status: 'draft',
      totalItems: 0,
      createdAt: new Date().toISOString(),
      criteria: [
        {
          id: 1,
          name: 'Test Criteria',
          description: 'Test description',
          type: 'rating',
          scale: 5
        }
      ],
      instructions: 'Test evaluation for dashboard visibility debugging',
      columnRoles: [],
      data: []
    };

    const createResult = await makeRequest(`${baseUrl}/api/evaluations`, {
      method: 'POST',
      body: testEvaluation
    });
    
    console.log(`   Create status: ${createResult.status}`);
    console.log(`   Create response:`, createResult.data);
    console.log('');

    if (createResult.status !== 200 || !createResult.data.success) {
      console.log('❌ Failed to create evaluation. Check database connectivity.');
      return;
    }

    // Step 3: Immediately check if evaluation appears in list
    console.log('3️⃣  Checking if evaluation appears immediately...');
    const immediateCheck = await makeRequest(`${baseUrl}/api/evaluations`);
    console.log(`   Status: ${immediateCheck.status}`);
    
    if (immediateCheck.data.success) {
      const newCount = immediateCheck.data.data.length;
      console.log(`   New evaluation count: ${newCount}`);
      console.log(`   Count increased: ${newCount > initialCount ? '✅ YES' : '❌ NO'}`);
      
      if (newCount > initialCount) {
        const newestEval = immediateCheck.data.data[newCount - 1];
        console.log(`   Newest evaluation: ${newestEval.name} (ID: ${newestEval.id})`);
        console.log('');
        console.log('✅ SUCCESS: Dashboard visibility fix is working!');
        console.log('   Evaluations appear immediately after creation.');
      } else {
        console.log('');
        console.log('❌ ISSUE: Dashboard visibility problem persists!');
        console.log('   New evaluation was created but not visible in list.');
        
        // Additional debugging
        console.log('');
        console.log('🔍 Additional debugging info:');
        console.log('   Database operations:');
        console.log('   - CREATE operation: ✅ Successful');
        console.log('   - READ operation: ❌ Not reflecting new data');
        console.log('');
        console.log('💡 Possible causes:');
        console.log('   - Database transaction not committed');
        console.log('   - Database connection pooling issues');
        console.log('   - API caching preventing fresh reads');
        console.log('   - Database read/write separation issues');
      }
    } else {
      console.log('   Failed to fetch evaluations after creation');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
}

debugPostgreSQLDashboard();
