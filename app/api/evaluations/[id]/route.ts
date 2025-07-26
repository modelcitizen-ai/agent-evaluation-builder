// Create API route for a specific evaluation

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { 
  getEvaluation as dbGetEvaluation,
  updateEvaluation as dbUpdateEvaluation,
  deleteEvaluation as dbDeleteEvaluation,
} from '@/lib/db/db-adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluation = await dbGetEvaluation(parseInt(params.id));
    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: evaluation });
  } catch (error) {
    console.error(`Error fetching evaluation ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const updatedEvaluation = await dbUpdateEvaluation(parseInt(params.id), data);
    return NextResponse.json({ success: true, data: updatedEvaluation });
  } catch (error) {
    console.error(`Error updating evaluation ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update evaluation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbDeleteEvaluation(parseInt(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting evaluation ${params.id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete evaluation' },
      { status: 500 }
    );
  }
}
