// localStorage-only database adapter
// This replaces Sequelize/SQLite functionality with localStorage operations

import type { EvaluationResult } from '../results-dataset';
import type { DatabaseAdapter, Evaluation, Reviewer, ResultsDataset } from './types';

// Mock database ready promise for localStorage
export const dbReady = Promise.resolve(true);

// In-memory fallback storage for Azure environments where localStorage might be unreliable
const memoryStorage: Record<string, string> = {};

// Helper function to safely access localStorage (returns empty values on server or uses memory fallback)
function safeLocalStorageGet(key: string, defaultValue: string): string {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  try {
    // Try using actual localStorage first
    const value = localStorage.getItem(key);
    if (value !== null) {
      return value;
    }
    
    // If not found in localStorage, check in-memory fallback
    if (memoryStorage[key]) {
      return memoryStorage[key];
    }
    
    return defaultValue;
  } catch (error) {
    console.warn(`Error accessing localStorage for key ${key}, using in-memory fallback:`, error);
    return memoryStorage[key] || defaultValue;
  }
}

// Helper function to safely set localStorage (no-op on server or uses memory fallback)
function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Try saving to actual localStorage
    localStorage.setItem(key, value);
    // Also update in-memory fallback
    memoryStorage[key] = value;
  } catch (error) {
    console.warn(`Error setting localStorage for key ${key}, using in-memory fallback only:`, error);
    // Store in memory fallback only
    memoryStorage[key] = value;
  }
}

// =============================================
// Evaluation functions
// =============================================

/**
 * Get all evaluations from localStorage
 */
export async function getEvaluations() {
  await dbReady;
  try {
    const evaluations = JSON.parse(safeLocalStorageGet('evaluations', '[]'));
    return evaluations.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return [];
  }
}

/**
 * Get a single evaluation by ID from localStorage
 */
export async function getEvaluation(id: number) {
  await dbReady;
  try {
    const evaluations = JSON.parse(safeLocalStorageGet('evaluations', '[]'));
    return evaluations.find((e: any) => e.id === id) || null;
  } catch (error) {
    console.error(`Error fetching evaluation ${id}:`, error);
    return null;
  }
}

/**
 * Create a new evaluation in localStorage
 */
export async function createEvaluation(evaluationData: any) {
  await dbReady;
  try {
    const evaluations = JSON.parse(safeLocalStorageGet('evaluations', '[]'));
    const newEvaluation = {
      ...evaluationData,
      id: Date.now(), // Use timestamp as ID
      createdAt: new Date().toISOString()
    };
    evaluations.push(newEvaluation);
    safeLocalStorageSet('evaluations', JSON.stringify(evaluations));
    return newEvaluation;
  } catch (error) {
    console.error('Error creating evaluation:', error);
    return null;
  }
}

/**
 * Update an existing evaluation in localStorage
 */
export async function updateEvaluation(id: number, evaluationData: any) {
  await dbReady;
  try {
    const evaluations = JSON.parse(safeLocalStorageGet('evaluations', '[]'));
    const index = evaluations.findIndex((e: any) => e.id === id);
    if (index === -1) return null;
    
    evaluations[index] = { ...evaluations[index], ...evaluationData };
    safeLocalStorageSet('evaluations', JSON.stringify(evaluations));
    return evaluations[index];
  } catch (error) {
    console.error(`Error updating evaluation ${id}:`, error);
    return null;
  }
}

/**
 * Delete an evaluation from localStorage
 */
export async function deleteEvaluation(id: number) {
  await dbReady;
  try {
    const evaluations = JSON.parse(safeLocalStorageGet('evaluations', '[]'));
    const filtered = evaluations.filter((e: any) => e.id !== id);
    safeLocalStorageSet('evaluations', JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error(`Error deleting evaluation ${id}:`, error);
    return false;
  }
}

// =============================================
// Reviewer functions
// =============================================

/**
 * Get all reviewers for an evaluation from localStorage
 */
export async function getReviewers(evaluationId: number) {
  await dbReady;
  try {
    const reviewers = JSON.parse(safeLocalStorageGet('reviewers', '[]'));
    return reviewers.filter((r: any) => r.evaluationId === evaluationId);
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return [];
  }
}

/**
 * Create a new reviewer in localStorage
 */
export async function createReviewer(reviewerData: any) {
  await dbReady;
  try {
    const reviewers = JSON.parse(safeLocalStorageGet('reviewers', '[]'));
    const newReviewer = {
      ...reviewerData,
      id: `reviewer_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    reviewers.push(newReviewer);
    safeLocalStorageSet('reviewers', JSON.stringify(reviewers));
    return newReviewer;
  } catch (error) {
    console.error('Error creating reviewer:', error);
    return null;
  }
}

// =============================================
// Results Dataset functions
// =============================================

/**
 * Initialize an empty results dataset
 */
export async function initializeEmptyResultsDataset(
  evaluationId: number,
  evaluationName: string,
  originalData: any[],
  criteria: any[]
) {
  await dbReady;
  try {
    const dataset = {
      evaluationId,
      evaluationName,
      originalData,
      criteria,
      results: [],
      createdAt: new Date().toISOString()
    };
    
    const datasets = JSON.parse(safeLocalStorageGet('resultsDatasets', '{}'));
    datasets[evaluationId] = dataset;
    safeLocalStorageSet('resultsDatasets', JSON.stringify(datasets));
    
    return dataset;
  } catch (error) {
    console.error('Error initializing results dataset:', error);
    return null;
  }
}

/**
 * Add a result to the dataset
 */
export async function addResultToDataset(evaluationId: number, result: EvaluationResult) {
  await dbReady;
  try {
    const datasets = JSON.parse(safeLocalStorageGet('resultsDatasets', '{}'));
    if (!datasets[evaluationId]) return null;
    
    datasets[evaluationId].results.push(result);
    safeLocalStorageSet('resultsDatasets', JSON.stringify(datasets));
    
    return datasets[evaluationId];
  } catch (error) {
    console.error('Error adding result to dataset:', error);
    return null;
  }
}

/**
 * Get results dataset from localStorage
 */
export async function getResultsDataset(evaluationId: number) {
  await dbReady;
  try {
    const datasets = JSON.parse(safeLocalStorageGet('resultsDatasets', '{}'));
    return datasets[evaluationId] || null;
  } catch (error) {
    console.error('Error fetching results dataset:', error);
    return null;
  }
}

// =============================================
// Database status functions
// =============================================

/**
 * Check if there's existing data in localStorage
 */
export async function hasExistingData() {
  await dbReady;
  try {
    const evaluations = JSON.parse(safeLocalStorageGet('evaluations', '[]'));
    return evaluations.length > 0;
  } catch (error) {
    console.error('Error checking existing data:', error);
    return false;
  }
}

/**
 * Migration functions (no-op for localStorage)
 */
export async function migrateFromLocalStorage() {
  return { 
    success: true, 
    message: 'No migration needed for localStorage-only implementation' 
  };
}

export async function needsMigration() {
  return false;
}
