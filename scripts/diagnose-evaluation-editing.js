#!/usr/bin/env node
// Diagnostic script to test evaluation editing functionality and identify the root cause

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const APP_URL = 'https://human-eval-backend-gnc0e4ejgxbeapdu.eastus2-01.azurewebsites.net';

// Colors for output
const colors = {
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  red: '\x1b[0;31m',
  blue: '\x1b[0;34m',
  nc: '\x1b[0m'
};

function printSection(title) {
  console.log(`\n${colors.yellow}▶ ${title}${colors.nc}`);
  console.log('────────────────────────────────────────────────────────────────────');
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.nc}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.nc}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.nc}`);
}

async function testApiEndpoint() {
  printSection('Step 1: Testing API Endpoint Functionality');
  
  try {
    // Get existing evaluations
    printInfo('Fetching existing evaluations...');
    const getResponse = await fetch(`${APP_URL}/api/evaluations`);
    const getResult = await getResponse.json();
    
    if (!getResult.success || getResult.data.length === 0) {
      printError('No evaluations found to test editing');
      return false;
    }
    
    const testEvaluation = getResult.data[0];
    printSuccess(`Found evaluation to test: ID ${testEvaluation.id}, Name: "${testEvaluation.name}"`);
    
    // Test updating the evaluation via API
    printInfo('Testing PUT /api/evaluations/:id endpoint...');
    const originalName = testEvaluation.name;
    const testName = `${originalName} - DIAGNOSTIC TEST ${Date.now()}`;
    const testInstructions = `Updated instructions for diagnostic test - ${new Date().toISOString()}`;
    
    const updatedData = {
      name: testName,
      instructions: testInstructions,
      criteria: testEvaluation.criteria || [],
      originalData: testEvaluation.originalData || [],
      totalItems: testEvaluation.totalItems || 0
    };
    
    const updateResponse = await fetch(`${APP_URL}/api/evaluations/${testEvaluation.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
    });
    
    const updateResult = await updateResponse.json();
    
    if (updateResult.success) {
      printSuccess('API endpoint works - evaluation updated successfully');
      
      // Verify the update by fetching the evaluation again
      printInfo('Verifying update persisted to database...');
      const verifyResponse = await fetch(`${APP_URL}/api/evaluations/${testEvaluation.id}`);
      const verifyResult = await verifyResponse.json();
      
      if (verifyResult.success && verifyResult.data.name === testName) {
        printSuccess('Update verified - changes persisted to database');
        
        // Restore original name
        await fetch(`${APP_URL}/api/evaluations/${testEvaluation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            name: originalName,
            instructions: testEvaluation.instructions || '',
            criteria: testEvaluation.criteria || []
          }),
        });
        printInfo('Test cleanup completed - original name restored');
        
        return true;
      } else {
        printError('Update not persisted to database');
        console.log('Expected name:', testName);
        console.log('Actual name:', verifyResult.data?.name);
        return false;
      }
    } else {
      printError('API endpoint failed: ' + updateResult.error);
      return false;
    }
    
  } catch (error) {
    printError('Error testing API endpoint: ' + error.message);
    return false;
  }
}

function checkFrontendCode() {
  printSection('Step 2: Analyzing Frontend Code');
  
  try {
    const hookPath = '/Users/ericlewallen/human-eval-persist/components/data-scientist/preview/usePreviewMetricManagement.ts';
    
    if (!fs.existsSync(hookPath)) {
      printError('Hook file not found: ' + hookPath);
      return { hasImport: false, hasCall: false, issue: 'FILE_NOT_FOUND' };
    }
    
    const hookContent = fs.readFileSync(hookPath, 'utf8');
    
    // Check imports
    printInfo('Checking imports in usePreviewMetricManagement.ts...');
    const hasCreateImport = hookContent.includes('createEvaluation');
    const hasUpdateImport = hookContent.includes('updateEvaluation');
    
    if (hasCreateImport && !hasUpdateImport) {
      printError('ISSUE FOUND: updateEvaluation is NOT imported but createEvaluation is');
      console.log('Import line should include both functions');
    } else if (hasUpdateImport) {
      printSuccess('updateEvaluation is imported');
    } else {
      printError('Neither createEvaluation nor updateEvaluation found in imports');
    }
    
    // Check function calls in edit mode
    printInfo('Checking function calls in handleSaveEvaluation...');
    const hasCreateCall = hookContent.includes('await createEvaluation(');
    const hasUpdateCall = hookContent.includes('await updateEvaluation(');
    
    // Look for edit mode handling
    const editModePattern = /if\s*\(\s*isEditMode\s*&&\s*editId\s*\)/;
    const hasEditModeCheck = editModePattern.test(hookContent);
    
    if (hasEditModeCheck) {
      printSuccess('Edit mode check found in code');
      
      // Extract the edit mode block to see what it does
      const editModeMatch = hookContent.match(/if\s*\(\s*isEditMode\s*&&\s*editId\s*\)\s*{([^}]+(?:{[^}]*}[^}]*)*})/);
      if (editModeMatch) {
        const editModeBlock = editModeMatch[0];
        
        if (editModeBlock.includes('await updateEvaluation(')) {
          printSuccess('updateEvaluation is called in edit mode');
        } else if (editModeBlock.includes('localStorage.setItem')) {
          printError('ISSUE FOUND: Edit mode only updates localStorage, not database');
          console.log('Edit mode block only contains localStorage operations');
        } else {
          printError('Edit mode block found but unclear what it does');
        }
      }
    } else {
      printError('No edit mode check found in handleSaveEvaluation');
    }
    
    if (hasCreateCall && !hasUpdateCall) {
      printError('ISSUE FOUND: createEvaluation is called but updateEvaluation is NOT called');
    } else if (hasUpdateCall) {
      printSuccess('updateEvaluation call found');
    }
    
    return {
      hasImport: hasUpdateImport,
      hasCall: hasUpdateCall,
      hasEditMode: hasEditModeCheck,
      issue: (!hasUpdateImport || !hasUpdateCall) ? 'MISSING_UPDATE_CALL' : 'NONE'
    };
    
  } catch (error) {
    printError('Error checking frontend code: ' + error.message);
    return { hasImport: false, hasCall: false, issue: 'ERROR' };
  }
}

function checkClientDbFile() {
  printSection('Step 3: Verifying Client DB Functions');
  
  try {
    const clientDbPath = '/Users/ericlewallen/human-eval-persist/lib/client-db.ts';
    
    if (!fs.existsSync(clientDbPath)) {
      printError('Client DB file not found: ' + clientDbPath);
      return false;
    }
    
    const clientDbContent = fs.readFileSync(clientDbPath, 'utf8');
    
    // Check if updateEvaluation is exported
    const hasUpdateExport = clientDbContent.includes('export') && clientDbContent.includes('updateEvaluation');
    const hasCreateExport = clientDbContent.includes('export') && clientDbContent.includes('createEvaluation');
    
    if (hasUpdateExport) {
      printSuccess('updateEvaluation is exported from client-db.ts');
    } else {
      printError('updateEvaluation is NOT exported from client-db.ts');
    }
    
    if (hasCreateExport) {
      printSuccess('createEvaluation is exported from client-db.ts');
    } else {
      printError('createEvaluation is NOT exported from client-db.ts');
    }
    
    return hasUpdateExport && hasCreateExport;
    
  } catch (error) {
    printError('Error checking client-db.ts: ' + error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Diagnostic Script: Evaluation Editing Issue');
  console.log('==============================================');
  
  const apiWorks = await testApiEndpoint();
  const frontendAnalysis = checkFrontendCode();
  const clientDbOk = checkClientDbFile();
  
  printSection('DIAGNOSIS RESULTS');
  console.log(`API Endpoint Working: ${apiWorks ? '✅ YES' : '❌ NO'}`);
  console.log(`Frontend Import Correct: ${frontendAnalysis.hasImport ? '✅ YES' : '❌ NO'}`);
  console.log(`Frontend Call Correct: ${frontendAnalysis.hasCall ? '✅ YES' : '❌ NO'}`);
  console.log(`Client DB Functions Available: ${clientDbOk ? '✅ YES' : '❌ NO'}`);
  
  printSection('ROOT CAUSE ANALYSIS');
  
  if (apiWorks && clientDbOk && !frontendAnalysis.hasImport) {
    console.log('🎯 ROOT CAUSE IDENTIFIED:');
    console.log('• The database and API endpoint work correctly ✅');
    console.log('• The updateEvaluation function exists in client-db.ts ✅'); 
    console.log('• BUT: updateEvaluation is NOT imported in usePreviewMetricManagement.ts ❌');
    console.log('• RESULT: Edit mode only updates localStorage, not the database ❌');
    console.log('');
    console.log('🛠️ SOLUTION:');
    console.log('1. Import updateEvaluation in usePreviewMetricManagement.ts');
    console.log('2. Call await updateEvaluation(editId, updatedData) in edit mode');
    console.log('3. Add error handling for database update failures');
    
  } else if (apiWorks && clientDbOk && frontendAnalysis.hasImport && !frontendAnalysis.hasCall) {
    console.log('🎯 ROOT CAUSE IDENTIFIED:');
    console.log('• The database, API, and imports are correct ✅');
    console.log('• BUT: updateEvaluation is imported but not called in edit mode ❌');
    console.log('');
    console.log('🛠️ SOLUTION:');
    console.log('1. Add await updateEvaluation(editId, updatedData) call in edit mode');
    console.log('2. Replace localStorage-only update with database update');
    
  } else if (!apiWorks) {
    console.log('🎯 ROOT CAUSE IDENTIFIED:');
    console.log('• The API endpoint is not working correctly ❌');
    console.log('• Need to fix the backend API first');
    
  } else if (apiWorks && frontendAnalysis.hasImport && frontendAnalysis.hasCall) {
    console.log('🤔 UNEXPECTED RESULT:');
    console.log('• All components appear to be working correctly');
    console.log('• The issue might be elsewhere (UI not calling save, state management, etc.)');
    console.log('• Check browser developer tools for frontend errors');
    
  } else {
    console.log('🔍 COMPLEX ISSUE:');
    console.log('• Multiple components have issues');
    console.log('• Check each component individually');
  }
  
  printSection('NEXT STEPS');
  console.log('1. If root cause is confirmed, apply the frontend code fix');
  console.log('2. Test the fix with a real evaluation edit in the UI');
  console.log('3. Verify changes persist after page refresh');
  console.log('4. Run this diagnostic script again to confirm the fix');
}

// Add node-fetch if not available
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch for testing...');
  try {
    require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
    console.log('node-fetch installed successfully');
  } catch (error) {
    console.error('Failed to install node-fetch. Please run: npm install node-fetch@2');
    process.exit(1);
  }
}

main().catch(console.error);
