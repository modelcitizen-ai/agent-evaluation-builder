#!/usr/bin/env node
// scripts/migrate-localStorage-to-postgresql.js
// Utility to migrate data from localStorage to PostgreSQL

const fs = require('fs');
const path = require('path');

// Set environment to use PostgreSQL
process.env.USE_POSTGRESQL = 'true';

const { Pool } = require('pg');

async function migrateData() {
  console.log('🔄 Starting migration from localStorage to PostgreSQL...');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('Please set DATABASE_URL before running migration');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // First, setup the database schema
    console.log('📋 Setting up database schema...');
    const { setupDatabase } = require('./setup-database-schema.js');
    await setupDatabase();
    
    console.log('📊 Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test your application with PostgreSQL');
    console.log('2. Deploy to Azure using ./scripts/deploy-backend-postgresql.sh');
    console.log('3. Verify all functionality works correctly');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Manual data import function (to be used if needed)
async function importJsonData(jsonData) {
  console.log('📥 Importing JSON data to PostgreSQL...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  const client = await pool.connect();
  
  try {
    // Import evaluations
    if (jsonData.evaluations && jsonData.evaluations.length > 0) {
      console.log(`📋 Importing ${jsonData.evaluations.length} evaluations...`);
      
      for (const evaluation of jsonData.evaluations) {
        await client.query(`
          INSERT INTO evaluations (
            id, name, instructions, status, total_items, 
            original_data, criteria, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          evaluation.id,
          evaluation.name,
          evaluation.instructions || '',
          evaluation.status || 'draft',
          evaluation.totalItems || 0,
          JSON.stringify(evaluation.originalData || []),
          JSON.stringify(evaluation.criteria || []),
          evaluation.createdAt || new Date().toISOString()
        ]);
      }
    }
    
    // Import reviewers
    if (jsonData.reviewers && jsonData.reviewers.length > 0) {
      console.log(`👥 Importing ${jsonData.reviewers.length} reviewers...`);
      
      for (const reviewer of jsonData.reviewers) {
        await client.query(`
          INSERT INTO reviewers (
            id, evaluation_id, name, email, status, 
            completed, total, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          reviewer.id,
          reviewer.evaluationId,
          reviewer.name,
          reviewer.email || null,
          reviewer.status || 'active',
          reviewer.completed || 0,
          reviewer.total || 0,
          reviewer.createdAt || new Date().toISOString()
        ]);
      }
    }
    
    // Import results datasets
    if (jsonData.resultsDatasets && jsonData.resultsDatasets.length > 0) {
      console.log(`📊 Importing ${jsonData.resultsDatasets.length} results datasets...`);
      
      for (const dataset of jsonData.resultsDatasets) {
        await client.query(`
          INSERT INTO results_datasets (
            evaluation_id, evaluation_name, original_data, 
            criteria, results, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (evaluation_id) DO UPDATE SET
            evaluation_name = EXCLUDED.evaluation_name,
            original_data = EXCLUDED.original_data,
            criteria = EXCLUDED.criteria,
            results = EXCLUDED.results
        `, [
          dataset.evaluationId,
          dataset.evaluationName,
          JSON.stringify(dataset.originalData || []),
          JSON.stringify(dataset.criteria || []),
          JSON.stringify(dataset.results || []),
          dataset.createdAt || new Date().toISOString()
        ]);
      }
    }
    
    console.log('✅ Data import completed successfully');
    
  } catch (error) {
    console.error('❌ Data import failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('\n🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateData, importJsonData };
