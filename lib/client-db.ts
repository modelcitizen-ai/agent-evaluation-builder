// Client-side service to interact with localStorage directly
// This file provides localStorage-based data operations for the evaluation system

// Type definitions
interface Evaluation {
  id: number
  name: string
  status: string
  totalItems: number
  createdAt: string
  criteria: any[]
  instructions?: string
  columnRoles?: any[]
  data?: any[]
}

// Get all evaluations directly from localStorage
export async function getEvaluations() {
  console.log('Client: Fetching evaluations from localStorage');
  try {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      console.log('Server-side call detected, returning empty array');
      return [];
    }
    
    const evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
    console.log(`Client: Found ${evaluations.length} evaluations in localStorage`);
    
    // Deduplicate entries with the same ID (resolves "Encountered two children with the same key" error)
    const seenIds = new Set();
    const uniqueEvaluations = evaluations.filter((item: any) => {
      if (seenIds.has(item.id)) {
        console.log(`Duplicate ID found: ${item.id}, filtering out duplicate`);
        return false;
      }
      seenIds.add(item.id);
      return true;
    });
    
    if (uniqueEvaluations.length < evaluations.length) {
      console.log(`Filtered out ${evaluations.length - uniqueEvaluations.length} duplicate evaluation(s)`);
      // Save the deduplicated list back to localStorage
      localStorage.setItem('evaluations', JSON.stringify(uniqueEvaluations));
    }
    
    // Ensure the data is properly formatted for client-side use
    const formattedData = uniqueEvaluations.map((item: any) => {
      // Add a toJSON method if it doesn't exist to prevent errors
      if (!item.toJSON) {
        item.toJSON = function() { return this; };
      }
      return item;
    });
    
    return formattedData;
  } catch (error: any) {
    console.error('Error fetching evaluations from localStorage:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
}

// Get a single evaluation by ID directly from localStorage
export async function getEvaluation(id: number) {
  console.log(`Client: Fetching evaluation ${id} from localStorage`);
  try {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      console.log('Server-side call detected, returning null');
      return null;
    }
    
    const evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
    const evaluation = evaluations.find((e: any) => e.id === id);
    
    if (!evaluation) {
      return null;
    }
    
    // Add toJSON method for compatibility if needed
    if (!evaluation.toJSON) {
      evaluation.toJSON = function() { return this; };
    }
    
    return evaluation;
  } catch (error: any) {
    console.error(`Error fetching evaluation ${id} from localStorage:`, error);
    throw new Error(`Failed to fetch evaluation: ${error.message || String(error)}`);
  }
}

// Create a new evaluation directly in localStorage
export async function createEvaluation(evaluation: Partial<Evaluation>) {
  try {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      console.log('Server-side call detected, returning evaluation as-is');
      return evaluation;
    }
    
    console.log('Client: Creating evaluation in localStorage', evaluation.name);
    
    const evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
    
    // Ensure the ID is unique by checking for existing IDs
    if (evaluation.id && evaluations.some((e: any) => e.id === evaluation.id)) {
      console.log(`Warning: Evaluation with ID ${evaluation.id} already exists. Generating new ID.`);
      // Generate a new unique ID (current timestamp)
      evaluation.id = Date.now();
    }
    
    // Add the new evaluation to the beginning of the array
    evaluations.unshift(evaluation);
    
    // Save back to localStorage
    localStorage.setItem('evaluations', JSON.stringify(evaluations));
    
    console.log('Client: Successfully created evaluation in localStorage');
    
    // Add toJSON method for compatibility
    const result: any = { ...evaluation };
    if (!result.toJSON) {
      result.toJSON = function() { return this; };
    }
    
    return result;
  } catch (error: any) {
    console.error('Error creating evaluation in localStorage:', error);
    throw new Error(`Failed to create evaluation: ${error.message || String(error)}`);
  }
}

// Update an evaluation directly in localStorage
export async function updateEvaluation(id: number, evaluation: Partial<Evaluation>) {
  try {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      console.log('Server-side call detected, returning evaluation as-is');
      return evaluation;
    }
    
    console.log(`Client: Updating evaluation ${id} in localStorage`);
    
    const evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
    const index = evaluations.findIndex((e: any) => e.id === id);
    
    if (index === -1) {
      throw new Error(`Evaluation with ID ${id} not found`);
    }
    
    // Update the evaluation
    evaluations[index] = { ...evaluations[index], ...evaluation };
    
    // Save back to localStorage
    localStorage.setItem('evaluations', JSON.stringify(evaluations));
    
    console.log('Client: Successfully updated evaluation in localStorage');
    
    // Add toJSON method for compatibility
    const result: any = evaluations[index];
    if (!result.toJSON) {
      result.toJSON = function() { return this; };
    }
    
    return result;
  } catch (error: any) {
    console.error(`Error updating evaluation ${id} in localStorage:`, error);
    throw new Error(`Failed to update evaluation: ${error.message || String(error)}`);
  }
}

// Delete an evaluation directly from localStorage
export async function deleteEvaluation(id: number) {
  try {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      console.log('Server-side call detected, returning true');
      return true;
    }
    
    console.log(`Client: Deleting evaluation ${id} from localStorage`);
    
    const evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
    const filteredEvaluations = evaluations.filter((e: any) => e.id !== id);
    
    // Save back to localStorage
    localStorage.setItem('evaluations', JSON.stringify(filteredEvaluations));
    
    console.log('Client: Successfully deleted evaluation from localStorage');
    
    return true;
  } catch (error: any) {
    console.error(`Error deleting evaluation ${id} from localStorage:`, error);
    throw new Error(`Failed to delete evaluation: ${error.message || String(error)}`);
  }
}

// Check if migration is needed (always false for localStorage-only implementation)
export async function isMigrationNeeded() {
  // localStorage-only implementation never needs migration
  return false;
}

// Perform migration from localStorage to database (no-op for localStorage-only)
export async function migrateFromLocalStorage() {
  // localStorage-only implementation doesn't need migration
  return { 
    success: true, 
    message: 'No migration needed for localStorage-only implementation' 
  };
}
