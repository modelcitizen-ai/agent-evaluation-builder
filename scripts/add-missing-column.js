#!/usr/bin/env node
// Simple script to add the missing column_roles column

const { Pool } = require('pg');

async function addMissingColumn() {
  console.log('🔄 Adding missing column_roles column...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://dbadmin:HumanEval2025!@human-eval-db-server.postgres.database.azure.com:5432/humanevaldb?sslmode=require',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evaluations' 
      AND column_name = 'column_roles'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('📋 Adding column_roles column...');
      await client.query('ALTER TABLE evaluations ADD COLUMN column_roles JSONB DEFAULT \'[]\'');
      console.log('✅ Column added successfully');
    } else {
      console.log('ℹ️  Column already exists');
    }
    
    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'evaluations' 
      AND column_name = 'column_roles'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful:', verifyResult.rows[0]);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addMissingColumn()
    .then(() => {
      console.log('🎉 Column addition completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Column addition failed:', error.message);
      process.exit(1);
    });
}

module.exports = { addMissingColumn };
