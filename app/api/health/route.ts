import { NextResponse } from 'next/server';
import { getEvaluations } from '@/lib/db/db-adapter';

export async function GET() {
  try {
    const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true';
    const databaseMode = USE_POSTGRESQL ? 'PostgreSQL' : 'localStorage';
    
    console.log('Health check - Environment variables:');
    console.log('USE_POSTGRESQL:', process.env.USE_POSTGRESQL);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('Database mode:', databaseMode);
    
    // Test database connectivity by attempting to read evaluations
    let databaseConnectivity = 'unknown';
    let evaluationCount = 0;
    try {
      const evaluations = await getEvaluations();
      databaseConnectivity = 'connected';
      evaluationCount = evaluations.length;
      console.log(`Database connectivity test successful: ${evaluationCount} evaluations found`);
    } catch (dbError) {
      console.error('Database connectivity test failed:', dbError);
      databaseConnectivity = 'failed';
    }
    
    return NextResponse.json({
      status: databaseConnectivity === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      databaseMode,
      databaseConnectivity,
      evaluationCount,
      environment: {
        USE_POSTGRESQL: process.env.USE_POSTGRESQL,
        DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'not configured',
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
