// This is a debugging page that helps diagnose database issues
// It will show information about the data-scientist page functionality

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getEvaluations, getEvaluation } from '@/lib/db/db-adapter';

export async function GET(request: NextRequest) {
  try {
    // Get database status
    const evaluations = await getEvaluations();
    
    // Return database status
    return NextResponse.json({
      success: true,
      data: {
        evaluationsCount: evaluations.length,
        evaluations: evaluations.map(e => ({
          id: e.id,
          name: e.name,
          status: e.status,
        })),
        serverTime: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check database status' },
      { status: 500 }
    );
  }
}
