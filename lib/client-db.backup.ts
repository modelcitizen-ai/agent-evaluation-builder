// Client-side service to interact with API endpoints (PostgreSQL or localStorage backend)
// This file provides database operations that work with both storage backends

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

// Get all evaluations via API endpoint
export async function getEvaluations() {
  console.log('Client: Fetching evaluations via API');
  try {
    const response = await fetch('/api/evaluations');
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log(`Client: Found ${result.data.length} evaluations via API`);
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    // Fallback to empty array
    return [];
  }
}

// Get a single evaluation by ID via API endpoint
export async function getEvaluation(id: number) {
  console.log(`Client: Fetching evaluation ${id} via API`);
  try {
    const response = await fetch(`/api/evaluations/${id}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log(`Client: Found evaluation ${id} via API`);
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error(`Error fetching evaluation ${id}:`, error);
    return null;
  }
}

// Create a new evaluation via API endpoint
export async function createEvaluation(evaluationData: any) {
  console.log('Client: Creating evaluation via API', evaluationData.name);
  try {
    const response = await fetch('/api/evaluations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(evaluationData),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log('Client: Evaluation created successfully via API');
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error('Error creating evaluation:', error);
    throw error;
  }
}

// Update an existing evaluation via API endpoint
export async function updateEvaluation(id: number, updates: any) {
  console.log(`Client: Updating evaluation ${id} via API`);
  try {
    const response = await fetch(`/api/evaluations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log(`Client: Evaluation ${id} updated successfully via API`);
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error(`Error updating evaluation ${id}:`, error);
    throw error;
  }
}

// Delete an evaluation via API endpoint
export async function deleteEvaluation(id: number) {
  console.log(`Client: Deleting evaluation ${id} via API`);
  try {
    const response = await fetch(`/api/evaluations/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log(`Client: Evaluation ${id} deleted successfully via API`);
      return true;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error(`Error deleting evaluation ${id}:`, error);
    throw error;
  }
}

// Legacy functions for backward compatibility
// These functions maintain the same interface but now use API calls

export async function addEvaluationItem(evaluationId: number, item: any) {
  console.log(`Client: Adding item to evaluation ${evaluationId} via API`);
  // This would need a specific API endpoint for adding items
  // For now, we'll update the entire evaluation
  try {
    const evaluation = await getEvaluation(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }
    
    const updatedData = [...(evaluation.data || []), item];
    return await updateEvaluation(evaluationId, { data: updatedData });
  } catch (error) {
    console.error(`Error adding item to evaluation ${evaluationId}:`, error);
    throw error;
  }
}

// Get reviewers (placeholder - would need API endpoint)
export async function getReviewers() {
  console.log('Client: Getting reviewers via API');
  try {
    // This would need a dedicated reviewers API endpoint
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return [];
  }
}

// Add reviewer (placeholder - would need API endpoint)
export async function addReviewer(reviewer: any) {
  console.log('Client: Adding reviewer via API');
  try {
    // This would need a dedicated reviewers API endpoint
    return reviewer;
  } catch (error) {
    console.error('Error adding reviewer:', error);
    throw error;
  }
}

// Clear all storage (for testing/reset purposes)
export async function clearAllStorage() {
  console.log('Client: Clearing all storage via API');
  try {
    const response = await fetch('/api/clear-storage', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log('Client: Storage cleared successfully via API');
      return true;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
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
