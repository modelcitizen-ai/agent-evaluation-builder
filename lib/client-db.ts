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

// Get reviewers (with API endpoint)
export async function getReviewers(evaluationId?: number) {
  console.log('Client: Getting reviewers via API', evaluationId ? `for evaluation ${evaluationId}` : '(all)');
  try {
    const url = evaluationId 
      ? `/api/reviewers?evaluationId=${evaluationId}`
      : '/api/reviewers';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log(`Client: Found ${result.data.length} reviewers via API`);
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return [];
  }
}

// Add reviewer (with API endpoint)
export async function addReviewer(reviewer: any) {
  console.log('Client: Adding reviewer via API', reviewer.name);
  try {
    const response = await fetch('/api/reviewers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewer),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log('Client: Reviewer added successfully via API');
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error('Error adding reviewer:', error);
    throw error;
  }
}

// Update reviewer (with API endpoint)
export async function updateReviewer(id: string, updates: any) {
  console.log(`Client: Updating reviewer ${id} via API`);
  try {
    const response = await fetch(`/api/reviewers/${id}`, {
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
      console.log(`Client: Reviewer ${id} updated successfully via API`);
      return result.data;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error(`Error updating reviewer ${id}:`, error);
    throw error;
  }
}

// Remove reviewer (with API endpoint)
export async function removeReviewer(id: string) {
  console.log(`Client: Removing reviewer ${id} via API`);
  try {
    const response = await fetch(`/api/reviewers/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log(`Client: Reviewer ${id} removed successfully via API`);
      return true;
    } else {
      throw new Error(result.error || 'API request failed');
    }
  } catch (error) {
    console.error(`Error removing reviewer ${id}:`, error);
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
