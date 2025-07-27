// Types for evaluation results
export interface EvaluationResult {
  evaluationId: number
  itemId: string | number
  reviewerId: string
  reviewerName: string
  submittedAt: string
  timeSpent: number // seconds
  responses: Record<string, string> // criterionId -> response
  originalData: Record<string, any> // Original data columns for context
}

export interface ResultsDataset {
  evaluationId: number
  evaluationName: string
  lastUpdated: string
  results: EvaluationResult[]
  columns: {
    original: string[] // Original data columns
    responses: string[] // Response columns (criterion names)
  }
}

// Initialize an empty results dataset for a new evaluation
export function initializeEmptyResultsDataset(
  evaluationId: number,
  evaluationName: string,
  originalData: any[],
  criteria: any[],
): ResultsDataset {
  // Extract column names from the first item in original data
  const originalColumns = originalData.length > 0 ? Object.keys(originalData[0]) : []

  // Extract criterion names for response columns
  const responseColumns = criteria.map((c) => c.name)

  return {
    evaluationId,
    evaluationName,
    lastUpdated: new Date().toISOString(),
    results: [], // Empty results array
    columns: {
      original: originalColumns,
      responses: responseColumns,
    },
  }
}

// Add a new result to the dataset or update existing one
export function addResultToDataset(dataset: ResultsDataset, result: EvaluationResult): ResultsDataset {
  // Check if there's already a result for this reviewer and item
  const existingResultIndex = dataset.results.findIndex(
    (r) => r.reviewerId === result.reviewerId && r.itemId === result.itemId
  )
  
  let updatedResults: EvaluationResult[]
  
  if (existingResultIndex !== -1) {
    // Update existing result
    updatedResults = [...dataset.results]
    updatedResults[existingResultIndex] = result
    console.log(`[addResultToDataset] Updated existing result for reviewer ${result.reviewerId}, item ${result.itemId}`)
  } else {
    // Add new result
    updatedResults = [...dataset.results, result]
    console.log(`[addResultToDataset] Added new result for reviewer ${result.reviewerId}, item ${result.itemId}`)
  }
  
  return {
    ...dataset,
    lastUpdated: new Date().toISOString(),
    results: updatedResults,
  }
}

// Get results dataset from localStorage
export function getResultsDataset(evaluationId: number): ResultsDataset | null {
  try {
    const resultsDatasets = JSON.parse(localStorage.getItem("resultsDatasets") || "{}")
    return resultsDatasets[evaluationId] || null
  } catch (error) {
    console.error("Error retrieving results dataset:", error)
    return null
  }
}

// Save results dataset to localStorage
export function saveResultsDataset(dataset: ResultsDataset): void {
  try {
    const resultsDatasets = JSON.parse(localStorage.getItem("resultsDatasets") || "{}")
    resultsDatasets[dataset.evaluationId] = dataset
    localStorage.setItem("resultsDatasets", JSON.stringify(resultsDatasets))
  } catch (error) {
    console.error("Error saving results dataset:", error)
  }
}
