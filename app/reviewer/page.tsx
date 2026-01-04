"use client"

import { useRouter } from "next/navigation"
import { useState, useLayoutEffect, useEffect } from "react"
import { ClockIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import { getEvaluations, getReviewers, getResultsDataset } from "@/lib/client-db"

interface Evaluation {
  id: number
  name: string
  status: string
  totalItems: number
  createdAt: string
  criteria: any[]
}

export default function ReviewerPage() {
  const router = useRouter()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [completedEvaluations, setCompletedEvaluations] = useState<number[]>([])
  const [startedEvaluations, setStartedEvaluations] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewerFirstName, setReviewerFirstName] = useState<string>("My")

  useLayoutEffect(() => {
    const initializeReviewerData = async () => {
      try {
        // Load evaluations from database
        const storedEvaluations = await getEvaluations()

        // Load assigned reviewers/participants
        const evaluationReviewers = await getReviewers()
        
        // Get current reviewer info (in a real app, this would come from auth/URL params)
        // For now, we'll use URL params or default to the first available reviewer
        const urlParams = new URLSearchParams(window.location.search)
        const participantId = urlParams.get('participant')
        
        let currentReviewerId = participantId
        
        // If no participant ID in URL, check if there are any assigned reviewers and use the first one
        // This allows reviewers to access their assignments even without the direct link
        if (!currentReviewerId && evaluationReviewers.length > 0) {
          currentReviewerId = evaluationReviewers[0].id
        }
        
        // Fallback for testing - if no reviewers exist, create a default one
        if (!currentReviewerId) {
          currentReviewerId = "reviewer-1"
        }
        
        // Get current reviewer information and extract first name
        const currentReviewer = evaluationReviewers.find((reviewer: any) => reviewer.id === currentReviewerId)
        let firstName = "My" // Default fallback
        
        if (currentReviewer && currentReviewer.name) {
          // Extract first name from full name (split by space and take first part)
          const nameParts = currentReviewer.name.trim().split(/\s+/)
          firstName = nameParts[0]
          
          // Clean up any emojis or special characters from the beginning if needed
          firstName = firstName.replace(/^[^\w]+/, '') || "My"
        }
        
        setReviewerFirstName(firstName)
        
        // Filter evaluations to only show those assigned to the current reviewer
        const assignedEvaluationIds = evaluationReviewers
          .filter((reviewer: any) => 
            reviewer.id === currentReviewerId || 
            reviewer.name === "Anonymous Reviewer" ||
            (!participantId && evaluationReviewers.length > 0) // Show all if no specific participant and assignments exist
          )
          .map((reviewer: any) => reviewer.evaluationId)

        // Filter stored evaluations to only include assigned ones
        const assignedEvaluations = storedEvaluations.filter((evaluation: Evaluation) => 
          assignedEvaluationIds.includes(evaluation.id.toString()) || 
          assignedEvaluationIds.includes(evaluation.id)
        )

        // Create a default sample entry if no evaluations exist and no assignments exist
        let evaluationsToUse = assignedEvaluations;
        
        // If no assigned evaluations but there are evaluations with participants, show them for testing
        if (evaluationsToUse.length === 0 && evaluationReviewers.length > 0) {
          // Show evaluations that have any assignments for testing purposes
          const evaluationsWithAssignments = storedEvaluations.filter((evaluation: Evaluation) => 
            evaluationReviewers.some((reviewer: any) => 
              reviewer.evaluationId === evaluation.id.toString() || 
              reviewer.evaluationId === evaluation.id
            )
          )
          evaluationsToUse = evaluationsWithAssignments
        }
        
        // For development/testing: if no assignments but evaluations exist, show all evaluations
        if (evaluationsToUse.length === 0 && storedEvaluations.length > 0) {
          evaluationsToUse = storedEvaluations
        }
        
        // Only create sample evaluation if absolutely no evaluations exist
        if (evaluationsToUse.length === 0 && storedEvaluations.length === 0) {
          // Create a sample evaluation for testing (only if no real evaluations exist)
          const sampleEvaluation = {
            id: 9876543210,
            name: "Product Feature Comparison",
            status: "draft",
            totalItems: 5,
            createdAt: new Date().toISOString(),
            criteria: [
              { id: 1, name: "Usability", description: "How easy is the feature to use?" },
              { id: 2, name: "Value", description: "Does the feature provide good value?" },
              { id: 3, name: "Innovation", description: "How innovative is this feature?" },
              { id: 4, name: "Reliability", description: "How reliable is the feature?" },
              { id: 5, name: "Performance", description: "How well does the feature perform?" }
            ]
          };
          evaluationsToUse = [sampleEvaluation];
        }

        // Convert assigned evaluations to active status for reviewers
        const activeEvaluations = evaluationsToUse.map((evaluation: Evaluation) => ({
          ...evaluation,
          status: "active", // Assigned evaluations are active for reviewers
        }))

        setEvaluations(activeEvaluations)
        setIsLoading(false)
        
        // Determine completed evaluations for this specific reviewer based on their individual status
        const currentReviewerCompletions = assignedEvaluationIds.filter((evaluationId: string) => {
          const reviewerRecord = evaluationReviewers.find((reviewer: any) => 
            reviewer.id === currentReviewerId && 
            (reviewer.evaluationId === evaluationId || reviewer.evaluationId === Number(evaluationId))
          )
          
          if (reviewerRecord) {
            const completedByStatus = reviewerRecord.status === "completed"
            const completedByCount = reviewerRecord.completed === reviewerRecord.total && reviewerRecord.total > 0
            const isComplete = completedByStatus || completedByCount
            
            console.log(`[ReviewerDashboard] Initial load - Evaluating completion for evaluation ${evaluationId}:`)
            console.log(`  - Reviewer: ${reviewerRecord.name} (ID: ${reviewerRecord.id})`)
            console.log(`  - Status: ${reviewerRecord.status} (completedByStatus: ${completedByStatus})`)
            console.log(`  - Progress: ${reviewerRecord.completed}/${reviewerRecord.total} (completedByCount: ${completedByCount})`)
            console.log(`  - Final isComplete: ${isComplete}`)
            
            // Reviewer is completed if their status is "completed" OR they've completed all items
            return isComplete
          }
          
          console.log(`[ReviewerDashboard] Initial load - No reviewer record found for evaluation ${evaluationId} and reviewer ${currentReviewerId}`)
          return false
        }).map((evaluationId: string) => Number(evaluationId))
        
        console.log(`[ReviewerDashboard] Initial completed evaluations:`, currentReviewerCompletions)
        setCompletedEvaluations(currentReviewerCompletions)
      } catch (error) {
        console.error("Error loading reviewer data:", error)
        setIsLoading(false)
      }
    }

    initializeReviewerData()
  }, [])

  // Function to refresh completion status (similar to progress dashboard)
  const refreshCompletionStatus = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const participantId = urlParams.get('participant')
      const evaluationReviewers = await getReviewers()
      
      let currentReviewerId = participantId
      if (!currentReviewerId && evaluationReviewers.length > 0) {
        currentReviewerId = evaluationReviewers[0].id
      }
      if (!currentReviewerId) {
        currentReviewerId = "reviewer-1"
      }

      // Get assigned evaluations for this reviewer
      const assignedEvaluationIds = evaluationReviewers
        .filter((reviewer: any) => reviewer.id === currentReviewerId)
        .map((reviewer: any) => reviewer.evaluationId.toString())

      // Check which evaluations have been started (have any responses in PostgreSQL)
      const startedEvalIds: number[] = []
      for (const evaluationId of assignedEvaluationIds) {
        try {
          const resultsDataset = await getResultsDataset(Number(evaluationId))
          if (resultsDataset && Array.isArray(resultsDataset.results)) {
            const reviewerHasResponses = resultsDataset.results.some(
              (result: any) => result.reviewerId === currentReviewerId
            )
            if (reviewerHasResponses) {
              startedEvalIds.push(Number(evaluationId))
            }
          }
        } catch (error) {
          console.error(`[ReviewerDashboard] Error checking results for evaluation ${evaluationId}:`, error)
        }
      }
      
      setStartedEvaluations(startedEvalIds)
      console.log('[ReviewerDashboard] Started evaluations:', startedEvalIds)

      // Determine completed evaluations for this specific reviewer
      const currentReviewerCompletions = assignedEvaluationIds.filter((evaluationId: string) => {
        const reviewerRecord = evaluationReviewers.find((reviewer: any) => 
          reviewer.id === currentReviewerId && 
          (reviewer.evaluationId === evaluationId || reviewer.evaluationId === Number(evaluationId))
        )
        
        if (reviewerRecord) {
          const completedByStatus = reviewerRecord.status === "completed"
          const completedByCount = reviewerRecord.completed === reviewerRecord.total && reviewerRecord.total > 0
          const isComplete = completedByStatus || completedByCount
          
          console.log(`[ReviewerDashboard] Evaluating completion for evaluation ${evaluationId}:`)
          console.log(`  - Reviewer: ${reviewerRecord.name} (ID: ${reviewerRecord.id})`)
          console.log(`  - Status: ${reviewerRecord.status} (completedByStatus: ${completedByStatus})`)
          console.log(`  - Progress: ${reviewerRecord.completed}/${reviewerRecord.total} (completedByCount: ${completedByCount})`)
          console.log(`  - Final isComplete: ${isComplete}`)
          
          // Reviewer is completed if their status is "completed" OR they've completed all items
          return isComplete
        }
        
        console.log(`[ReviewerDashboard] No reviewer record found for evaluation ${evaluationId} and reviewer ${currentReviewerId}`)
        return false
      }).map((evaluationId: string) => Number(evaluationId))
      
      setCompletedEvaluations(currentReviewerCompletions)
      console.log('[ReviewerDashboard] Refreshed completion status:', currentReviewerCompletions)
      console.log('[ReviewerDashboard] All reviewer records for current reviewer:', evaluationReviewers.filter((r: any) => r.id === currentReviewerId))
    } catch (error) {
      console.error('[ReviewerDashboard] Error refreshing completion status:', error)
    }
  }

  // Add event listeners for real-time updates
  useEffect(() => {
    // Initial refresh to ensure we have the latest completion status
    console.log('[ReviewerDashboard] useEffect triggered - doing initial completion refresh')
    refreshCompletionStatus()
    
    // Listen for custom events when reviewer completes evaluations
    const handleProgressUpdate = () => {
      console.log('[ReviewerDashboard] Progress update event received - refreshing status')
      refreshCompletionStatus()
    }

    // Listen for visibility changes to update when user returns to dashboard
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log('[ReviewerDashboard] Page became visible - refreshing status')
        refreshCompletionStatus()
      }
    }

    window.addEventListener("reviewerProgressUpdated", handleProgressUpdate)
    window.addEventListener("evaluationCompleted", handleProgressUpdate)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("reviewerProgressUpdated", handleProgressUpdate)
      window.removeEventListener("evaluationCompleted", handleProgressUpdate)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const handleStartTask = (evaluationId: number) => {
    // Get the current participant ID from URL or use the current reviewer ID
    const urlParams = new URLSearchParams(window.location.search)
    const participantId = urlParams.get('participant')
    
    // If we have a participant ID, preserve it in the task URL
    // If not, add a 'from=reviewer' parameter to help with exit navigation
    if (participantId) {
      router.push(`/reviewer/task/${evaluationId}?participant=${participantId}`)
    } else {
      router.push(`/reviewer/task/${evaluationId}?from=reviewer`)
    }
  }

  // Helper function to check if an evaluation has been started
  const hasEvaluationBeenStarted = (evaluationId: number) => {
    return startedEvaluations.includes(evaluationId)
  }

  const availableTasks = evaluations // All evaluations are available (both active and completed)
  const activeTasks = evaluations.filter((e) => !completedEvaluations.includes(e.id)) // Only non-completed are active
  const completedTasks = evaluations.filter((e) => completedEvaluations.includes(e.id))

  // Add a loading state to prevent flicker
  if (isLoading) {
    return (
      <PageLayout title={`${reviewerFirstName}'s Evaluations`}>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title={`${reviewerFirstName}'s Evaluations`}>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {availableTasks.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {availableTasks.length} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {activeTasks.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {activeTasks.length} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {completedTasks.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {completedTasks.length} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Tasks */}
      {evaluations.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">All Evaluations</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {evaluations.map((task) => {
              const isCompleted = completedEvaluations.includes(task.id)
              console.log(`[ReviewerDashboard] Task ${task.name} (ID: ${task.id}): isCompleted = ${isCompleted}, completedEvaluations = [${completedEvaluations.join(', ')}]`)
              return (
                <li key={task.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                          <p className="text-sm text-gray-500">
                            {task.totalItems || 0} Questions • Due: {new Date(task.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {!isCompleted && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${
                              hasEvaluationBeenStarted(task.id) 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-blue-500 hover:bg-blue-600'
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                          >
                            {hasEvaluationBeenStarted(task.id) ? 'Resume' : 'Start Review'}
                          </button>
                        )}
                        {isCompleted && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-8 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No evaluations available</h3>
            <p className="text-gray-500">Check back later for new evaluation tasks.</p>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
