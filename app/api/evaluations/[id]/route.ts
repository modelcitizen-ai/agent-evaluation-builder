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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evaluation = await dbGetEvaluation(parseInt(id));
    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'Evaluation not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: evaluation });
  } catch (error) {
    const { id } = await params;
    console.error(`Error fetching evaluation ${id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const updatedEvaluation = await dbUpdateEvaluation(parseInt(id), data);
    return NextResponse.json({ success: true, data: updatedEvaluation });
  } catch (error) {
    const { id } = await params;
    console.error(`Error updating evaluation ${id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to update evaluation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbDeleteEvaluation(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    console.error(`Error deleting evaluation ${id}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete evaluation' },
      { status: 500 }
    );
  }
}
