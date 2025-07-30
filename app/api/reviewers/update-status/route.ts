import { NextRequest, NextResponse } from 'next/server'
import { getReviewers, updateReviewer, getResultsDataset } from '@/lib/db/db-adapter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { evaluationId } = body

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'evaluationId is required' }, 
        { status: 400 }
      )
    }

    console.log(`[UpdateReviewerStatus] Updating reviewer statuses for evaluation ${evaluationId}`)

    // Get all reviewers for this evaluation  
    const reviewers = await getReviewers(evaluationId)
    console.log(`[UpdateReviewerStatus] Found ${reviewers.length} reviewers`)

    // Get results dataset to check actual completion
    const resultsDataset = await getResultsDataset(evaluationId)
    console.log(`[UpdateReviewerStatus] Found ${resultsDataset?.results?.length || 0} results`)

    let updatedCount = 0

    // Check each reviewer's completion status
    for (const reviewer of reviewers) {
      console.log(`[UpdateReviewerStatus] Checking reviewer ${reviewer.name} (${reviewer.id})`)
      console.log(`  Current status: ${reviewer.status}, completed: ${reviewer.completed}/${reviewer.total}`)

      // Calculate actual completed count from results dataset
      let actualCompleted = reviewer.completed || 0

      if (resultsDataset && resultsDataset.results) {
        const reviewerResults = resultsDataset.results.filter((result: any) => 
          result.reviewerId === reviewer.id || result.reviewerId === String(reviewer.id)
        )
        
        const uniqueItemIds = new Set()
        reviewerResults.forEach((result: any) => {
          uniqueItemIds.add(result.itemId)
        })
        
        actualCompleted = uniqueItemIds.size
        console.log(`  Results dataset shows: ${actualCompleted} unique items completed`)
      }

      // Check if reviewer should be marked as completed
      const shouldBeCompleted = actualCompleted >= reviewer.total && reviewer.total > 0
      const currentlyCompleted = reviewer.status === "completed"

      console.log(`  Should be completed: ${shouldBeCompleted}, currently completed: ${currentlyCompleted}`)

      if (shouldBeCompleted && !currentlyCompleted) {
        // Update the reviewer to completed status
        await updateReviewer(reviewer.id, { 
          status: "completed",
          completed: actualCompleted
        })
        console.log(`  ✅ Updated reviewer ${reviewer.name} to completed status`)
        updatedCount++
      } else if (reviewer.completed !== actualCompleted) {
        // Update just the completed count
        await updateReviewer(reviewer.id, { 
          completed: actualCompleted
        })
        console.log(`  📊 Updated reviewer ${reviewer.name} completed count to ${actualCompleted}`)
        updatedCount++
      } else {
        console.log(`  ⚪ No update needed for reviewer ${reviewer.name}`)
      }
    }

    console.log(`[UpdateReviewerStatus] Updated ${updatedCount} reviewers`)

    return NextResponse.json({ 
      success: true, 
      updatedCount,
      reviewers: reviewers.length
    })
  } catch (error) {
    console.error('[UpdateReviewerStatus] Error updating reviewer statuses:', error)
    return NextResponse.json(
      { error: 'Failed to update reviewer statuses' }, 
      { status: 500 }
    )
  }
}
