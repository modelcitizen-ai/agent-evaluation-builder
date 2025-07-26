import { useState } from "react";
import { intelligentSample, SamplingOptions } from "@/lib/utils/intelligent-sampling";

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
   * @param {SamplingOptions} samplingOptions - Optional sampling configuration
   * @returns {Promise<Object>} Promise resolving to analysis result
   */
  const analyzeWithAPI = async (
    data: any[],
    columns: string[],
    useFallback: boolean = false,
    samplingOptions: SamplingOptions = {}
  ) => {
    setIsAnalyzing(true);
    try {
      // Use intelligent sampling to select representative data
      const { sampledData, metadata: samplingMetadata } = intelligentSample(
        data,
        columns,
        {
          maxSamples: 10,
          prioritizeCompleteness: true,
          enablePatternAnalysis: true,
          ...samplingOptions
        }
      );
      const requestBody = {
        data: sampledData,
        columns,
        useFallback,
        samplingMetadata,
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
      // Optionally, for local dev/offline preview, fallback to local analysis here
      // return generateFallbackAnalysis(data, columns);
      throw error;
    }
  };

  // Public API of the hook
  return {
    analyzeWithAPI,
    isAnalyzing
  };
}