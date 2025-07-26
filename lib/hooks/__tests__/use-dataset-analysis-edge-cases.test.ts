/**
 * Edge Case Tests for useDatasetAnalysis
 * 
 * This test suite focuses on testing the hook with edge cases and extreme conditions
 * to ensure robust handling of unexpected inputs and scenarios.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useDatasetAnalysis } from '../use-dataset-analysis';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('useDatasetAnalysis edge cases', () => {
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
   * Test with completely empty dataset
   */
  test('should handle completely empty dataset', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Empty dataset
    const emptyData: any[] = [];
    const columns: string[] = [];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(emptyData, columns);
    
    // Should still return a valid structure with defaults
    expect(analysisResult).toHaveProperty('evaluationName');
    expect(analysisResult).toHaveProperty('instructions');
    expect(analysisResult).toHaveProperty('columnAnalysis');
    expect(analysisResult).toHaveProperty('suggestedMetrics');
    expect(analysisResult).toHaveProperty('success', true);
    
    // Column analysis should be empty array
    expect(Array.isArray(analysisResult.columnAnalysis)).toBe(true);
    expect(analysisResult.columnAnalysis).toHaveLength(0);
    
    // Should still have default metrics
    expect(analysisResult.suggestedMetrics.length).toBeGreaterThan(0);
  });
  
  /**
   * Test with invalid inputs (null, undefined, etc.)
   */
  test('should handle invalid inputs gracefully', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Test various invalid inputs
    const testCases = [
      { data: null, columns: ['col1', 'col2'] },
      { data: [{ a: 1, b: 2 }], columns: null },
      { data: undefined, columns: undefined },
      { data: 'not an array', columns: ['col1'] },
      { data: [{ a: 1 }], columns: 'not an array' },
      { data: {}, columns: [] },
      { data: [], columns: {} }
    ];
    
    testCases.forEach((testCase, index) => {
      // @ts-ignore - intentionally testing invalid types
      const analysisResult = result.current.analyzeFallback(testCase.data, testCase.columns);
      
      // Should return a valid structure with defaults in all cases
      expect(analysisResult).toHaveProperty('evaluationName');
      expect(analysisResult).toHaveProperty('instructions');
      expect(analysisResult).toHaveProperty('columnAnalysis');
      expect(analysisResult).toHaveProperty('suggestedMetrics');
      expect(analysisResult).toHaveProperty('success', true);
    });
  });
  
  /**
   * Test with extremely large datasets
   */
  test('should handle very large datasets efficiently', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Create a large dataset
    const largeData = Array(1000).fill(null).map((_, i) => ({
      id: i,
      input: `Test input ${i}`,
      output: `Test output for input ${i} with some additional text to make it longer.`,
      metadata: {
        timestamp: new Date().toISOString(),
        user_id: `user_${i % 50}`,
        session_id: `session_${i % 100}`
      }
    }));
    
    const columns = ['id', 'input', 'output', 'metadata'];
    
    // Measure execution time
    const startTime = performance.now();
    const analysisResult = result.current.analyzeFallback(largeData, columns);
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Should complete within a reasonable time (500ms is a good threshold for this test)
    expect(executionTime).toBeLessThan(1000);
    
    // Should still produce valid results
    expect(analysisResult.columnAnalysis).toHaveLength(columns.length);
    expect(analysisResult.suggestedMetrics.length).toBeGreaterThan(0);
    
    // Should have analyzed all columns
    columns.forEach(column => {
      const columnAnalysis = analysisResult.columnAnalysis.find(
        (col: any) => col.columnName === column
      );
      expect(columnAnalysis).toBeDefined();
    });
  });
  
  /**
   * Test with malformed column data
   */
  test('should handle inconsistent data structures', () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Dataset with inconsistent structures
    const inconsistentData = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', location: 'New York' }, // Missing age, has location
      { id: 3, name: 'Charlie', age: '25' },  // Age as string instead of number
      { id: 4, name: { first: 'David', last: 'Smith' }, age: 35 }, // Name as object
      { id: 5, skills: ['programming', 'design'] } // Missing name and age, has skills
    ];
    
    // Include all possible columns
    const columns = ['id', 'name', 'age', 'location', 'skills'];
    
    // Run analysis
    const analysisResult = result.current.analyzeFallback(inconsistentData, columns);
    
    // Should have analyzed all columns
    expect(analysisResult.columnAnalysis).toHaveLength(columns.length);
    
    // Check that it doesn't error on complex/inconsistent types
    const nameColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'name'
    );
    expect(nameColumn).toBeDefined();
    
    const ageColumn = analysisResult.columnAnalysis.find(
      (col: any) => col.columnName === 'age'
    );
    expect(ageColumn).toBeDefined();
  });
  
  /**
   * Test resilience to errors in detection functions
   */
  test('should be resilient to internal errors', async () => {
    // Create a hook with a spy that can monitor internal function calls
    const { result } = renderHook(() => {
      const hook = useDatasetAnalysis();
      // Create a spy on an internal function that might throw errors
      const originalDetectColumnRole = (hook as any).detectColumnRole;
      (hook as any).detectColumnRole = jest.fn().mockImplementation((columnName, data) => {
        if (columnName === 'will_error') {
          throw new Error('Simulated error in detectColumnRole');
        }
        return originalDetectColumnRole(columnName, data);
      });
      return hook;
    });
    
    // Dataset with a column that will trigger an error
    const problematicData = [
      { normal_column: 'Value 1', will_error: 'This will cause an error' }
    ];
    
    const columns = ['normal_column', 'will_error'];
    
    // Run analysis - should not throw despite internal error
    const analysisResult = await result.current.analyzeWithAI(problematicData, columns);
    
    // Should still produce a result
    expect(analysisResult).toBeDefined();
    expect(analysisResult).toHaveProperty('success', true);
    
    // Should include all columns in analysis
    expect(analysisResult.columnAnalysis).toHaveLength(columns.length);
  });
  
  /**
   * Test API failure modes
   */
  test('should handle API failures with specific error codes', async () => {
    const { result } = renderHook(() => useDatasetAnalysis());
    
    // Test data
    const testData = [{ input: 'test', output: 'test response' }];
    const testColumns = ['input', 'output'];
    
    // Different API error scenarios
    const errorScenarios = [
      { status: 400, statusText: 'Bad Request' },
      { status: 401, statusText: 'Unauthorized' },
      { status: 429, statusText: 'Too Many Requests' },
      { status: 500, statusText: 'Internal Server Error' }
    ];
    
    for (const scenario of errorScenarios) {
      // Mock fetch to return specific error
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: scenario.status,
          statusText: scenario.statusText
        })
      );
      
      // Attempt analysis
      const analysisResult = await result.current.analyzeWithAI(testData, testColumns);
      
      // Should fall back to heuristic analysis
      expect(analysisResult).toHaveProperty('success', true);
      expect(analysisResult).toHaveProperty('columnAnalysis');
      expect(analysisResult).toHaveProperty('suggestedMetrics');
    }
  });
});
