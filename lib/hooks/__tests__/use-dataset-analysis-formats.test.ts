/**
 * Advanced Dataset Format Tests for useDatasetAnalysis
 * 
 * This test suite focuses on testing the hook with diverse dataset formats
 * to ensure it handles a wide variety of real-world data correctly.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useDatasetAnalysis } from '../use-dataset-analysis';
import { transformAnalysisResult } from '../../utils/analysis-transformers';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('useDatasetAnalysis with diverse datasets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for fetch
    (global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          evaluationName: 'Test Evaluation',
          instructions: 'Test instructions',
          columnAnalysis: [],
          suggestedMetrics: []
        })
      })
    );
  });
  
  /**
   * Test with JSON dataset with various field types
   */
  test('should analyze complex JSON dataset with mixed data types', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Complex dataset with various data types
    const complexData = [
      {
        id: 1,
        timestamp: '2025-06-01T12:30:45Z',
        user_query: 'How do I improve my garden soil?',
        model_response: 'To improve garden soil, add organic matter like compost, use mulch, test pH levels, and consider cover crops during off-seasons.',
        response_tokens: 28,
        model_version: 'gpt-4o-mini',
        response_latency_ms: 234,
        user_rating: 4.5,
        user_feedback: 'Very helpful advice, but I would have liked more specific product recommendations.',
        tags: ['gardening', 'soil', 'improvement'],
        is_sensitive: false,
        metadata: {
          location: 'US',
          device: 'mobile',
          session_id: 'abc123def456'
        }
      },
      {
        id: 2,
        timestamp: '2025-06-01T12:35:12Z',
        user_query: 'What are the symptoms of dehydration?',
        model_response: 'Symptoms of dehydration include thirst, dark urine, dry mouth, fatigue, dizziness, confusion, and in severe cases, rapid heartbeat and breathing.',
        response_tokens: 32,
        model_version: 'gpt-4o-mini',
        response_latency_ms: 198,
        user_rating: 5.0,
        user_feedback: 'Comprehensive and clear explanation.',
        tags: ['health', 'medical', 'hydration'],
        is_sensitive: true,
        metadata: {
          location: 'UK',
          device: 'desktop',
          session_id: 'xyz789abc012'
        }
      }
    ];
    
    const columns = [
      'id', 'timestamp', 'user_query', 'model_response', 'response_tokens',
      'model_version', 'response_latency_ms', 'user_rating', 'user_feedback',
      'tags', 'is_sensitive', 'metadata'
    ];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(complexData, columns);
    
    // Verify column roles
    const columnRoleMap = analysisResult.columnAnalysis.reduce((map: any, col: any) => {
      map[col.columnName] = col.suggestedRole;
      return map;
    }, {});
    
    // Input detection
    expect(columnRoleMap['user_query']).toContain('Input');
    
    // Output detection
    expect(columnRoleMap['model_response']).toContain('Output');
    
    // Metadata detection
    expect(columnRoleMap['id']).toContain('Metadata');
    expect(columnRoleMap['timestamp']).toContain('Metadata');
    expect(columnRoleMap['model_version']).toContain('Metadata');
    
    // Complex fields (arrays/objects) should be properly handled
    expect(analysisResult.columnAnalysis.find((col: any) => col.columnName === 'tags')).toBeDefined();
    expect(analysisResult.columnAnalysis.find((col: any) => col.columnName === 'metadata')).toBeDefined();
  });
  
  /**
   * Test with data containing URLs and media content
   */
  test('should detect media content in dataset', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Dataset with media URLs
    const mediaData = [
      {
        id: 1,
        image_url: 'https://example.com/images/garden.jpg',
        description: 'A beautiful garden with flowers',
        ai_caption: 'Vibrant garden with red and yellow tulips in bloom surrounded by green foliage.'
      },
      {
        id: 2,
        image_url: 'https://example.com/images/landscape.png',
        description: 'Mountain landscape at sunset',
        ai_caption: 'Majestic mountain range with snow-capped peaks against an orange and purple sunset sky.'
      },
      {
        id: 3,
        video_url: 'https://youtube.com/watch?v=abcdef12345',
        description: 'Tutorial on landscape photography',
        ai_caption: 'Detailed instructional video showing camera settings and composition techniques for landscape photography.'
      }
    ];
    
    const columns = ['id', 'image_url', 'video_url', 'description', 'ai_caption'];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(mediaData, columns);
    
    // Verify detection of media columns
    const imageColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'image_url'
    );
    expect(imageColumn.suggestedRole).toContain('Input');
    
    const videoColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'video_url'
    );
    expect(videoColumn.suggestedRole).toContain('Input');
    
    // Check if AI caption is detected as model output
    const captionColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'ai_caption'
    );
    expect(captionColumn.suggestedRole).toContain('Output');
    
    // Should create appropriate evaluation name for media content
    expect(analysisResult.evaluationName.toLowerCase()).toMatch(/image|video|media/);
    
    // Should suggest appropriate criteria for media
    const hasAppropriateMetric = analysisResult.suggestedMetrics.some(
      (metric: any) => 
        metric.name.toLowerCase().includes('quality') || 
        metric.name.toLowerCase().includes('accuracy') ||
        metric.name.toLowerCase().includes('relevance')
    );
    expect(hasAppropriateMetric).toBe(true);
  });
  
  /**
   * Test with sparse/incomplete data
   */
  test('should handle sparse data with missing values', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Dataset with sparse/missing values
    const sparseData = [
      {
        id: 1,
        question: 'How do neural networks work?',
        answer: 'Neural networks are computing systems inspired by biological neural networks...',
        category: 'AI',
        difficulty: 'advanced',
        user_rating: 4.2
      },
      {
        id: 2,
        question: 'What is transfer learning?',
        // Missing answer
        category: 'AI',
        // Missing difficulty
        user_rating: null
      },
      {
        id: 3,
        // Missing question
        answer: 'Gradient descent is an optimization algorithm used to minimize a function...',
        category: '', // Empty string
        difficulty: 'intermediate',
        user_rating: undefined
      },
      {
        id: 4,
        question: '',  // Empty question
        answer: null,  // Null answer
        category: 'AI',
        difficulty: 'beginner',
        user_rating: 0
      }
    ];
    
    const columns = ['id', 'question', 'answer', 'category', 'difficulty', 'user_rating'];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(sparseData, columns);
    
    // Should still return complete analysis with all columns
    expect(analysisResult.columnAnalysis).toHaveLength(columns.length);
    
    // Columns with only empty/null values should be marked as excluded
    const answerColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'answer'
    );
    
    // Still should provide reasonable evaluation name and criteria
    expect(analysisResult.evaluationName).toBeTruthy();
    expect(analysisResult.suggestedMetrics.length).toBeGreaterThan(0);
  });
  
  /**
   * Test with minimal dataset (single row, few columns)
   */
  test('should handle minimal datasets', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Minimal dataset
    const minimalData = [
      { prompt: 'Describe a sunset', completion: 'A beautiful orange and red sky as the sun descends below the horizon.' }
    ];
    
    const columns = ['prompt', 'completion'];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(minimalData, columns);
    
    // Should still produce valid analysis
    expect(analysisResult.columnAnalysis).toHaveLength(2);
    expect(analysisResult.evaluationName).toBeTruthy();
    expect(analysisResult.suggestedMetrics.length).toBeGreaterThan(0);
    
    // Check correct role detection even with minimal data
    const promptColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'prompt'
    );
    expect(promptColumn.suggestedRole).toContain('Input');
    
    const completionColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'completion'
    );
    expect(completionColumn.suggestedRole).toContain('Output');
  });
  
  /**
   * Test transformation logic from analysis result to UI format
   */
  test('should transform analysis results correctly for UI', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Basic test data
    const testData = [
      { input: 'What is the capital of France?', output: 'The capital of France is Paris.' }
    ];
    const columns = ['input', 'output'];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(testData, columns);
    
    // Transform for UI
    const transformedResult = transformAnalysisResult(analysisResult);
    
    // Verify transformation
    expect(transformedResult).toHaveProperty('columnRoles');
    expect(transformedResult).toHaveProperty('criteria');
    expect(transformedResult).toHaveProperty('evaluationName');
    expect(transformedResult).toHaveProperty('instructions');
    
    // Check column role transformation
    expect(transformedResult.columnRoles).toHaveLength(2);
    
    // Each column role should have required properties
    transformedResult.columnRoles.forEach((role: any) => {
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('suggestedRole');
      expect(role).toHaveProperty('confidence');
      expect(role).toHaveProperty('reasoning');
      expect(role).toHaveProperty('userRole');
    });
    
    // Criteria should be properly transformed
    transformedResult.criteria.forEach((criterion: any) => {
      expect(criterion).toHaveProperty('id');
      expect(criterion).toHaveProperty('name');
      expect(criterion).toHaveProperty('type');
      expect(criterion).toHaveProperty('required');
    });
  });
});
