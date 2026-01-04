#!/usr/bin/env node
// Simple script to add the missing randomization_enabled column

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: envLocalPath });
} else {
  // Fallback to .env
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('Loading environment from .env');
    dotenv.config({ path: envPath });
  }
}

async function addRandomizationColumn() {
  console.log('🔄 Adding missing randomization_enabled column...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Set it in .env.local or as an environment variable');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
      AND column_name = 'randomization_enabled'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('📋 Adding randomization_enabled column...');
      await client.query('ALTER TABLE evaluations ADD COLUMN randomization_enabled BOOLEAN DEFAULT FALSE');
      console.log('✅ Column added successfully');
    } else {
      console.log('ℹ️  Column already exists');
    }
    
    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'evaluations' 
      AND column_name = 'randomization_enabled'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful:', verifyResult.rows[0]);
    } else {
      console.error('❌ Verification failed: Column not found after addition attempt');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addRandomizationColumn();
