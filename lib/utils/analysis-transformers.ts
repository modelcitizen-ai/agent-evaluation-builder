/**
 * Utilities for transforming analysis results between different formats.
 * 
 * This module contains functions that transform the raw analysis results
 * from the dataset analysis process into formats that can be consumed
 * by different parts of the application UI.
 */

/**
 * Transforms the analysis result from the useDatasetAnalysis hook
 * into the format expected by the UI components.
 * 
 * This function serves as an adapter between the analysis service layer
 * and the UI presentation layer, ensuring data compatibility and
 * maintaining separation of concerns.
 * 
 * @param {Object} analysisResult - The raw analysis result from useDatasetAnalysis
 * @param {boolean} analysisResult.success - Whether the analysis was successful
 * @param {Array} analysisResult.columnAnalysis - Analysis results for each column
 * @param {Array} analysisResult.suggestedMetrics - Suggested evaluation metrics
 * @param {string} analysisResult.evaluationName - Suggested name for the evaluation
 * @param {string} analysisResult.instructions - Suggested instructions for evaluators
 * 
 * @returns {Object} Transformed analysis result with:
 *   - columnRoles: Array of column role objects formatted for UI
 *   - criteria: Array of evaluation criteria formatted for UI
 *   - evaluationName: Name for the evaluation
 *   - instructions: Instructions for evaluators
 */
export function transformAnalysisResult(analysisResult: any) {
  if (!analysisResult || !Array.isArray(analysisResult.columnAnalysis) || !Array.isArray(analysisResult.suggestedMetrics)) {
    return {
      columnRoles: [],
      criteria: [],
      evaluationName: "Content Quality Assessment",
      instructions: "Please evaluate each item carefully."
    };
  }

  // Transform column roles
  const columnRoles = analysisResult.columnAnalysis.map((col: any) => {
    let convertedRole = col.suggestedRole;
    if (col.suggestedRole === "Input Data" || col.suggestedRole === "Input") convertedRole = "Input";
    else if (col.suggestedRole === "Model Output" || col.suggestedRole === "Output") convertedRole = "Model Output";
    else if (col.suggestedRole === "Excluded Data" || col.suggestedRole === "Excluded") convertedRole = "Excluded";
    else if (col.suggestedRole === "Reference") convertedRole = "Reference";
    else if (col.suggestedRole === "Metadata") convertedRole = "Metadata";
    else convertedRole = col.suggestedRole;

    return {
      id: col.columnName,
      name: col.columnName,
      suggestedRole: col.suggestedRole,
      confidence: col.confidence,
      reasoning: col.reasoning,
      reason: col.reasoning,
      userRole: convertedRole,
      labelVisible: true, // Default to visible
    };
  });

  // Transform criteria
  const criteria = analysisResult.suggestedMetrics.map((metric: any, index: number) => ({
    id: index + 1,
    name: metric.name,
    type: metric.type,
    options: metric.options,
    required: metric.required,
    likertLabels: metric.likertLabels,
    aiGenerated: true,
  }));

  return {
    columnRoles,
    criteria,
    evaluationName: analysisResult.evaluationName,
    instructions: analysisResult.instructions
  };
}
