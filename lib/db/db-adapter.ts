// Database adapter - dynamically imports either localStorage or PostgreSQL adapter
// Based on the USE_POSTGRESQL environment variable

const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true';

let adapter: any = null;

// Dynamic import based on environment
async function getAdapter() {
  if (!adapter) {
    if (USE_POSTGRESQL) {
      console.log('🐘 Using PostgreSQL database adapter');
      adapter = await import('./postgresql-adapter');
    } else {
      console.log('� Using localStorage database adapter');
      adapter = await import('./localStorage-adapter');
    }
  }
  return adapter;
}

// Re-export all functions with dynamic loading
export async function getEvaluations() {
  const adapterModule = await getAdapter();
  return adapterModule.getEvaluations();
}

export async function getEvaluation(id: number) {
  const adapterModule = await getAdapter();
  return adapterModule.getEvaluation(id);
}

export async function createEvaluation(evaluation: any) {
  const adapterModule = await getAdapter();
  return adapterModule.createEvaluation(evaluation);
}

export async function updateEvaluation(id: number, updates: any) {
  const adapterModule = await getAdapter();
  return adapterModule.updateEvaluation(id, updates);
}

export async function deleteEvaluation(id: number) {
  const adapterModule = await getAdapter();
  return adapterModule.deleteEvaluation(id);
}

export async function getReviewers(evaluationId?: number) {
  const adapterModule = await getAdapter();
  return adapterModule.getReviewers(evaluationId);
}

export async function addReviewer(reviewer: any) {
  const adapterModule = await getAdapter();
  return adapterModule.addReviewer(reviewer);
}

export async function updateReviewer(id: string, updates: any) {
  const adapterModule = await getAdapter();
  return adapterModule.updateReviewer(id, updates);
}

export async function removeReviewer(id: string) {
  const adapterModule = await getAdapter();
  return adapterModule.removeReviewer(id);
}

export async function getResultsDataset(evaluationId: number) {
  const adapterModule = await getAdapter();
  return adapterModule.getResultsDataset(evaluationId);
}

export async function addResultToDataset(evaluationId: number, result: any) {
  const adapterModule = await getAdapter();
  return adapterModule.addResultToDataset(evaluationId, result);
}

export async function initializeEmptyResultsDataset(evaluationId: number, evaluationName: string, originalData: any[], criteria: any[]) {
  const adapterModule = await getAdapter();
  return adapterModule.initializeEmptyResultsDataset(evaluationId, evaluationName, originalData, criteria);
}

export async function saveResultsDataset(dataset: any) {
  const adapterModule = await getAdapter();
  return adapterModule.saveResultsDataset(dataset);
}

export async function hasExistingData() {
  const adapterModule = await getAdapter();
  return adapterModule.hasExistingData();
}

export async function migrateFromLocalStorage() {
  const adapterModule = await getAdapter();
  return adapterModule.migrateFromLocalStorage();
}

export async function needsMigration() {
  const adapterModule = await getAdapter();
  return adapterModule.needsMigration();
}

// Export dbReady promise
export const dbReady = (async () => {
  const adapterModule = await getAdapter();
  return adapterModule.dbReady;
})();
