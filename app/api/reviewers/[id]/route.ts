// API routes for individual reviewer operations
import { NextRequest, NextResponse } from 'next/server';
import { 
  updateReviewer as dbUpdateReviewer,
  removeReviewer as dbRemoveReviewer
} from '@/lib/db/db-adapter';

// PUT /api/reviewers/[id] - Update a reviewer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewerId } = await params;
    const updates = await request.json();
    
    console.log(`API: Updating reviewer ${reviewerId}`);
    
    const updatedReviewer = await dbUpdateReviewer(reviewerId, updates);
    console.log('API: Successfully updated reviewer');
    
    return NextResponse.json({ success: true, data: updatedReviewer });
  } catch (error) {
    console.error('Error updating reviewer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update reviewer' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviewers/[id] - Delete a reviewer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewerId } = await params;
    
    console.log(`API: Deleting reviewer ${reviewerId}`);
    
    await dbRemoveReviewer(reviewerId);
    console.log('API: Successfully deleted reviewer');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reviewer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete reviewer' },
      { status: 500 }
    );
  }
}
