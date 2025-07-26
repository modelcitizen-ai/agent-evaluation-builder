import { useState } from "react";

/**
 * Custom hook for dataset analysis with AI assistance and fallback mechanisms.
 * This hook now always uses the backend API for all analysis, including fallback.
 * Only use local fallback for explicit offline/local preview scenarios.
 */
export function useDatasetAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Analyze dataset using the backend API (always, even for fallback).
   * @param {any[]} data - Array of data objects to analyze (dataset rows)
   * @param {string[]} columns - Array of column names in the dataset
   * @param {boolean} useFallback - Optional flag to force using fallback analysis
   * @returns {Promise<Object>} Promise resolving to analysis result
   */
  const analyzeWithAPI = async (
    data: any[],
    columns: string[],
    useFallback: boolean = false
  ) => {
    setIsAnalyzing(true);
    try {
      const requestBody = {
        data: data.slice(0, 10),
        columns,
        useFallback
      };
      const response = await fetch("/api/analyze-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        throw new Error(`API error! status: ${response.status}`);
      }
      const analysisResult = await response.json();
      setIsAnalyzing(false);
      return analysisResult;
    } catch (error) {
      setIsAnalyzing(false);
      throw error;
    }
  };

  // Public API of the hook
  return {
    analyzeWithAPI,
    isAnalyzing
  };
}
