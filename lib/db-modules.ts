// This file re-exports the database adapter modules for easier importing
// Export models first
export * from './db/models';

// Export the adapter functions
export {
  getEvaluations,
  getEvaluation,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  getReviewers,
  addReviewer,
  updateReviewer,
  removeReviewer,
  dbReady
} from './db/db-adapter';

// Export the results dataset functions
export {
  initializeEmptyResultsDataset,
  addResultToDataset,
  getResultsDataset,
  saveResultsDataset,
  isMigrationNeeded,
  migrateFromLocalStorage
} from './db/results-dataset-db';
