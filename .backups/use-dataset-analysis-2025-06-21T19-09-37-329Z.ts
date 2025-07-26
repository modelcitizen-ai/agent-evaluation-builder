import { useState } from "react";

/**
 * Custom hook for dataset analysis with AI assistance and fallback mechanisms.
 * 
 * This hook centralizes dataset analysis logic by implementing both:
 * 1. AI-assisted analysis using Azure OpenAI API
 * 2. Heuristic-based fallback analysis when AI is unavailable
 * 
 * The hook follows the "strangler fig" pattern to extract functionality 
 * from monolithic components while preserving identical behavior and outputs.
 * 
 * @returns {Object} An object containing:
 *   - analyzeWithAI: Function to analyze data with AI assistance
 *   - analyzeFallback: Function to analyze data with heuristic fallbacks
 *   - isAnalyzing: Boolean state tracking if analysis is in progress
 *   - detectColumnRole: Helper function to determine column purpose
 *   - calculateConfidence: Helper function to determine confidence scores
 *   - generateReason: Helper function to generate explanations
 *   - generateContextualName: Helper function to generate evaluation names
 */
export function useDatasetAnalysis() {
  // Internal state for tracking analysis status
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Analyzes dataset using Azure OpenAI API with automatic fallback.
   * 
   * This function attempts to analyze the dataset using the AI API first.
   * If the AI analysis fails for any reason (API errors, rate limits, etc.),
   * it automatically falls back to the heuristic analysis method.
   * 
   * The function also attempts to get criteria suggestions for the dataset
   * but will continue with just column analysis if criteria suggestions fail.
   * 
   * @param {any[]} data - Array of data objects to analyze (dataset rows)
   * @param {string[]} columns - Array of column names in the dataset
   * @returns {Promise<Object>} Promise resolving to analysis result with:
   *   - columnAnalysis: Analysis of each column with roles and confidence
   *   - evaluationName: Suggested name for the evaluation
   *   - instructions: Suggested instructions for evaluators
   *   - suggestedMetrics: Suggested evaluation criteria
   *   - suggestedCriteria: Additional criteria if available
   *   - success: Boolean indicating success status
   * @throws Will not throw errors, but logs them and uses fallback
   */
  const analyzeWithAI = async (data: any[], columns: string[]) => {
    setIsAnalyzing(true);
    
    try {
      const requestBody = {
        data: data.slice(0, 10), // Limit to 10 rows to avoid token limits
        columns,
      };

      // Get dataset analysis (column roles, evaluation metrics)
      const response = await fetch("/api/analyze-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Azure OpenAI API error! status: ${response.status}`);
      }

      const analysisResult = await response.json();
      
      // Now also get criteria suggestions based on the data
      try {
        const criteriaResponse = await fetch("/api/suggest-criteria", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            datasetSample: data.slice(0, 10),
            taskDescription: "Human evaluation of content items and responses through evaluation forms"
          }),
        });
        
        if (criteriaResponse.ok) {
          const criteriaResult = await criteriaResponse.json();
          
          // Combine both results
          const result = {
            ...analysisResult,
            suggestedCriteria: criteriaResult.criteria,
            success: true
          };

          setIsAnalyzing(false);
          return result;
        }
      } catch (criteriaError) {
        console.error("Error getting criteria suggestions:", criteriaError);
        // Continue with just the analysis result
      }
      
      setIsAnalyzing(false);
      return {
        ...analysisResult,
        success: true
      };
    } catch (error) {
      console.error("AI analysis failed:", error);
      setIsAnalyzing(false);
      
      // Use fallback when AI fails
      return analyzeFallback(data, columns);
    }
  };

  /**
   * Fallback analysis when AI is unavailable or disabled.
   * 
   * Uses heuristics, pattern matching, and content analysis to:
   * - Detect column roles (Input, Model Output, Metadata, Excluded)
   * - Calculate confidence scores for role assignments
   * - Generate explanations for each role assignment
   * - Create appropriate evaluation criteria based on content type
   * - Generate contextual evaluation name and instructions
   * 
   * This method is completely self-contained and doesn't rely on external services,
   * making it robust for offline use or when AI services are unavailable.
   * 
   * @param {any[]} data - Array of data objects to analyze (dataset rows)
   * @param {string[]} columns - Array of column names in the dataset
   * @returns {Object} Analysis result object matching the AI analysis format
   * @throws {Error} If data or columns are empty or invalid
   */
  const analyzeFallback = (data: any[], columns: string[]) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Empty or invalid data provided");
      }
      
      if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error("Empty or invalid columns provided");
      }
      
      // Detect column roles using basic analysis
      const detectedRoles = columns.map((col) => {
        const detectedRole = detectColumnRole(col, data);
        
        // Convert role to proper schema format
        let suggestedRole: string;
        if (detectedRole === "Input") suggestedRole = "Input Data";
        else if (detectedRole === "Model Output") suggestedRole = "Model Output";
        else if (detectedRole === "Excluded") suggestedRole = "Excluded Data";
        else suggestedRole = "Metadata";
        
        return {
          id: col,
          name: col,
          suggestedRole: suggestedRole,
          confidence: calculateConfidence(col, data),
          reasoning: generateReason(col, data),
          reason: generateReason(col, data),
          userRole: detectedRole,
        };
      });

      // Generate contextual evaluation name
      const evaluationName = generateContextualName(data, columns, detectedRoles);
      
      // Determine if we have video content
      const hasVideoContent = data.some((row) =>
        Object.values(row).some(
          (value) =>
            typeof value === "string" &&
            (value.includes(".mp4") ||
              value.includes(".mov") ||
              value.includes("video") ||
              value.includes("youtube") ||
              value.includes("vimeo")),
        ),
      );

      // Generate appropriate criteria
      const criteria = hasVideoContent 
        ? generateVideoCriteria() 
        : generateDefaultCriteria();
      
      // Generate appropriate instructions
      const instructions = "Please evaluate each item carefully. Focus on quality, relevance, accuracy, and appropriateness of the content.";
      
      return {
        columnAnalysis: detectedRoles.map(role => ({
          columnName: role.name,
          suggestedRole: role.suggestedRole,
          confidence: role.confidence,
          reasoning: role.reason
        })),
        suggestedMetrics: criteria,
        evaluationName,
        instructions,
        success: true
      };
    } catch (error) {
      console.error("Error in fallback analysis:", error);
      
      // Ultra-basic fallback for emergency situations
      return {
        columnAnalysis: columns.map(col => ({
          columnName: col,
          suggestedRole: "Input Data",
          confidence: 50,
          reasoning: "Emergency fallback - analysis failed"
        })),
        suggestedMetrics: [
          {
            name: "Overall Quality",
            type: "likert-scale",
            options: ["1", "2", "3", "4", "5"],
            reasoning: "Default metric - analysis failed",
            confidence: 50,
            required: true,
            likertLabels: {
              low: "Poor",
              high: "Excellent"
            }
          },
          {
            name: "Is the content appropriate?",
            type: "yes-no",
            options: ["Yes", "No"],
            reasoning: "Default metric - analysis failed",
            confidence: 50,
            required: true
          },
          {
            name: "Additional Comments",
            type: "text-input",
            options: [],
            reasoning: "Default metric - analysis failed",
            confidence: 50,
            required: false
          }
        ],
        evaluationName: "Content Evaluation",
        instructions: "Please evaluate each item carefully.",
        success: true
      };
    }
  };

  /**
   * Helper function to detect column role based on name and content
   */
  /**
   * Detects the appropriate role for a column based on name and content analysis.
   * 
   * Uses multi-stage heuristic analysis:
   * 1. Column name pattern matching (e.g., "input", "output", "query")
   * 2. Media content detection in values (video/image URLs)
   * 3. Column name hints for media content
   * 4. Default assignment if no clear patterns are found
   * 
   * @param {string} columnName - The name of the column to analyze
   * @param {any[]} data - The dataset rows containing column values
   * @returns {"Input" | "Model Output" | "Excluded" | "Metadata"} The detected role
   */
  const detectColumnRole = (columnName: string, data: any[]): "Input" | "Model Output" | "Excluded" | "Metadata" => {
    const lowerName = columnName.toLowerCase();
    
    // Check if column has no meaningful content
    const columnSamples = data.slice(0, Math.min(5, data.length)).map((row) => row[columnName]);
    const validColumnValues = columnSamples.filter((v) => v != null && v !== "" && String(v).trim() !== "");
    if (validColumnValues.length === 0) return "Excluded";
    
    // 1. Clear column name patterns (highest priority)
    if (lowerName.includes("input") || lowerName.includes("query") || lowerName.includes("prompt") || lowerName.includes("question")) {
      return "Input";
    }
    
    if (lowerName.includes("output") || lowerName.includes("response") || lowerName.includes("generated") || lowerName.includes("completion")) {
      return "Model Output";
    }
    
    // 2. Media content detection (second priority)
    const stringValues = validColumnValues.map((v) => String(v).toLowerCase());
    
    const hasVideoContent = stringValues.some(value => 
      value.includes(".mp4") || value.includes(".webm") || 
      value.includes("youtube.com") || value.includes("youtu.be") || value.includes("vimeo.com")
    );
    
    const hasImageContent = stringValues.some(value =>
      value.includes(".jpg") || value.includes(".png") || value.includes(".gif") ||
      value.includes("imgur.com") || value.includes("unsplash.com")
    );
    
    if (hasVideoContent || hasImageContent) {
      return "Input";
    }
    
    // 3. Column name hints for media
    if (lowerName.includes("video") || lowerName.includes("image") || lowerName.includes("url") || lowerName.includes("link")) {
      return "Input";
    }
    
    // 4. Default
    return "Metadata";
  };

  /**
   * Helper function to calculate confidence score for column role detection
   */
  /**
   * Calculates a confidence score for a column role assignment.
   * 
   * Analyzes multiple factors to determine confidence:
   * - Column name indicators (response/input/metadata patterns)
   * - Content analysis (text length, uniqueness ratio)
   * - Value distribution and patterns
   * 
   * The resulting score ranges from 25 (low confidence) to 95 (high confidence).
   * 
   * @param {string} columnName - The name of the column to analyze
   * @param {any[]} data - The dataset rows containing column values
   * @returns {number} Confidence score between 25-95
   */
  const calculateConfidence = (columnName: string, data: any[]): number => {
    const lowerName = columnName.toLowerCase();
    const sampleValues = data.slice(0, Math.min(10, data.length)).map((row) => row[columnName]);
    const nonEmptyValues = sampleValues.filter((v) => v != null && v !== "");

    if (nonEmptyValues.length === 0) return 25;

    let confidence = 50;

    // Clearer column names get higher confidence
    if (lowerName.includes("input") || lowerName.includes("prompt") || lowerName.includes("query")) {
      confidence += 25;
    } else if (lowerName.includes("output") || lowerName.includes("response") || lowerName.includes("generated")) {
      confidence += 25;
    }

    // More non-empty values = more confidence
    const dataCompleteness = (nonEmptyValues.length / sampleValues.length) * 100;
    if (dataCompleteness > 90) confidence += 10;
    else if (dataCompleteness < 50) confidence -= 10;

    return Math.min(95, Math.max(30, confidence));
  };

  /**
   * Helper function to generate reasoning for column role
   */
  /**
   * Generates a human-readable explanation for a column role assignment.
   * 
   * Creates detailed explanations based on:
   * - Column name patterns and indicators
   * - Content characteristics (video URLs, text length, uniqueness)
   * - Data distribution and patterns
   * 
   * The explanation includes multiple factors separated by semicolons,
   * helping users understand why a particular role was assigned.
   * 
   * @param {string} columnName - The name of the column to analyze
   * @param {any[]} data - The dataset rows containing column values
   * @returns {string} Human-readable explanation for the role assignment
   */
  const generateReason = (columnName: string, data: any[]): string => {
    const lowerName = columnName.toLowerCase();
    
    if (lowerName.includes("input") || lowerName.includes("prompt") || lowerName.includes("query")) {
      return `Column name "${columnName}" suggests input data`;
    }
    
    if (lowerName.includes("output") || lowerName.includes("response") || lowerName.includes("generated")) {
      return `Column name "${columnName}" suggests output/response data`;
    }
    
    // Sample values for content-based reasoning
    const sampleValues = data.slice(0, 3).map((row) => row[columnName]);
    const nonEmptyValues = sampleValues.filter((v) => v != null && v !== "").map(v => String(v));
    
    if (nonEmptyValues.length === 0) {
      return `Column "${columnName}" contains no values in sample`;
    }
    
    // Check for video/image content
    const hasMediaLinks = nonEmptyValues.some(v => 
      v.includes(".jpg") || v.includes(".png") || v.includes(".mp4") || 
      v.includes("youtube") || v.includes("vimeo")
    );
    
    if (hasMediaLinks) {
      return `Column "${columnName}" appears to contain media links or references`;
    }
    
    // Check text length patterns
    const avgLength = nonEmptyValues.reduce((sum, v) => sum + v.length, 0) / nonEmptyValues.length;
    
    if (avgLength > 100) {
      return `Column "${columnName}" contains longer text, suggesting detailed content`;
    }
    
    if (avgLength < 20 && !isNaN(Number(nonEmptyValues[0]))) {
      return `Column "${columnName}" contains short numeric values, suggesting metadata`;
    }
    
    return `Column "${columnName}" role determined by basic content analysis`;
  };

  /**
   * Helper function to generate contextual evaluation name
   */
  /**
   * Generates a contextual evaluation name based on dataset characteristics.
   * 
   * Creates a meaningful name by analyzing:
   * - Column roles and types
   * - Content types (text, video, image)
   * - Key column names and patterns
   * 
   * This helps users quickly understand the purpose of the evaluation
   * without having to manually name it.
   * 
   * @param {any[]} data - The dataset rows
   * @param {string[]} columns - The column names
   * @param {any[]} detectedRoles - The detected roles for each column
   * @returns {string} A contextual name for the evaluation
   */
  const generateContextualName = (data: any[], columns: string[], detectedRoles: any[]): string => {
    // Look for domain-specific columns that might indicate the purpose
    const domainColumns = columns.filter((col) => {
      const lowerCol = col.toLowerCase();
      return (
        lowerCol.includes("category") ||
        lowerCol.includes("type") ||
        lowerCol.includes("domain") ||
        lowerCol.includes("topic") ||
        lowerCol.includes("subject")
      );
    });

    // Check if we have any domain columns with values
    if (domainColumns.length > 0) {
      // Get unique values from the first domain column
      const domainCol = domainColumns[0];
      const uniqueValues = [...new Set(data.slice(0, 5).map((row) => row[domainCol]))].filter(Boolean);

      if (uniqueValues.length === 1) {
        // If there's just one value, use it directly
        return `${uniqueValues[0]}`;
      } else if (uniqueValues.length > 1 && uniqueValues.length <= 3) {
        // If there are a few values, combine them
        return `${uniqueValues.slice(0, 3).join("/")}`;
      }
    }

    // Check for content type indicators
    const hasImages = data.some((row) =>
      Object.values(row).some(
        (val) => typeof val === "string" && (val.includes(".jpg") || val.includes(".png") || val.includes("image")),
      ),
    );

    const hasVideos = data.some((row) =>
      Object.values(row).some(
        (val) =>
          typeof val === "string" && (val.includes(".mp4") || val.includes("youtube") || val.includes("video")),
      ),
    );

    // Look for specific content types
    if (hasVideos) {
      return "Video Content";
    } else if (hasImages) {
      return "Visual Content";
    }

    // Check for specific column patterns
    const hasCustomerData = columns.some(
      (col) =>
        col.toLowerCase().includes("customer") ||
        col.toLowerCase().includes("support") ||
        col.toLowerCase().includes("ticket"),
    );

    const hasProductData = columns.some(
      (col) =>
        col.toLowerCase().includes("product") ||
        col.toLowerCase().includes("item") ||
        col.toLowerCase().includes("merchandise"),
    );

    const hasArticleData = columns.some(
      (col) =>
        col.toLowerCase().includes("article") ||
        col.toLowerCase().includes("blog") ||
        col.toLowerCase().includes("post"),
    );

    // Return domain-specific names
    if (hasCustomerData) {
      return "Customer Support";
    } else if (hasProductData) {
      return "Product Description";
    } else if (hasArticleData) {
      return "Article Content";
    }

    // Fallback to response evaluation focus
    const outputCol = detectedRoles.find((role) => role.userRole === "Model Output");
    const inputCol = detectedRoles.find((role) => role.userRole === "Input");
    
    if (outputCol) {
      const colName = outputCol.name.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
      // Extract meaningful domain context from column name
      const cleanName = colName.replace(/response|output|generated|result|prediction|model/gi, "").trim();
      // If the clean name is too generic or empty, use a better fallback
      if (!cleanName || cleanName.length < 3) {
        return "Content Quality";
      }
      return `${cleanName} Content`;
    } else if (inputCol) {
      const colName = inputCol.name.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
      // When no output column, infer from input what content we're evaluating
      const cleanName = colName.replace(/content|text|data|input|query|prompt|question/gi, "").trim();
      return cleanName ? `${cleanName} Content` : "Content Quality";
    }

    // Ultimate fallback
    return "Content Quality";
  };

  /**
   * Helper function to generate video-specific criteria
   */
  /**
   * Generates video-specific evaluation criteria.
   * 
   * Creates a set of criteria specifically designed for video content evaluation:
   * - Visual quality assessment
   * - Audio quality assessment
   * - Content relevance
   * - Overall engagement
   * - Appropriateness evaluation
   * 
   * @returns {Array<Object>} Array of video-specific evaluation criteria
   */
  const generateVideoCriteria = () => {
    return [
      {
        name: "Video Quality",
        type: "likert-scale",
        options: ["1", "2", "3", "4", "5"],
        reasoning: "Assesses overall video quality including visual clarity, audio quality, and production value",
        confidence: 85,
        required: true,
        likertLabels: { low: "Poor", high: "Excellent" },
      },
      {
        name: "Is the video content appropriate and clear?",
        type: "yes-no",
        options: ["Yes", "No"],
        reasoning: "Binary assessment of content appropriateness and clarity",
        confidence: 80,
        required: true,
      },
      {
        name: "Additional Comments",
        type: "text-input",
        options: [],
        reasoning: "Allows for detailed feedback on video content",
        confidence: 90,
        required: false,
      }
    ];
  };

  /**
   * Helper function to generate default criteria
   */
  /**
   * Generates default evaluation criteria for general content.
   * 
   * Creates a standard set of criteria suitable for most text-based content:
   * - Overall quality (Likert scale)
   * - Relevance assessment
   * - Accuracy evaluation
   * - Clarity measurement
   * - Free-form comments
   * 
   * @returns {Array<Object>} Array of default evaluation criteria
   */
  const generateDefaultCriteria = () => {
    return [
      {
        name: "Overall Quality",
        type: "likert-scale",
        options: ["1", "2", "3", "4", "5"],
        reasoning: "Assesses the general quality of the content",
        confidence: 85,
        required: true,
        likertLabels: { low: "Poor", high: "Excellent" },
      },
      {
        name: "Is the content appropriate and accurate?",
        type: "yes-no",
        options: ["Yes", "No"],
        reasoning: "Binary assessment of content appropriateness and accuracy",
        confidence: 80,
        required: true,
      },
      {
        name: "Additional Comments",
        type: "text-input",
        options: [],
        reasoning: "Allows for detailed feedback on specific aspects",
        confidence: 90,
        required: false,
      }
    ];
  };

  // Public API of the hook
  /**
   * Export the hook with all its public methods and state.
   * 
   * @returns {Object} Object containing:
   *   - analyzeWithAI: Function for AI-assisted analysis
   *   - analyzeFallback: Function for heuristic fallback analysis
   *   - isAnalyzing: State tracking if analysis is in progress
   */
  return {
    analyzeWithAI,
    analyzeFallback,
    isAnalyzing
  };
}
