import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const USE_POSTGRESQL = process.env.USE_POSTGRESQL === 'true';
    const databaseMode = USE_POSTGRESQL ? 'PostgreSQL' : 'localStorage';
    
    console.log('Health check - Environment variables:');
    console.log('USE_POSTGRESQL:', process.env.USE_POSTGRESQL);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('Database mode:', databaseMode);
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      databaseMode,
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
