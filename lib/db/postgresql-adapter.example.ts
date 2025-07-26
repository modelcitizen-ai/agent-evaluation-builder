// Example PostgreSQL adapter (for future implementation)
// This shows how easy it will be to switch to a real database

import { Pool } from 'pg';
import type { DatabaseAdapter, Evaluation, Reviewer, ResultsDataset } from './types';

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Database ready promise
export const dbReady = pool.connect().then(() => {
  console.log('PostgreSQL connected');
  return true;
}).catch((error) => {
  console.error('PostgreSQL connection failed:', error);
  return false;
});

// Evaluation operations
export async function getEvaluations(): Promise<Evaluation[]> {
  await dbReady;
  const result = await pool.query(
    'SELECT * FROM evaluations ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function getEvaluation(id: number): Promise<Evaluation | null> {
  await dbReady;
  const result = await pool.query(
    'SELECT * FROM evaluations WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createEvaluation(data: Partial<Evaluation>): Promise<Evaluation | null> {
  await dbReady;
  const result = await pool.query(
    `INSERT INTO evaluations (name, instructions, status, created_at) 
     VALUES ($1, $2, $3, NOW()) 
     RETURNING *`,
    [data.name, data.instructions, data.status || 'draft']
  );
  return result.rows[0];
}

export async function updateEvaluation(id: number, data: Partial<Evaluation>): Promise<Evaluation | null> {
  await dbReady;
  const setClause = Object.keys(data)
    .filter(key => key !== 'id')
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  
  const values = Object.values(data).filter((_, index) => Object.keys(data)[index] !== 'id');
  
  const result = await pool.query(
    `UPDATE evaluations SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

export async function deleteEvaluation(id: number): Promise<boolean> {
  await dbReady;
  const result = await pool.query('DELETE FROM evaluations WHERE id = $1', [id]);
  return result.rowCount > 0;
}

// Reviewer operations
export async function getReviewers(evaluationId: number): Promise<Reviewer[]> {
  await dbReady;
  const result = await pool.query(
    'SELECT * FROM reviewers WHERE evaluation_id = $1',
    [evaluationId]
  );
  return result.rows;
}

export async function createReviewer(data: Partial<Reviewer>): Promise<Reviewer | null> {
  await dbReady;
  const result = await pool.query(
    `INSERT INTO reviewers (evaluation_id, name, email, created_at) 
     VALUES ($1, $2, $3, NOW()) 
     RETURNING *`,
    [data.evaluationId, data.name, data.email]
  );
  return result.rows[0];
}

// Results dataset operations
export async function initializeEmptyResultsDataset(
  evaluationId: number,
  evaluationName: string,
  originalData: any[],
  criteria: any[]
): Promise<ResultsDataset | null> {
  await dbReady;
  const result = await pool.query(
    `INSERT INTO results_datasets (evaluation_id, evaluation_name, original_data, criteria, results, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [evaluationId, evaluationName, JSON.stringify(originalData), JSON.stringify(criteria), JSON.stringify([])]
  );
  return result.rows[0];
}

export async function addResultToDataset(evaluationId: number, result: any): Promise<ResultsDataset | null> {
  await dbReady;
  // First get current results
  const current = await pool.query(
    'SELECT results FROM results_datasets WHERE evaluation_id = $1',
    [evaluationId]
  );
  
  if (current.rows.length === 0) return null;
  
  const currentResults = JSON.parse(current.rows[0].results);
  currentResults.push(result);
  
  // Update with new results
  const updated = await pool.query(
    'UPDATE results_datasets SET results = $1 WHERE evaluation_id = $2 RETURNING *',
    [JSON.stringify(currentResults), evaluationId]
  );
  
  return updated.rows[0];
}

export async function getResultsDataset(evaluationId: number): Promise<ResultsDataset | null> {
  await dbReady;
  const result = await pool.query(
    'SELECT * FROM results_datasets WHERE evaluation_id = $1',
    [evaluationId]
  );
  return result.rows[0] || null;
}

// Migration and status
export async function hasExistingData(): Promise<boolean> {
  await dbReady;
  const result = await pool.query('SELECT COUNT(*) FROM evaluations');
  return parseInt(result.rows[0].count) > 0;
}

export async function migrateFromLocalStorage(): Promise<{ success: boolean; message: string }> {
  // Implementation would migrate data from localStorage to PostgreSQL
  return { success: true, message: 'Migration from localStorage to PostgreSQL completed' };
}

export async function needsMigration(): Promise<boolean> {
  // Check if localStorage has data but PostgreSQL doesn't
  const hasPostgresData = await hasExistingData();
  
  if (typeof window !== 'undefined') {
    const hasLocalStorageData = localStorage.getItem('evaluations') && 
      JSON.parse(localStorage.getItem('evaluations') || '[]').length > 0;
    return hasLocalStorageData && !hasPostgresData;
  }
  
  return false;
}

/* 
EXAMPLE SQL SCHEMA FOR POSTGRESQL:

CREATE TABLE evaluations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  instructions TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  total_items INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviewers (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER REFERENCES evaluations(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE results_datasets (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER REFERENCES evaluations(id),
  evaluation_name VARCHAR(255),
  original_data JSONB,
  criteria JSONB,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
*/
