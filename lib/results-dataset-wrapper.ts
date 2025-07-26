// This file wraps the database adapter functions with async/await support
// while maintaining compatibility with the existing localStorage-based code

import { 
  initializeEmptyResultsDataset as dbInitializeEmptyResultsDataset,
  addResultToDataset as dbAddResultToDataset,
  getResultsDataset as dbGetResultsDataset,
  saveResultsDataset as dbSaveResultsDataset,
  isMigrationNeeded,
  migrateFromLocalStorage
} from './db/results-dataset-db';

import type { EvaluationResult, ResultsDataset } from './results-dataset';

// Legacy API compatible functions that use the database underneath
export function initializeEmptyResultsDataset(
  evaluationId: number,
  evaluationName: string,
  originalData: any[],
  criteria: any[],
): ResultsDataset {
  // Start the async process but return a sync result
  const promise = dbInitializeEmptyResultsDataset(evaluationId, evaluationName, originalData, criteria);
  
  // Return a synchronous result for backward compatibility
  // The actual save will happen asynchronously
  return {
    evaluationId,
    evaluationName,
    lastUpdated: new Date().toISOString(),
    results: [],
    columns: {
      original: originalData.length > 0 ? Object.keys(originalData[0]) : [],
      responses: criteria.map((c) => c.name),
    },
  };
}

// Add a new result to the dataset
export function addResultToDataset(dataset: ResultsDataset, result: EvaluationResult): ResultsDataset {
  // Start the async process but return a sync result
  dbAddResultToDataset(dataset.evaluationId, result);
  
  // Return a synchronous result for backward compatibility
  return {
    ...dataset,
    lastUpdated: new Date().toISOString(),
    results: [...dataset.results, result],
  };
}

// Get results dataset
export function getResultsDataset(evaluationId: number): ResultsDataset | null {
  try {
    // For backward compatibility, first check localStorage
    const resultsDatasets = JSON.parse(localStorage.getItem("resultsDatasets") || "{}")
    const localDataset = resultsDatasets[evaluationId] || null;
    
    // Start an async fetch from the database for next time
    dbGetResultsDataset(evaluationId).then(dataset => {
      // If we find it in the database and it's newer than localStorage, update localStorage
      if (dataset && (!localDataset || new Date(dataset.lastUpdated) > new Date(localDataset.lastUpdated))) {
        // Update localStorage with the database version
        const updatedResultsDatasets = { ...resultsDatasets };
        updatedResultsDatasets[evaluationId] = dataset;
        localStorage.setItem("resultsDatasets", JSON.stringify(updatedResultsDatasets));
      }
    });
    
    return localDataset;
  } catch (error) {
    console.error("Error retrieving results dataset:", error)
    return null
  }
}

// Save results dataset
export function saveResultsDataset(dataset: ResultsDataset): void {
  try {
    // Start the async process to save to the database
    dbSaveResultsDataset(dataset);
    
    // Save to localStorage for backward compatibility
    const resultsDatasets = JSON.parse(localStorage.getItem("resultsDatasets") || "{}")
    resultsDatasets[dataset.evaluationId] = dataset
    localStorage.setItem("resultsDatasets", JSON.stringify(resultsDatasets))
  } catch (error) {
    console.error("Error saving results dataset:", error)
  }
}

// Export additional functions from the database adapter
export { isMigrationNeeded, migrateFromLocalStorage };
