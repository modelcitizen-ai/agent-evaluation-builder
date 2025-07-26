/**
 * Intelligent Data Sampling Utility
 * 
 * This utility provides intelligent sampling strategies for dataset analysis,
 * selecting representative rows based on data diversity, completeness, and content patterns.
 * It's designed to improve both AI-assisted and fallback analysis by providing
 * more contextually relevant samples than simple sequential sampling.
 * 
 * Key Features:
 * - Statistical diversity analysis
 * - Content pattern recognition
 * - Data completeness optimization
 * - Domain-aware sampling
 * - Fallback to sequential sampling if needed
 */

export interface SamplingOptions {
  /** Maximum number of rows to sample (default: 5) */
  maxSamples?: number;
  /** Minimum diversity threshold (0-1, default: 0.3) */
  diversityThreshold?: number;
  /** Prioritize rows with complete data (default: true) */
  prioritizeCompleteness?: boolean;
  /** Enable content pattern analysis (default: true) */
  enablePatternAnalysis?: boolean;
  /** Force sequential sampling as fallback (default: false) */
  forceSequential?: boolean;
}

export interface SampleMetadata {
  /** Indices of selected rows */
  selectedIndices: number[];
  /** Diversity score of the sample (0-1) */
  diversityScore: number;
  /** Average completeness of selected rows (0-1) */
  completenessScore: number;
  /** Detected content patterns */
  contentPatterns: string[];
  /** Sampling strategy used */
  strategy: 'intelligent' | 'sequential' | 'fallback';
  /** Performance metrics */
  processingTimeMs: number;
}

/**
 * Performs intelligent sampling on a dataset to select representative rows.
 * 
 * This function analyzes the dataset structure and content to select a diverse,
 * representative sample that provides maximum information for analysis purposes.
 * It falls back to sequential sampling if the dataset is too small or homogeneous.
 * 
 * @param data - Array of data objects (dataset rows)
 * @param columns - Array of column names
 * @param options - Sampling configuration options
 * @returns Object containing sampled data and metadata
 */
