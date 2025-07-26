// API routes to handle database operations for evaluations

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { 
  getEvaluations as dbGetEvaluations,
  createEvaluation as dbCreateEvaluation,
} from '@/lib/db/db-adapter';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching all evaluations');
    const evaluations = await dbGetEvaluations();
    console.log(`API: Found ${evaluations.length} evaluations`);
    
    // Convert Sequelize models to plain objects
    const plainEvaluations = evaluations.map(evaluation => {
      // If it's a Sequelize model with toJSON method, use it
      if (evaluation && typeof evaluation.toJSON === 'function') {
        return evaluation.toJSON();
      }
      // Otherwise, return as is
      return evaluation;
    });
    
    return NextResponse.json({ success: true, data: plainEvaluations });
  } catch (error) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('API: Creating new evaluation', data.name);
    
    const newEvaluation = await dbCreateEvaluation(data);
    
    if (!newEvaluation) {
      throw new Error('Failed to create evaluation');
    }
    
    console.log('API: Successfully created evaluation');
    
    // Convert to plain object if it's a Sequelize model
    const plainEvaluation = newEvaluation && typeof newEvaluation.toJSON === 'function' 
      ? newEvaluation.toJSON() 
      : newEvaluation;
      
    return NextResponse.json({ success: true, data: plainEvaluation });
  } catch (error) {
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create evaluation: ${error.message}` },
      { status: 500 }
    );
  }
}