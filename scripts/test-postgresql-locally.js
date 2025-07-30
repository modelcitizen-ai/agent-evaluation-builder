#!/usr/bin/env node
// scripts/test-postgresql-locally.js
// Test PostgreSQL setup locally before deploying

const fs = require('fs');
const { Pool } = require('pg');

async function testLocalPostgreSQL() {
  console.log('🧪 Testing PostgreSQL setup locally...');
  
  // Check if .env.local exists for testing
  if (!fs.existsSync('.env.local')) {
    console.error('❌ No .env.local file found');
    console.log('📋 Create .env.local with PostgreSQL settings:');
    console.log('USE_POSTGRESQL=true');
    console.log('DATABASE_URL=postgresql://postgres:password@localhost:5432/human_eval_test');
    console.log('\n💡 You can copy .env.local.example and modify it');
    process.exit(1);
  }
  
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in .env.local');
    process.exit(1);
  }
  
  console.log('🔗 Testing connection to:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@'));
  
  try {
    // Test database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false // No SSL for local testing
    });
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database query successful:', result.rows[0].current_time);
    
    client.release();
    
    // Run schema setup
    console.log('📋 Setting up database schema...');
    const { setupDatabase } = require('./setup-database-schema.js');
    await setupDatabase();
    
    // Test the adapter
    console.log('🔌 Testing PostgreSQL adapter...');
    
    // Temporarily set the environment variable
    process.env.USE_POSTGRESQL = 'true';
    
    const adapter = require('../lib/db/db-adapter.ts');
    
    // Test basic operations
    console.log('📊 Testing evaluation operations...');
    
    const testEvaluation = {
      name: 'Local Test Evaluation',
      instructions: 'This is a test evaluation for local PostgreSQL testing',
      status: 'draft'
    };
    
    // Create test evaluation
    const created = await adapter.createEvaluation(testEvaluation);
    console.log('✅ Created test evaluation:', created.name);
    
    // Retrieve evaluations
    const evaluations = await adapter.getEvaluations();
    console.log('✅ Retrieved evaluations:', evaluations.length);
    
    // Cleanup test data
    if (created && created.id) {
      await adapter.deleteEvaluation(created.id);
      console.log('✅ Cleaned up test evaluation');
    }
    
    await pool.end();
    
    console.log('\n🎉 Local PostgreSQL testing completed successfully!');
    console.log('💡 You can now run: npm run dev (with .env.local settings)');
    console.log('🚀 Or deploy to Azure with: ./scripts/deploy-backend-postgresql.sh');
    
  } catch (error) {
    console.error('❌ Local PostgreSQL testing failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is running locally');
    console.log('2. Check your DATABASE_URL in .env.local');
    console.log('3. Ensure the database exists');
    console.log('4. For Docker: docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres');
    process.exit(1);
  }
}

// Run the test
testLocalPostgreSQL();
