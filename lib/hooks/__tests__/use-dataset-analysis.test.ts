/**
 * Unit Tests for useDatasetAnalysis Hook
 * 
 * This test suite verifies that the useDatasetAnalysis hook correctly:
 * 1. Performs AI-assisted analysis with proper API calls
 * 2. Falls back to heuristic analysis when AI fails
 * 3. Handles errors gracefully
 * 4. Returns properly formatted results
 * 
 * Tests cover both success paths and error handling to ensure 
 * the hook remains robust in various scenarios.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useDatasetAnalysis } from '../use-dataset-analysis';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('useDatasetAnalysis', () => {
  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
    
    // Default mock implementation for fetch
    (global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          evaluationName: 'Test Evaluation',
          instructions: 'Test instructions',
          columnAnalysis: [
            {
              columnName: 'input_text',
              suggestedRole: 'Input Data',
              confidence: 90,
              reasoning: 'Column contains input data'
            },
            {
              columnName: 'response',
              suggestedRole: 'Model Output',
              confidence: 85,
              reasoning: 'Column contains output responses'
            }
          ],
          suggestedMetrics: [
            {
              name: 'Overall Quality',
              type: 'likert-scale',
              options: ['1', '2', '3', '4', '5'],
              reasoning: 'General quality assessment',
              confidence: 80,
              required: true,
              likertLabels: {
                low: 'Poor',
                high: 'Excellent'
              }
            }
          ],
          success: true
        })
      })
    );
  });

  test('should initialize with isAnalyzing=false', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    expect(result.current.isAnalyzing).toBe(false);
    expect(typeof result.current.analyzeWithAI).toBe('function');
    expect(typeof result.current.analyzeFallback).toBe('function');
  });

  test('analyzeWithAI should make API calls and return results', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDatasetAnalysis());
    
    const testData = [{ input_text: 'test', response: 'test response' }];
    const testColumns = ['input_text', 'response'];
    
    // Start analysis
    let promise;
    act(() => {
      promise = result.current.analyzeWithAI(testData, testColumns);
    });
    
    // Should set isAnalyzing to true during analysis
    expect(result.current.isAnalyzing).toBe(true);
    
    // Wait for analysis to complete
    const analysisResult = await promise;
    
    // Verify API calls
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith('/api/analyze-data', expect.anything());
    expect(global.fetch).toHaveBeenCalledWith('/api/suggest-criteria', expect.anything());
    
    // Verify result structure
    expect(analysisResult).toHaveProperty('evaluationName', 'Test Evaluation');
    expect(analysisResult).toHaveProperty('instructions', 'Test instructions');
    expect(analysisResult).toHaveProperty('columnAnalysis');
    expect(analysisResult).toHaveProperty('suggestedMetrics');
    expect(analysisResult).toHaveProperty('success', true);
    
    // Should reset isAnalyzing when complete
    expect(result.current.isAnalyzing).toBe(false);
  });

  test('analyzeWithAI should use fallback when API fails', async () => {
    // Mock fetch to fail
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.reject(new Error('API failure'))
    );
    
    const { result } = renderHook(() => useDatasetAnalysis());
    
    const testData = [{ input_text: 'test', response: 'test response' }];
    const testColumns = ['input_text', 'response'];
    
    // Start analysis
    let analysisResult;
    await act(async () => {
      analysisResult = await result.current.analyzeWithAI(testData, testColumns);
    });
    
    // Should still return a valid result structure (from fallback)
    expect(analysisResult).toHaveProperty('evaluationName');
    expect(analysisResult).toHaveProperty('instructions');
    expect(analysisResult).toHaveProperty('columnAnalysis');
    expect(analysisResult).toHaveProperty('suggestedMetrics');
    expect(analysisResult).toHaveProperty('success', true);
    
    // Should reset isAnalyzing when complete
    expect(result.current.isAnalyzing).toBe(false);
  });

  test('analyzeFallback should work with valid data', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    const testData = [
      { 
        input_prompt: 'What is machine learning?', 
        response: 'Machine learning is a branch of AI...',
        category: 'Education'
      }
    ];
    const testColumns = ['input_prompt', 'response', 'category'];
    
    const analysisResult = result.current.analyzeFallback(testData, testColumns);
    
    // Verify result structure
    expect(analysisResult).toHaveProperty('evaluationName');
    expect(analysisResult).toHaveProperty('instructions');
    expect(analysisResult).toHaveProperty('columnAnalysis');
    expect(analysisResult.columnAnalysis).toHaveLength(3);
    expect(analysisResult).toHaveProperty('suggestedMetrics');
    expect(analysisResult.suggestedMetrics).toHaveLength(3);
    expect(analysisResult).toHaveProperty('success', true);
  });

  test('analyzeFallback should handle video content differently', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    const testData = [
      { 
        video_url: 'https://youtube.com/watch?v=12345', 
        description: 'A video about testing'
      }
    ];
    const testColumns = ['video_url', 'description'];
    
    const analysisResult = result.current.analyzeFallback(testData, testColumns);
    
    // Should detect video content
    expect(analysisResult.evaluationName).toContain('Video');
    
    // Should have video-specific metrics
    const hasVideoQualityMetric = analysisResult.suggestedMetrics.some(
      (metric: any) => metric.name === 'Video Quality'
    );
    expect(hasVideoQualityMetric).toBe(true);
  });

  test('analyzeFallback should handle empty or invalid inputs', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Test with empty data
    const analysisResult1 = result.current.analyzeFallback([], ['col1']);
    
    // Should still return a valid result with defaults
    expect(analysisResult1).toHaveProperty('evaluationName');
    expect(analysisResult1).toHaveProperty('columnAnalysis');
    expect(analysisResult1).toHaveProperty('suggestedMetrics');
    expect(analysisResult1).toHaveProperty('success', true);
    
    // Test with invalid inputs
    const analysisResult2 = result.current.analyzeFallback(null as any, null as any);
    
    // Should handle invalid inputs gracefully
    expect(analysisResult2).toHaveProperty('evaluationName');
    expect(analysisResult2).toHaveProperty('columnAnalysis');
    expect(analysisResult2).toHaveProperty('suggestedMetrics');
    expect(analysisResult2).toHaveProperty('success', true);
  });
});
