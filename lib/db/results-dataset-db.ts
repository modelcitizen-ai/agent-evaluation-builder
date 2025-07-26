// This file provides a compatibility layer between the old localStorage-based 
// results-dataset.ts and the new database-based implementation
import * as dbAdapter from './db-adapter';
import type { EvaluationResult, ResultsDataset } from '../results-dataset';

// Initialize an empty results dataset for a new evaluation
export async function initializeEmptyResultsDataset(
  evaluationId: number,
  evaluationName: string,
  originalData: any[],
  criteria: any[],
): Promise<ResultsDataset> {
  const dataset = await dbAdapter.initializeEmptyResultsDataset(
    evaluationId,
    evaluationName,
    originalData,
    criteria
  );
  
  return dataset as ResultsDataset;
}

// Add a new result to the dataset
export async function addResultToDataset(dataset: ResultsDataset, result: EvaluationResult): Promise<ResultsDataset> {
  const updatedDataset = await dbAdapter.addResultToDataset(dataset.evaluationId, result);
  return updatedDataset as ResultsDataset;
}

// Get results dataset from database
export async function getResultsDataset(evaluationId: number): Promise<ResultsDataset | null> {
  const dataset = await dbAdapter.getResultsDataset(evaluationId);
  return dataset as ResultsDataset | null;
}

// Save results dataset to database
export async function saveResultsDataset(dataset: ResultsDataset): Promise<void> {
  // For localStorage implementation, we just need to ensure the dataset exists
  await dbAdapter.initializeEmptyResultsDataset(
    dataset.evaluationId,
    dataset.evaluationName,
    [], // We don't have the original data here, but it's already in the dataset
    [] // We don't have the criteria here, but it's already in the dataset
  );
}

// Check if migration is needed
export async function isMigrationNeeded(): Promise<boolean> {
  // For localStorage-only implementation, no migration is needed
  return false;
}

// Migrate data from localStorage
export async function migrateFromLocalStorage(): Promise<{ success: boolean; message: string }> {
  return await dbAdapter.migrateFromLocalStorage();
}
