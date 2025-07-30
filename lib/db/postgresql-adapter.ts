// PostgreSQL database adapter
// Implements the same interface as localStorage-adapter.ts using PostgreSQL

import { Pool, PoolClient } from 'pg';
import type { EvaluationResult } from '../results-dataset';
import type { DatabaseAdapter, Evaluation, Reviewer, ResultsDataset } from './types';

// Connection pool for PostgreSQL
let pool: Pool | null = null;

// Initialize connection pool
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Database ready promise - checks if we can connect and sets up schema
export const dbReady = new Promise<boolean>(async (resolve, reject) => {
  try {
    const client = await getPool().connect();
    await client.query('SELECT NOW()');
    
    // Auto-setup database schema if needed
    try {
      await client.query('SELECT 1 FROM evaluations LIMIT 1');
      console.log('✅ PostgreSQL database ready');
    } catch (error) {
      console.log('🔄 Setting up PostgreSQL database schema...');
      
      // Run database schema setup
      const { setupDatabase } = require('../../scripts/setup-database-schema.js');
      await setupDatabase();
      
      console.log('✅ PostgreSQL database schema created');
    }
    
    client.release();
    resolve(true);
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    reject(false);
  }
});

// Helper function to execute queries with error handling
async function executeQuery<T = any>(
  query: string, 
  params: any[] = []
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to execute single row queries
async function executeQuerySingle<T = any>(
  query: string, 
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0] : null;
}

// Evaluation operations
export async function getEvaluations(): Promise<Evaluation[]> {
  const query = `
    SELECT 
      id,
      name,
      instructions,
      status,
      created_at as "createdAt",
      total_items as "totalItems",
      original_data as "originalData",
      criteria
    FROM evaluations 
    ORDER BY created_at DESC
  `;
  
  return await executeQuery<Evaluation>(query);
}

export async function getEvaluation(id: number): Promise<Evaluation | null> {
  const query = `
    SELECT 
      id,
      name,
      instructions,
      status,
      created_at as "createdAt",
      total_items as "totalItems",
      original_data as "originalData",
      criteria
    FROM evaluations 
    WHERE id = $1
  `;
  
  return await executeQuerySingle<Evaluation>(query, [id]);
}

export async function createEvaluation(evaluationData: any): Promise<Evaluation | null> {
  const query = `
    INSERT INTO evaluations (
      name, 
      instructions, 
      status, 
      total_items,
      original_data,
      criteria,
      created_at
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
    RETURNING 
      id,
      name,
      instructions,
      status,
      created_at as "createdAt",
      total_items as "totalItems",
      original_data as "originalData",
      criteria
  `;
  
  const params = [
    evaluationData.name,
    evaluationData.instructions || '',
    evaluationData.status || 'draft',
    evaluationData.totalItems || 0,
    JSON.stringify(evaluationData.originalData || []),
    JSON.stringify(evaluationData.criteria || [])
  ];
  
  return await executeQuerySingle<Evaluation>(query, params);
}

export async function updateEvaluation(id: number, evaluationData: any): Promise<Evaluation | null> {
  // Build dynamic update query based on provided fields
  const fields = [];
  const params = [];
  let paramIndex = 1;
  
  if (evaluationData.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    params.push(evaluationData.name);
  }
  
  if (evaluationData.instructions !== undefined) {
    fields.push(`instructions = $${paramIndex++}`);
    params.push(evaluationData.instructions);
  }
  
  if (evaluationData.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    params.push(evaluationData.status);
  }
  
  if (evaluationData.totalItems !== undefined) {
    fields.push(`total_items = $${paramIndex++}`);
    params.push(evaluationData.totalItems);
  }
  
  if (evaluationData.originalData !== undefined) {
    fields.push(`original_data = $${paramIndex++}`);
    params.push(JSON.stringify(evaluationData.originalData));
  }
  
  if (evaluationData.criteria !== undefined) {
    fields.push(`criteria = $${paramIndex++}`);
    params.push(JSON.stringify(evaluationData.criteria));
  }
  
  if (fields.length === 0) {
    // No fields to update, return existing evaluation
    return await getEvaluation(id);
  }
  
  params.push(id); // Add id as the last parameter
  
  const query = `
    UPDATE evaluations 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id,
      name,
      instructions,
      status,
      created_at as "createdAt",
      total_items as "totalItems",
      original_data as "originalData",
      criteria
  `;
  
  return await executeQuerySingle<Evaluation>(query, params);
}

export async function deleteEvaluation(id: number): Promise<boolean> {
  const query = `DELETE FROM evaluations WHERE id = $1`;
  
  try {
    const result = await executeQuery(query, [id]);
    return true;
  } catch (error) {
    console.error('Error deleting evaluation:', error);
    return false;
  }
}

