/**
 * Integration Tests for Dataset Analysis Pipeline
 * 
 * This test suite validates the complete analysis pipeline from data input
 * through analysis to UI-ready transformation.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useDatasetAnalysis } from '../use-dataset-analysis';
import { transformAnalysisResult } from '../../utils/analysis-transformers';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Dataset Analysis Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for fetch
    (global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          evaluationName: 'Content Quality Evaluation',
          instructions: 'Please evaluate the quality of these content pairs.',
          columnAnalysis: [
            {
              columnName: 'prompt',
              suggestedRole: 'Input Data',
              confidence: 90,
              reasoning: 'Column contains input prompts'
            },
            {
              columnName: 'response',
              suggestedRole: 'Model Output',
              confidence: 95,
              reasoning: 'Column contains AI-generated responses'
            },
            {
              columnName: 'category',
              suggestedRole: 'Metadata',
              confidence: 80,
              reasoning: 'Column contains categorization information'
            }
          ],
          suggestedMetrics: [
            {
              name: 'Response Quality',
              type: 'likert-scale',
              options: ['1', '2', '3', '4', '5'],
              reasoning: 'Measures overall quality of response',
              confidence: 90,
              required: true,
              likertLabels: {
                low: 'Poor',
                high: 'Excellent'
              }
            },
            {
              name: 'Factual Accuracy',
              type: 'likert-scale',
              options: ['1', '2', '3', '4', '5'],
              reasoning: 'Measures factual correctness of response',
              confidence: 85,
              required: true,
              likertLabels: {
                low: 'Inaccurate',
                high: 'Completely Accurate'
              }
            },
            {
              name: 'Additional Comments',
              type: 'text-input',
              options: [],
              reasoning: 'Allows for qualitative feedback',
              confidence: 70,
              required: false
            }
          ]
        })
      })
    );
  });
  
  /**
   * Test the complete pipeline from data to UI-ready format
   */
  test('should process data through the complete analysis pipeline', async () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Sample dataset
    const sampleData = [
      {
        prompt: 'Explain quantum computing to a 5-year old',
        response: 'Imagine you have a magic box that can be open and closed at the same time...',
        category: 'Science'
      },
      {
        prompt: 'Write a short poem about the ocean',
        response: 'Waves crash upon the shore, a rhythmic, timeless dance...',
        category: 'Creative'
      },
      {
        prompt: 'What are the benefits of exercise?',
        response: 'Regular exercise improves cardiovascular health, strengthens muscles...',
        category: 'Health'
      }
    ];
    
    const columns = ['prompt', 'response', 'category'];
    
    // Step 1: Run AI analysis
    let analysisResult;
    await act(async () => {
      analysisResult = await result.current.analyzeWithAI(sampleData, columns);
    });
    
    // Verify analysis result structure
    expect(analysisResult).toHaveProperty('evaluationName', 'Content Quality Evaluation');
    expect(analysisResult).toHaveProperty('columnAnalysis');
    expect(analysisResult.columnAnalysis).toHaveLength(3);
    expect(analysisResult).toHaveProperty('suggestedMetrics');
    expect(analysisResult.suggestedMetrics).toHaveLength(3);
    
    // Step 2: Transform for UI
    const uiReady = transformAnalysisResult(analysisResult);
    
    // Verify transformation
    expect(uiReady).toHaveProperty('columnRoles');
    expect(uiReady.columnRoles).toHaveLength(3);
    expect(uiReady).toHaveProperty('criteria');
    expect(uiReady.criteria).toHaveLength(3);
    expect(uiReady).toHaveProperty('evaluationName');
    expect(uiReady).toHaveProperty('instructions');
    
    // Verify column roles are correctly mapped
    const promptRole = uiReady.columnRoles.find(role => role.id === 'prompt');
    expect(promptRole?.userRole).toBe('Input');
    
    const responseRole = uiReady.columnRoles.find(role => role.id === 'response');
    expect(responseRole?.userRole).toBe('Model Output');
  });
  
  /**
   * Test fallback pipeline with transformation
   */
  test('should process data through fallback pipeline when AI fails', async () => {
    // Mock API failure
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.reject(new Error('API failure'))
    );
    
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Sample dataset
    const sampleData = [
      {
        question: 'What is the capital of France?',
        answer: 'Paris',
        difficulty: 'easy'
      },
      {
        question: 'What is the square root of 144?',
        answer: '12',
        difficulty: 'medium'
      }
    ];
    
    const columns = ['question', 'answer', 'difficulty'];
    
    // Step 1: Run analysis (will fall back to heuristic)
    let analysisResult;
    await act(async () => {
      analysisResult = await result.current.analyzeWithAI(sampleData, columns);
    });
    
    // Verify analysis still succeeded despite API failure
    expect(analysisResult).toHaveProperty('success', true);
    expect(analysisResult).toHaveProperty('columnAnalysis');
    expect(analysisResult.columnAnalysis).toHaveLength(3);
    
    // Step 2: Transform for UI
    const uiReady = transformAnalysisResult(analysisResult);
    
    // Verify transformation
    expect(uiReady).toHaveProperty('columnRoles');
    expect(uiReady.columnRoles).toHaveLength(3);
    expect(uiReady).toHaveProperty('criteria');
    expect(uiReady.criteria.length).toBeGreaterThan(0);
    
    // Verify column roles are correctly detected
    const questionRole = uiReady.columnRoles.find(role => role.id === 'question');
    expect(questionRole?.userRole).toBe('Input');
    
    const answerRole = uiReady.columnRoles.find(role => role.id === 'answer');
    expect(answerRole?.userRole).toBe('Model Output');
  });
  
  /**
   * Test data integrity throughout pipeline
   */
  test('should preserve data integrity throughout the pipeline', async () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Dataset with diverse data types
    const complexData = [
      {
        id: 1,
        user_input: 'Complex \n multiline \n query with special characters: $#@!',
        model_output: 'Response with emoji 🚀 and Unicode: é ñ 汉字',
        rating: 4.5,
        timestamp: '2025-06-21T10:30:45Z',
        tags: ['test', 'special', 'unicode']
      }
    ];
    
    const columns = ['id', 'user_input', 'model_output', 'rating', 'timestamp', 'tags'];
    
    // Run analysis
    let analysisResult;
    await act(async () => {
      analysisResult = await result.current.analyzeWithAI(complexData, columns);
    });
    
    // Transform for UI
    const uiReady = transformAnalysisResult(analysisResult);
    
    // Verify all columns are preserved
    expect(uiReady.columnRoles.map(r => r.id).sort()).toEqual(columns.sort());
    
    // Verify special characters in column reasoning/explanations
    uiReady.columnRoles.forEach(role => {
      // Reasoning should be a non-empty string
      expect(typeof role.reasoning).toBe('string');
      expect(role.reasoning.length).toBeGreaterThan(0);
      
      // No undefined or null values
      expect(role.confidence).toBeDefined();
      expect(role.suggestedRole).toBeDefined();
      expect(role.userRole).toBeDefined();
    });
  });
});
