#!/usr/bin/env node
// scripts/setup-database-schema.js
// Creates the PostgreSQL database schema for the Human Evaluation Builder

const { Pool } = require('pg');

async function setupDatabase() {
  console.log('🔄 Setting up PostgreSQL database schema...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const queries = [
    // Create evaluations table
    `
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      instructions TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'draft',
      total_items INTEGER DEFAULT 0,
      original_data JSONB DEFAULT '[]',
      criteria JSONB DEFAULT '[]',
      column_roles JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Add column_roles column if it doesn't exist (for existing databases)
    `
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evaluations' 
        AND column_name = 'column_roles'
      ) THEN
        ALTER TABLE evaluations ADD COLUMN column_roles JSONB DEFAULT '[]';
      END IF;
    END $$;
    `,
    
    // Create reviewers table
    `
    CREATE TABLE IF NOT EXISTS reviewers (
      id VARCHAR(255) PRIMARY KEY,
      evaluation_id INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      completed INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Create results_datasets table
    `
    CREATE TABLE IF NOT EXISTS results_datasets (
      evaluation_id INTEGER PRIMARY KEY REFERENCES evaluations(id) ON DELETE CASCADE,
      evaluation_name VARCHAR(255) NOT NULL,
      original_data JSONB DEFAULT '[]',
      criteria JSONB DEFAULT '[]',
      results JSONB DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Create indexes for better performance
    `
    CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_reviewers_evaluation_id ON reviewers(evaluation_id);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_reviewers_status ON reviewers(status);
    `,
    
    // Create a view for evaluation statistics
    `
    CREATE OR REPLACE VIEW evaluation_stats AS
    SELECT 
      e.id,
      e.name,
      e.status,
      e.total_items,
      COUNT(r.id) as reviewer_count,
      SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed_reviewers,
      AVG(CASE WHEN r.total > 0 THEN (r.completed::float / r.total * 100) ELSE 0 END) as avg_progress_percent
    FROM evaluations e
    LEFT JOIN reviewers r ON e.id = r.evaluation_id
    GROUP BY e.id, e.name, e.status, e.total_items;
    `,
  ];

  const client = await pool.connect();
  
  try {
    // Execute each query
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i].trim();
      if (query) {
        console.log(`📋 Executing schema update ${i + 1}/${queries.length}...`);
        await client.query(query);
      }
    }
    
    console.log('✅ Database schema setup completed successfully');
    
    // Test the schema by running a simple query
    const testResult = await client.query(`
      SELECT 
        COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('evaluations', 'reviewers', 'results_datasets')
    `);
    
    console.log(`📊 Created ${testResult.rows[0].table_count} tables successfully`);
    
    // Show the created tables
    const tablesResult = await client.query(`
      SELECT table_name, 
             column_name, 
             data_type, 
             is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('evaluations', 'reviewers', 'results_datasets')
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('\n📋 Database Schema Summary:');
    let currentTable = '';
    for (const row of tablesResult.rows) {
      if (row.table_name !== currentTable) {
        console.log(`\n🗂️  Table: ${row.table_name}`);
        currentTable = row.table_name;
      }
      console.log(`   • ${row.column_name} (${row.data_type}${row.is_nullable === 'YES' ? ', nullable' : ''})`);
    }
    
  } catch (error) {
    console.error('❌ Database schema setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n🎉 Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
