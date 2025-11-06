import { NextResponse } from 'next/server';
import { getEvaluations } from '@/lib/db/db-adapter';

/**
 * Database warm-up endpoint
 * This endpoint performs essential database operations to ensure
 * the connection pool and schemas are properly initialized
 */
export async function POST() {
  try {
    const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true';
    const databaseMode = USE_POSTGRESQL ? 'PostgreSQL' : 'localStorage';
    
    console.log('Database warm-up starting for mode:', databaseMode);
    
    // Perform database warm-up operations
    const startTime = Date.now();
    
    // 1. Test basic read operation
    const evaluations = await getEvaluations();
    console.log(`Warm-up: Retrieved ${evaluations.length} evaluations`);
    
    // 2. If PostgreSQL, perform additional connection pool warming
    if (USE_POSTGRESQL) {
      // Perform a few more queries to warm up the connection pool
      await getEvaluations(); // Second call
      await getEvaluations(); // Third call
      console.log('Warm-up: PostgreSQL connection pool warmed');
    }
    
    const duration = Date.now() - startTime;
    console.log(`Database warm-up completed in ${duration}ms`);
    
    return NextResponse.json({
      success: true,
      message: 'Database warm-up completed successfully',
      databaseMode,
      evaluationCount: evaluations.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database warm-up failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database warm-up endpoint. Use POST to trigger warm-up.',
    usage: 'POST /api/warmup'
  });
}