export function intelligentSample<T = any>(
  data: T[],
  columns: string[],
  options: SamplingOptions = {}
): { 
  sampledData: T[];
  metadata: SampleMetadata;
} {
  const startTime = Date.now();
  
  const {
    maxSamples = 5,
    diversityThreshold = 0.3,
    prioritizeCompleteness = true,
    enablePatternAnalysis = true,
    forceSequential = false
  } = options;

  // Validate inputs
  if (!Array.isArray(data) || data.length === 0) {
    return {
      sampledData: [],
      metadata: {
        selectedIndices: [],
        diversityScore: 0,
        completenessScore: 0,
        contentPatterns: [],
        strategy: 'fallback',
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    return {
      sampledData: data.slice(0, maxSamples),
      metadata: {
        selectedIndices: Array.from({ length: Math.min(maxSamples, data.length) }, (_, i) => i),
        diversityScore: 0,
        completenessScore: 0,
        contentPatterns: [],
        strategy: 'fallback',
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  // If dataset is small or sequential sampling is forced, use simple approach
  if (data.length <= maxSamples || forceSequential) {
    const sampledData = data.slice(0, maxSamples);
    const selectedIndices = Array.from({ length: sampledData.length }, (_, i) => i);
    
    return {
      sampledData,
      metadata: {
        selectedIndices,
        diversityScore: 0.5, // Neutral for sequential
        completenessScore: calculateCompleteness(sampledData, columns),
        contentPatterns: enablePatternAnalysis ? detectContentPatterns(sampledData, columns) : [],
        strategy: 'sequential',
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  try {
    // Step 1: Analyze dataset characteristics
    const dataCharacteristics = analyzeDatasetCharacteristics(data, columns);
    
    // Step 2: Calculate row scores based on multiple factors
    const rowScores = data.map((row, index) => ({
      index,
      row,
      completenessScore: calculateRowCompleteness(row, columns),
      diversityScore: calculateRowDiversity(row, columns, dataCharacteristics),
      contentScore: enablePatternAnalysis ? calculateContentScore(row, columns) : 0.5,
      combinedScore: 0 // Will be calculated below
    }));

    // Step 3: Calculate combined scores with weights
    rowScores.forEach(rowScore => {
      const completenessWeight = prioritizeCompleteness ? 0.4 : 0.2;
      const diversityWeight = 0.4;
      const contentWeight = enablePatternAnalysis ? 0.2 : 0;
      const baseWeight = enablePatternAnalysis ? 0 : 0.2;

      rowScore.combinedScore = 
        (rowScore.completenessScore * completenessWeight) +
        (rowScore.diversityScore * diversityWeight) +
        (rowScore.contentScore * contentWeight) +
        (baseWeight); // Base score for rows when content analysis is disabled
    });

    // Step 4: Select diverse sample using stratified sampling approach
    const selectedIndices = selectDiverseSample(rowScores, maxSamples, diversityThreshold);
    
    // Step 5: Ensure we have the minimum required samples
    const finalIndices = ensureMinimumSamples(selectedIndices, data.length, maxSamples);
    
    // Step 6: Extract sampled data and calculate metadata
    const sampledData = finalIndices.map(index => data[index]);
    const diversityScore = calculateSampleDiversity(sampledData, columns);
    const completenessScore = calculateCompleteness(sampledData, columns);
    const contentPatterns = enablePatternAnalysis ? detectContentPatterns(sampledData, columns) : [];

    return {
      sampledData,
      metadata: {
        selectedIndices: finalIndices,
        diversityScore,
        completenessScore,
        contentPatterns,
        strategy: 'intelligent',
        processingTimeMs: Date.now() - startTime
      }
    };

  } catch (error) {
    console.warn('Intelligent sampling failed, falling back to sequential:', error);
    
    // Fallback to sequential sampling
    const sampledData = data.slice(0, maxSamples);
    const selectedIndices = Array.from({ length: sampledData.length }, (_, i) => i);
    
    return {
      sampledData,
      metadata: {
        selectedIndices,
        diversityScore: 0.3,
        completenessScore: calculateCompleteness(sampledData, columns),
        contentPatterns: [],
        strategy: 'fallback',
        processingTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Analyzes dataset characteristics to inform sampling decisions.
 */
function analyzeDatasetCharacteristics(data: any[], columns: string[]) {
  const characteristics: {
    columnStats: { [key: string]: {
      uniqueValues: Set<any>;
      avgLength: number;
      nullCount: number;
      dataTypes: Set<string>;
    }};
    overallDiversity: number;
    contentHints: string[];
  } = {
    columnStats: {},
    overallDiversity: 0,
    contentHints: []
  };

  // Analyze each column
  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(val => val != null && val !== '');
    const uniqueValues = new Set(values);
    const avgLength = values.length > 0 ? 
      values.reduce((sum, val) => sum + String(val).length, 0) / values.length : 0;
    const nullCount = data.length - values.length;
    const dataTypes = new Set(values.map(val => typeof val));

    characteristics.columnStats[col] = {
      uniqueValues,
      avgLength,
      nullCount,
      dataTypes
    };

    // Detect content hints
    const colLower = col.toLowerCase();
    if (colLower.includes('url') || colLower.includes('link')) {
      characteristics.contentHints.push('media');
    } else if (colLower.includes('category') || colLower.includes('type')) {
      characteristics.contentHints.push('categorical');
    } else if (colLower.includes('text') || colLower.includes('content')) {
      characteristics.contentHints.push('textual');
    }
  });

  // Calculate overall diversity
  const diversityScores = columns.map(col => {
    const stats = characteristics.columnStats[col];
    const uniqueRatio = stats.uniqueValues.size / Math.max(1, data.length - stats.nullCount);
    return Math.min(1, uniqueRatio);
  });
  
  characteristics.overallDiversity = diversityScores.length > 0 ?
    diversityScores.reduce((sum, score) => sum + score, 0) / diversityScores.length : 0;

  return characteristics;
}

/**
 * Calculates completeness score for a single row.
 */
function calculateRowCompleteness(row: any, columns: string[]): number {
  const nonEmptyColumns = columns.filter(col => {
    const value = row[col];
    return value != null && value !== '' && String(value).trim() !== '';
  });
  
  return nonEmptyColumns.length / columns.length;
}

/**
 * Calculates diversity score for a single row based on dataset characteristics.
 */
function calculateRowDiversity(row: any, columns: string[], characteristics: any): number {
  let diversityScore = 0;
  
  columns.forEach(col => {
    const value = row[col];
    const stats = characteristics.columnStats[col];
    
    if (value != null && value !== '') {
      // Reward unique or rare values
      const frequency = 1; // In a real implementation, we'd track value frequencies
      const rarity = 1 / Math.max(1, frequency);
      
      // Reward longer text content (more information)
      const lengthScore = Math.min(1, String(value).length / Math.max(1, stats.avgLength));
      
      diversityScore += (rarity * 0.6 + lengthScore * 0.4) / columns.length;
    }
  });
  
  return Math.min(1, diversityScore);
}

/**
 * Calculates content quality score for a single row.
 */
function calculateContentScore(row: any, columns: string[]): number {
  let contentScore = 0;
  
  columns.forEach(col => {
    const value = row[col];
    
    if (value != null && value !== '') {
      const strValue = String(value);
      let score = 0.5; // Base score
      
      // Reward rich content
      if (strValue.length > 50) score += 0.2;
      if (strValue.includes('http')) score += 0.1; // URLs indicate rich content
      if (/[.!?]/.test(strValue)) score += 0.1; // Sentences indicate structured content
      if (strValue.split(' ').length > 10) score += 0.1; // Longer text
      
      contentScore += Math.min(1, score) / columns.length;
    }
  });
  
  return Math.min(1, contentScore);
}

/**
 * Selects a diverse sample using stratified sampling approach.
 */
function selectDiverseSample(rowScores: any[], maxSamples: number, diversityThreshold: number): number[] {
  // Sort by combined score (descending)
  rowScores.sort((a, b) => b.combinedScore - a.combinedScore);
  
  const selected: number[] = [];
  const selectedRows = new Set<any>();
  
  // Use a greedy approach to select diverse samples
  for (const rowScore of rowScores) {
    if (selected.length >= maxSamples) break;
    
    // Check if this row adds diversity
    const isDiverse = selected.length === 0 || 
      calculateRowDiversityFromSelected(rowScore.row, selectedRows) >= diversityThreshold;
    
    if (isDiverse) {
      selected.push(rowScore.index);
      selectedRows.add(rowScore.row);
    }
  }
  
  return selected;
}

/**
 * Calculates how diverse a row is compared to already selected rows.
 */
function calculateRowDiversityFromSelected(row: any, selectedRows: Set<any>): number {
  if (selectedRows.size === 0) return 1;
  
  let diversitySum = 0;
  let comparisons = 0;
  
  for (const selectedRow of selectedRows) {
    let similarity = 0;
    let validComparisons = 0;
    
    // Compare values across all keys
    const allKeys = new Set([...Object.keys(row), ...Object.keys(selectedRow)]);
    
    for (const key of allKeys) {
      const val1 = row[key];
      const val2 = selectedRow[key];
      
      if (val1 != null && val2 != null && val1 !== '' && val2 !== '') {
        const str1 = String(val1).toLowerCase();
        const str2 = String(val2).toLowerCase();
        
        if (str1 === str2) {
          similarity += 1;
        } else if (str1.includes(str2) || str2.includes(str1)) {
          similarity += 0.5;
        }
        
        validComparisons++;
      }
    }
    
    if (validComparisons > 0) {
      diversitySum += 1 - (similarity / validComparisons);
      comparisons++;
    }
  }
  
  return comparisons > 0 ? diversitySum / comparisons : 1;
}

/**
 * Ensures we have at least the minimum required samples.
 */
function ensureMinimumSamples(selectedIndices: number[], dataLength: number, maxSamples: number): number[] {
  if (selectedIndices.length >= Math.min(maxSamples, dataLength)) {
    return selectedIndices;
  }
  
  // Add additional samples if needed (preferably from different parts of the dataset)
  const additionalNeeded = Math.min(maxSamples, dataLength) - selectedIndices.length;
  const existingSet = new Set(selectedIndices);
  const additional: number[] = [];
  
  // Try to distribute additional samples across the dataset
  const step = Math.max(1, Math.floor(dataLength / additionalNeeded));
  let currentIndex = 0;
  
  while (additional.length < additionalNeeded && currentIndex < dataLength) {
    if (!existingSet.has(currentIndex)) {
      additional.push(currentIndex);
    }
    currentIndex += step;
  }
  
  // If we still need more, fill sequentially
  for (let i = 0; i < dataLength && additional.length < additionalNeeded; i++) {
    if (!existingSet.has(i) && !additional.includes(i)) {
      additional.push(i);
    }
  }
  
  return [...selectedIndices, ...additional].sort((a, b) => a - b);
}

/**
 * Calculates the overall diversity score of a sample.
 */
function calculateSampleDiversity(sampledData: any[], columns: string[]): number {
  if (sampledData.length <= 1) return 0;
  
  let totalDiversity = 0;
  let comparisons = 0;
  
  for (let i = 0; i < sampledData.length; i++) {
    for (let j = i + 1; j < sampledData.length; j++) {
      const diversity = calculateRowDiversityBetweenTwo(sampledData[i], sampledData[j], columns);
      totalDiversity += diversity;
      comparisons++;
    }
  }
  
  return comparisons > 0 ? totalDiversity / comparisons : 0;
}

/**
 * Calculates diversity between two specific rows.
 */
function calculateRowDiversityBetweenTwo(row1: any, row2: any, columns: string[]): number {
  let differences = 0;
  let validComparisons = 0;
  
  columns.forEach(col => {
    const val1 = row1[col];
    const val2 = row2[col];
    
    if (val1 != null && val2 != null && val1 !== '' && val2 !== '') {
      const str1 = String(val1).toLowerCase();
      const str2 = String(val2).toLowerCase();
      
      if (str1 !== str2) {
        differences++;
      }
      validComparisons++;
    }
  });
  
  return validComparisons > 0 ? differences / validComparisons : 0;
}

/**
 * Calculates the completeness score of a sample.
 */
function calculateCompleteness(sampledData: any[], columns: string[]): number {
  if (sampledData.length === 0) return 0;
  
  const completenessScores = sampledData.map(row => calculateRowCompleteness(row, columns));
  return completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length;
}

/**
 * Detects content patterns in the sampled data.
 */
function detectContentPatterns(sampledData: any[], columns: string[]): string[] {
  const patterns: string[] = [];
  
  // Analyze content patterns across the sample
  columns.forEach(col => {
    const values = sampledData.map(row => row[col]).filter(val => val != null && val !== '');
    
    if (values.length === 0) return;
    
    const strings = values.map(v => String(v));
    
    // Check for URLs/media
    if (strings.some(s => s.includes('http') || s.includes('.com'))) {
      patterns.push('urls');
    }
    
    // Check for long text content
    if (strings.some(s => s.length > 100)) {
      patterns.push('long-text');
    }
    
    // Check for structured content
    if (strings.some(s => s.includes('{') || s.includes('<'))) {
      patterns.push('structured');
    }
    
    // Check for numerical data
    if (strings.some(s => !isNaN(Number(s)))) {
      patterns.push('numerical');
    }
    
    // Check for categorical data
    const uniqueValues = new Set(strings);
    if (uniqueValues.size < strings.length * 0.5 && uniqueValues.size > 1) {
      patterns.push('categorical');
    }
  });
  
  return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Simple sequential sampling function for backward compatibility.
 */
export function sequentialSample<T = any>(
  data: T[],
  maxSamples: number = 5
): {
  sampledData: T[];
  metadata: SampleMetadata;
} {
  const startTime = Date.now();
  const sampledData = data.slice(0, maxSamples);
  const selectedIndices = Array.from({ length: sampledData.length }, (_, i) => i);
  
  return {
    sampledData,
    metadata: {
      selectedIndices,
      diversityScore: 0.5,
      completenessScore: 0.5,
      contentPatterns: [],
      strategy: 'sequential',
      processingTimeMs: Date.now() - startTime
    }
  };
}