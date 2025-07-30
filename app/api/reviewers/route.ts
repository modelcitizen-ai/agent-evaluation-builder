// API routes for reviewer operations
import { NextRequest, NextResponse } from 'next/server';
import { 
  getReviewers as dbGetReviewers,
  addReviewer as dbAddReviewer,
  updateReviewer as dbUpdateReviewer,
  removeReviewer as dbRemoveReviewer
} from '@/lib/db/db-adapter';

// GET /api/reviewers - Get all reviewers or reviewers for a specific evaluation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('evaluationId');
    
    console.log('API: Fetching reviewers', evaluationId ? `for evaluation ${evaluationId}` : '(all)');
    
    const reviewers = await dbGetReviewers();
    
    // Filter by evaluation ID if provided
    let filteredReviewers = reviewers;
    if (evaluationId) {
      filteredReviewers = reviewers.filter((reviewer: any) => 
        reviewer.evaluationId && reviewer.evaluationId.toString() === evaluationId
      );
    }
    
    console.log(`API: Found ${filteredReviewers.length} reviewers`);
    
    return NextResponse.json({ success: true, data: filteredReviewers });
  } catch (error) {
    console.error('Error fetching reviewers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviewers' },
      { status: 500 }
    );
  }
}

// POST /api/reviewers - Add a new reviewer
export async function POST(request: NextRequest) {
  try {
    const reviewerData = await request.json();
    console.log('API: Creating new reviewer', reviewerData.name);
    
    // Ensure required fields
    if (!reviewerData.name || !reviewerData.evaluationId) {
      return NextResponse.json(
        { success: false, error: 'Name and evaluationId are required' },
        { status: 400 }
      );
    }
    
    // Generate unique ID if not provided
    if (!reviewerData.id) {
      reviewerData.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
    
    // Set default values
    const reviewer = {
      ...reviewerData,
      status: reviewerData.status || 'pending',
      completed: reviewerData.completed || 0,
      total: reviewerData.total || 0,
      createdAt: new Date().toISOString(),
    };
    
    const newReviewer = await dbAddReviewer(reviewer);
    console.log('API: Successfully created reviewer');
    
    return NextResponse.json({ success: true, data: newReviewer });
  } catch (error) {
    console.error('Error creating reviewer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create reviewer' },
      { status: 500 }
    );
  }
}

// PUT /api/reviewers/[id] - Update a reviewer (handled in separate file)
// DELETE /api/reviewers/[id] - Delete a reviewer (handled in separate file)
