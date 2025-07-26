/**
 * Manual Test Script for useDatasetAnalysis Hook
 * 
 * This script provides a simple way to test the hook's functionality
 * without requiring Jest or other testing libraries. It's useful for:
 * 
 * 1. Quick validation during development
 * 2. Testing the fallback analysis mechanism
 * 3. Verifying output formats match expectations
 * 4. Debugging specific dataset handling edge cases
 * 
 * Run this with: `ts-node lib/test-dataset-analysis.ts`
 */
import { useDatasetAnalysis } from '../hooks/use-dataset-analysis';

/**
 * Simple test runner
 */
async function runTests() {
  console.log('===== Testing useDatasetAnalysis hook =====');
  
  // Create test data
  const testData = [
    { 
      input_prompt: 'What is machine learning?', 
      response: 'Machine learning is a branch of AI focused on building systems that learn from data.',
      category: 'Education'
    },
    { 
      input_prompt: 'Explain quantum computing', 
      response: 'Quantum computing uses quantum mechanics to perform computations.',
      category: 'Education'
    },
    { 
      input_prompt: 'How to bake bread?', 
      response: 'Mix flour, water, yeast, and salt. Knead, let rise, then bake.',
      category: 'Cooking'
    }
  ];
  
  const testColumns = ['input_prompt', 'response', 'category'];
  
  // Mock the hook execution
  const { analyzeWithAI, analyzeFallback, isAnalyzing } = useDatasetAnalysis();
  
  console.log('Initial isAnalyzing state:', isAnalyzing);
  
  console.log('\n----- Testing fallback analysis -----');
  try {
    // Test fallback analysis
    const fallbackResult = analyzeFallback(testData, testColumns);
    console.log('Fallback analysis successful!');
    console.log('Evaluation name:', fallbackResult.evaluationName);
    console.log('Column analysis count:', fallbackResult.columnAnalysis.length);
    console.log('Metrics count:', fallbackResult.suggestedMetrics.length);
    
    // Verify structure
    if (!fallbackResult.evaluationName) {
      throw new Error('Missing evaluationName in fallback result');
    }
    
    if (!fallbackResult.columnAnalysis || !Array.isArray(fallbackResult.columnAnalysis)) {
      throw new Error('Missing or invalid columnAnalysis in fallback result');
    }
    
    if (!fallbackResult.suggestedMetrics || !Array.isArray(fallbackResult.suggestedMetrics)) {
      throw new Error('Missing or invalid suggestedMetrics in fallback result');
    }
    
    console.log('✅ Fallback analysis test passed!');
  } catch (error) {
    console.error('❌ Fallback analysis test failed:', error);
  }
  
  console.log('\n----- Testing fallback with video content -----');
  try {
    // Test with video content
    const videoData = [
      { 
        video_url: 'https://youtube.com/watch?v=12345', 
        description: 'A video about testing'
      }
    ];
    const videoColumns = ['video_url', 'description'];
    
    const videoResult = analyzeFallback(videoData, videoColumns);
    console.log('Video fallback analysis successful!');
    console.log('Evaluation name:', videoResult.evaluationName);
    
    // Check if it detected video content
    if (!videoResult.evaluationName.toLowerCase().includes('video')) {
      console.warn('⚠️ Video content not detected in evaluation name');
    } else {
      console.log('✅ Video content correctly detected!');
    }
    
    // Check for video-specific metrics
    const hasVideoMetric = videoResult.suggestedMetrics.some(
      (metric: any) => metric.name.toLowerCase().includes('video')
    );
    
    if (!hasVideoMetric) {
      console.warn('⚠️ No video-specific metrics found');
    } else {
      console.log('✅ Video-specific metrics correctly included!');
    }
  } catch (error) {
    console.error('❌ Video content test failed:', error);
  }
  
  console.log('\n----- Testing error handling -----');
  try {
    // Test with invalid inputs
    const emptyResult = analyzeFallback([], []);
    console.log('Empty data handling successful!');
    
    const nullResult = analyzeFallback(null as any, null as any);
    console.log('Null data handling successful!');
    
    console.log('✅ Error handling tests passed!');
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
  }
  
  console.log('\n===== All manual tests completed =====');
}

// Run the tests
runTests().catch(console.error);
