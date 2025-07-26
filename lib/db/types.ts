// Database adapter interface types
// This ensures all adapters implement the same interface

export interface Evaluation {
  id: number;
  name: string;
  instructions: string;
  status: string;
  createdAt: string;
  totalItems?: number;
  // Add other fields as needed
}

export interface Reviewer {
  id: string;
  evaluationId: number;
  name: string;
  email?: string;
  createdAt: string;
  // Add other fields as needed
}

export interface ResultsDataset {
  evaluationId: number;
  evaluationName: string;
  originalData: any[];
  criteria: any[];
  results: any[];
  createdAt: string;
}

// Database adapter interface - all adapters must implement these methods
export interface DatabaseAdapter {
  // Database status
  dbReady: Promise<boolean>;
  
  // Evaluation operations
  getEvaluations(): Promise<Evaluation[]>;
  getEvaluation(id: number): Promise<Evaluation | null>;
  createEvaluation(data: Partial<Evaluation>): Promise<Evaluation | null>;
  updateEvaluation(id: number, data: Partial<Evaluation>): Promise<Evaluation | null>;
  deleteEvaluation(id: number): Promise<boolean>;
  
  // Reviewer operations
  getReviewers(evaluationId: number): Promise<Reviewer[]>;
  createReviewer(data: Partial<Reviewer>): Promise<Reviewer | null>;
  
  // Results dataset operations
  initializeEmptyResultsDataset(
    evaluationId: number,
    evaluationName: string,
    originalData: any[],
    criteria: any[]
  ): Promise<ResultsDataset | null>;
  addResultToDataset(evaluationId: number, result: any): Promise<ResultsDataset | null>;
  getResultsDataset(evaluationId: number): Promise<ResultsDataset | null>;
  
  // Migration and status
  hasExistingData(): Promise<boolean>;
  migrateFromLocalStorage?(): Promise<{ success: boolean; message: string }>;
  needsMigration?(): Promise<boolean>;
}