// Reviewer operations
export async function getReviewers(evaluationId: number): Promise<Reviewer[]> {
  const query = `
    SELECT 
      id,
      evaluation_id as "evaluationId",
      name,
      email,
      status,
      completed,
      total,
      created_at as "createdAt"
    FROM reviewers 
    WHERE evaluation_id = $1
    ORDER BY created_at ASC
  `;
  
  return await executeQuery<Reviewer>(query, [evaluationId]);
}

export async function createReviewer(reviewerData: any): Promise<Reviewer | null> {
  const query = `
    INSERT INTO reviewers (
      id,
      evaluation_id,
      name,
      email,
      status,
      completed,
      total,
      created_at
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
    RETURNING 
      id,
      evaluation_id as "evaluationId",
      name,
      email,
      status,
      completed,
      total,
      created_at as "createdAt"
  `;
  
  const params = [
    reviewerData.id,
    reviewerData.evaluationId,
    reviewerData.name,
    reviewerData.email || null,
    reviewerData.status || 'active',
    reviewerData.completed || 0,
    reviewerData.total || 0
  ];
  
  return await executeQuerySingle<Reviewer>(query, params);
}

// Results dataset operations
export async function initializeEmptyResultsDataset(
  evaluationId: number,
  evaluationName: string,
  originalData: any[],
  criteria: any[]
): Promise<ResultsDataset | null> {
  const query = `
    INSERT INTO results_datasets (
      evaluation_id,
      evaluation_name,
      original_data,
      criteria,
      results,
      created_at
    ) 
    VALUES ($1, $2, $3, $4, $5, NOW()) 
    ON CONFLICT (evaluation_id) 
    DO UPDATE SET
      evaluation_name = EXCLUDED.evaluation_name,
      original_data = EXCLUDED.original_data,
      criteria = EXCLUDED.criteria
    RETURNING 
      evaluation_id as "evaluationId",
      evaluation_name as "evaluationName",
      original_data as "originalData",
      criteria,
      results,
      created_at as "createdAt"
  `;
  
  const params = [
    evaluationId,
    evaluationName,
    JSON.stringify(originalData),
    JSON.stringify(criteria),
    JSON.stringify([])
  ];
  
  return await executeQuerySingle<ResultsDataset>(query, params);
}

export async function addResultToDataset(evaluationId: number, result: EvaluationResult): Promise<void> {
  // First, get the current results
  const currentDataset = await getResultsDataset(evaluationId);
  if (!currentDataset) {
    throw new Error(`Results dataset not found for evaluation ${evaluationId}`);
  }
  
  // Add the new result
  const updatedResults = [...currentDataset.results, result];
  
  // Update the database
  const query = `
    UPDATE results_datasets 
    SET results = $1
    WHERE evaluation_id = $2
  `;
  
  await executeQuery(query, [JSON.stringify(updatedResults), evaluationId]);
}

export async function getResultsDataset(evaluationId: number): Promise<ResultsDataset | null> {
  const query = `
    SELECT 
      evaluation_id as "evaluationId",
      evaluation_name as "evaluationName",
      original_data as "originalData",
      criteria,
      results,
      created_at as "createdAt"
    FROM results_datasets 
    WHERE evaluation_id = $1
  `;
  
  const result = await executeQuerySingle<any>(query, [evaluationId]);
  if (!result) return null;
  
  // Parse JSON fields
  return {
    ...result,
    originalData: typeof result.originalData === 'string' 
      ? JSON.parse(result.originalData) 
      : result.originalData,
    criteria: typeof result.criteria === 'string' 
      ? JSON.parse(result.criteria) 
      : result.criteria,
    results: typeof result.results === 'string' 
      ? JSON.parse(result.results) 
      : result.results,
  };
}

// Utility functions for compatibility with localStorage adapter
export async function hasExistingData(): Promise<boolean> {
  const evaluationsQuery = 'SELECT COUNT(*) as count FROM evaluations';
  const reviewersQuery = 'SELECT COUNT(*) as count FROM reviewers';
  
  const [evalCount, reviewerCount] = await Promise.all([
    executeQuerySingle<{ count: string }>(evaluationsQuery),
    executeQuerySingle<{ count: string }>(reviewersQuery)
  ]);
  
  return (parseInt(evalCount?.count || '0') > 0) || (parseInt(reviewerCount?.count || '0') > 0);
}

// Migration functions (for compatibility - not needed for PostgreSQL)
export async function migrateFromLocalStorage(): Promise<void> {
  // This function is for localStorage->PostgreSQL migration
  // Implementation would depend on specific migration needs
  console.log('PostgreSQL adapter: migrateFromLocalStorage called but not needed');
}

export async function needsMigration(): Promise<boolean> {
  // PostgreSQL doesn't need migration from itself
  return false;
}
