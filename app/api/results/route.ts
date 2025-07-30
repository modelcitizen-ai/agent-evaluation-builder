import { NextRequest, NextResponse } from 'next/server'
import { getResultsDataset, addResultToDataset, initializeEmptyResultsDataset } from '@/lib/db/db-adapter'

// GET /api/results?evaluationId=123 - Get results dataset for an evaluation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const evaluationId = searchParams.get('evaluationId')

    if (!evaluationId) {
      return NextResponse.json(
        { error: 'evaluationId parameter is required' }, 
        { status: 400 }
      )
    }

    const evaluationIdNum = parseInt(evaluationId, 10)
    if (isNaN(evaluationIdNum)) {
      return NextResponse.json(
        { error: 'evaluationId must be a valid number' }, 
        { status: 400 }
      )
    }

    const resultsDataset = await getResultsDataset(evaluationIdNum)
    
    if (!resultsDataset) {
      return NextResponse.json(
        { error: 'Results dataset not found' }, 
        { status: 404 }
      )
    }

    return NextResponse.json(resultsDataset)
  } catch (error) {
    console.error('[API] Error getting results dataset:', error)
    return NextResponse.json(
      { error: 'Failed to get results dataset' }, 
      { status: 500 }
    )
  }
}

// POST /api/results - Add a result to a dataset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { evaluationId, result } = body

    if (!evaluationId || !result) {
      return NextResponse.json(
        { error: 'evaluationId and result are required' }, 
        { status: 400 }
      )
    }

    const evaluationIdNum = parseInt(evaluationId, 10)
    if (isNaN(evaluationIdNum)) {
      return NextResponse.json(
        { error: 'evaluationId must be a valid number' }, 
        { status: 400 }
      )
    }

    // Add the result to the dataset
    await addResultToDataset(evaluationIdNum, result)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error adding result to dataset:', error)
    return NextResponse.json(
      { error: 'Failed to add result to dataset' }, 
      { status: 500 }
    )
  }
}

// PUT /api/results - Initialize empty results dataset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { evaluationId, evaluationName, originalData, criteria } = body

    if (!evaluationId || !evaluationName || !originalData || !criteria) {
      return NextResponse.json(
        { error: 'evaluationId, evaluationName, originalData, and criteria are required' }, 
        { status: 400 }
      )
    }

    const evaluationIdNum = parseInt(evaluationId, 10)
    if (isNaN(evaluationIdNum)) {
      return NextResponse.json(
        { error: 'evaluationId must be a valid number' }, 
        { status: 400 }
      )
    }

    // Initialize empty results dataset
    const dataset = await initializeEmptyResultsDataset(
      evaluationIdNum, 
      evaluationName, 
      originalData, 
      criteria
    )

    return NextResponse.json(dataset)
  } catch (error) {
    console.error('[API] Error initializing results dataset:', error)
    return NextResponse.json(
      { error: 'Failed to initialize results dataset' }, 
      { status: 500 }
    )
  }
}
