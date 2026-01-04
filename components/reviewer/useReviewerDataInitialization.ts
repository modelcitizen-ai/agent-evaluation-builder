/**
 * Custom hook for handling Reviewer Task Page data initialization
 * Extracts data loading logic from the main ReviewTaskPage component
 * 
 * This hook handles:
 * - Loading evaluation data from API by task ID
 * - Recovery of saved responses with participant-specific keys
 * - Progress restoration (furthest item reached and completion status)
 * - Reviewer identification from URL parameters or fallback logic
 * - Completion state detection for current reviewer
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getEvaluation, getReviewers, getResultsDataset } from '@/lib/client-db'
import type { EvaluationResult } from '@/lib/results-dataset'

interface Evaluation {
  id: number
  name: string
  instructions: string
  criteria: any[]
  columnRoles: any[]
  data: any[]
  totalItems: number
  assignedReviewers?: { id: string; name: string }[]
}

interface ReviewerInfo {
  id: string
  name: string
}

interface UseReviewerDataInitializationProps {
  // No props needed - hook manages its own dependencies
}

interface UseReviewerDataInitializationReturn {
  // Core data
  evaluation: Evaluation | null
  currentReviewer: ReviewerInfo
  
  // Response and progress state
  allResponses: Record<number, Record<string, string>>
  furthestItemReached: number
  isReviewComplete: boolean
  
  // Loading state
  isLoading: boolean
  
  // Setters for external updates
  setAllResponses: React.Dispatch<React.SetStateAction<Record<number, Record<string, string>>>>
  setFurthestItemReached: React.Dispatch<React.SetStateAction<number>>
  setIsReviewComplete: React.Dispatch<React.SetStateAction<boolean>>
  
  // Utility functions
  getStorageKey: () => string
  getProgressKey: () => string
}

export function useReviewerDataInitialization(): UseReviewerDataInitializationReturn {
  const params = useParams()
  const searchParams = useSearchParams()
  const taskId = params.id
  const participantId = searchParams.get('participant')
  const isPreview = searchParams.get('from') === 'data-scientist'

  // Memoize storage keys to prevent infinite re-renders
  const storageKey = useMemo(() => {
    if (isPreview) {
      return `evaluation_${taskId}_preview_responses`
    }
    return participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_responses`
      : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
  }, [taskId, participantId, isPreview])

  const progressKey = useMemo(() => {
    if (isPreview) {
      return `evaluation_${taskId}_preview_progress`
    }
    return participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_progress`
      : `evaluation_${taskId}_progress` // Fallback for backwards compatibility
  }, [taskId, participantId, isPreview])

  // Core state
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [currentReviewer, setCurrentReviewer] = useState<ReviewerInfo>({
    id: "reviewer-1",
    name: "Anonymous Reviewer"
  })
  
  // Response and progress state
  const [allResponses, setAllResponses] = useState<Record<number, Record<string, string>>>({})
  const [furthestItemReached, setFurthestItemReached] = useState(1)
  const [isReviewComplete, setIsReviewComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Utility functions for storage keys (now return memoized values)
  const getStorageKey = () => storageKey
  const getProgressKey = () => progressKey

  // Helper function to identify current reviewer (memoized to prevent recreations)
  const identifyCurrentReviewer = useMemo(() => 
    (evaluationReviewers: any[]): ReviewerInfo => {
      if (isPreview) {
        console.log(`[identifyCurrentReviewer] Preview mode active, using Preview User`)
        return {
          id: "preview-user",
          name: "Preview User"
        }
      }

      if (participantId) {
        // Look for the specific reviewer by ID
        const specificReviewer = evaluationReviewers.find(
          (r: any) => r.id === participantId && 
          (r.evaluationId === taskId || r.evaluationId === Number(taskId))
        )
        
        if (specificReviewer) {
          console.log(`[identifyCurrentReviewer] Found specific reviewer from URL: ${specificReviewer.name} (ID: ${specificReviewer.id}) for evaluation ${taskId}`)
          return {
            id: specificReviewer.id,
            name: specificReviewer.name
          }
        } else {
          console.warn(`[identifyCurrentReviewer] Reviewer ${participantId} not found for evaluation ${taskId}`)
        }
      }
      
      // If no specific reviewer found, fall back to first matching reviewer
      const matchingReviewers = evaluationReviewers.filter(
        (r: any) => r.evaluationId === taskId || r.evaluationId === Number(taskId)
      )
      
      if (matchingReviewers.length > 0) {
        console.log(`[identifyCurrentReviewer] Using first matching reviewer: ${matchingReviewers[0].name} (ID: ${matchingReviewers[0].id}) for evaluation ${taskId}`)
        return {
          id: matchingReviewers[0].id,
          name: matchingReviewers[0].name
        }
      }
      
      // Final fallback
      console.log(`[identifyCurrentReviewer] Using fallback anonymous reviewer for evaluation ${taskId}`)
      return {
        id: "reviewer-1",
        name: "Anonymous Reviewer"
      }
    }, [taskId, participantId, isPreview])

  // Load evaluation data by task ID from API
  useEffect(() => {
    if (!taskId) return

    const loadEvaluation = async () => {
      try {
        const taskIdNum = Number(taskId)
        console.log(`[useReviewerDataInitialization] Loading evaluation ${taskIdNum} via API`)
        
        const foundEvaluation = await getEvaluation(taskIdNum)
        
        if (foundEvaluation) {
          setEvaluation(foundEvaluation)
          console.log(`[useReviewerDataInitialization] Loaded evaluation:`, foundEvaluation.name)
        } else {
          console.error(`[useReviewerDataInitialization] Evaluation with ID ${taskId} not found`)
        }
      } catch (error) {
        console.error(`[useReviewerDataInitialization] Error loading evaluation ${taskId}:`, error)
      }
    }

    loadEvaluation()
  }, [taskId])

  // Load reviewer identification and saved responses
  useEffect(() => {
    if (!taskId) return

    const loadReviewerData = async () => {
      try {
        // Get reviewers for this evaluation from API
        const taskIdNum = Number(taskId)
        console.log(`[useReviewerDataInitialization] Loading reviewers for evaluation ${taskIdNum} via API`)
        
        const evaluationReviewers = await getReviewers(taskIdNum)
        console.log(`[useReviewerDataInitialization] Found ${evaluationReviewers.length} reviewers for evaluation ${taskIdNum}`)
        
        // Identify current reviewer
        const reviewer = identifyCurrentReviewer(evaluationReviewers)
        setCurrentReviewer(reviewer)

        // Load submitted responses from PostgreSQL results dataset
        console.log(`[useReviewerDataInitialization] Loading submitted responses from PostgreSQL for reviewer ${reviewer.id}`)
        
        try {
          // Skip loading from PostgreSQL if in preview mode
          if (isPreview) {
            console.log(`[useReviewerDataInitialization] Preview mode active, skipping PostgreSQL results load`)
          } else {
            const resultsDataset = await getResultsDataset(taskIdNum)
            
            if (resultsDataset && Array.isArray(resultsDataset.results)) {
              // Filter results for current reviewer only
              const reviewerResults = resultsDataset.results.filter(
                (result: EvaluationResult) => result.reviewerId === reviewer.id
              )
              
              console.log(`[useReviewerDataInitialization] Found ${reviewerResults.length} submitted responses for reviewer ${reviewer.id}`)
              
              // Reconstruct allResponses from submitted results
              const reconstructedResponses: Record<number, Record<string, string>> = {}
              
              reviewerResults.forEach((result: EvaluationResult) => {
                // Find the item index based on itemId matching originalData
                const evalData = evaluation?.originalData || evaluation?.data || []
                const itemIndex = evalData.findIndex(
                  (row: any) => (row.item_id || row.id || `item-${evalData.indexOf(row) + 1}`) === result.itemId
                )
                
                if (itemIndex !== -1) {
                  const itemNumber = itemIndex + 1
                  // Convert responses back to form data format
                  const formDataForItem: Record<string, string> = {}
                  
                  if (evaluation?.criteria) {
                    evaluation.criteria.forEach((criterion: any) => {
                      const responseValue = result.responses[criterion.name]
                      if (responseValue !== undefined) {
                        formDataForItem[`criterion-${criterion.id}`] = responseValue
                      }
                    })
                  }
                  
                  reconstructedResponses[itemNumber] = formDataForItem
                }
              })
              
              console.log(`[useReviewerDataInitialization] Reconstructed ${Object.keys(reconstructedResponses).length} responses from PostgreSQL:`, reconstructedResponses)
              setAllResponses(reconstructedResponses)
              
              // Calculate progress from loaded responses
              const submittedItemCount = Object.keys(reconstructedResponses).length
              if (submittedItemCount > 0) {
                const maxSubmittedItem = Math.max(...Object.keys(reconstructedResponses).map(Number))
                console.log(`[useReviewerDataInitialization] Setting progress based on ${submittedItemCount} submitted items (furthest: ${maxSubmittedItem})`)
                setFurthestItemReached(maxSubmittedItem)
              }
            } else {
              console.log(`[useReviewerDataInitialization] No results dataset found in PostgreSQL, starting fresh`)
            }
          }
        } catch (dbError) {
          console.error('[useReviewerDataInitialization] Error loading from PostgreSQL:', dbError)
          // Fall back to localStorage if database fails
          const savedResponsesString = localStorage.getItem(storageKey)
          if (savedResponsesString) {
            console.log(`[useReviewerDataInitialization] Falling back to localStorage responses`)
            try {
              const savedResponses = JSON.parse(savedResponsesString)
              setAllResponses(savedResponses)
              
              const submittedItemCount = Object.keys(savedResponses).length
              if (submittedItemCount > 0) {
                const maxSubmittedItem = Math.max(...Object.keys(savedResponses).map(Number))
                setFurthestItemReached(maxSubmittedItem)
              }
            } catch (parseError) {
              console.error('[useReviewerDataInitialization] Error parsing localStorage:', parseError)
            }
          }
        }

        // Check if this evaluation is completed for the current reviewer
        let currentReviewerRecord
        
        if (isPreview) {
          // In preview mode, check local storage for completion status
          const previewProgress = localStorage.getItem(progressKey)
          if (previewProgress) {
            try {
              const progress = JSON.parse(previewProgress)
              // If we have reached the end, check if all items are answered
              // This is a simplified check for preview mode
            } catch (e) {
              console.error('Error parsing preview progress', e)
            }
          }
        } else if (participantId) {
          // Look for the specific reviewer by ID from URL parameter
          currentReviewerRecord = evaluationReviewers.find(
            (r: any) => r.id === participantId && 
            (r.evaluationId === taskId || r.evaluationId === Number(taskId))
          )
        }
        
        // If no specific reviewer found and not preview, fall back to first matching reviewer
        if (!currentReviewerRecord && !isPreview) {
          const matchingReviewers = evaluationReviewers.filter(
            (r: any) => r.evaluationId === taskId || r.evaluationId === Number(taskId)
          )
          if (matchingReviewers.length > 0) {
            currentReviewerRecord = matchingReviewers[0]
          }
        }
        
        const isCompleted = !isPreview && (currentReviewerRecord?.status === "completed" || 
                          (currentReviewerRecord?.completed === currentReviewerRecord?.total && currentReviewerRecord?.total > 0))
        
        // If evaluation is completed, mark as complete
        if (isCompleted) {
          console.log(`[useReviewerDataInitialization] Evaluation is completed. Marking review as complete`)
          setIsReviewComplete(true)
        }
      } catch (error) {
        console.error('[useReviewerDataInitialization] Error loading reviewer data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReviewerData()
  }, [taskId, storageKey, progressKey, participantId, identifyCurrentReviewer, isPreview])

  return {
    // Core data
    evaluation,
    currentReviewer,
    
    // Response and progress state
    allResponses,
    furthestItemReached,
    isReviewComplete,
    
    // Loading state
    isLoading,
    
    // Setters for external updates
    setAllResponses,
    setFurthestItemReached,
    setIsReviewComplete,
    
    // Utility functions
    getStorageKey,
    getProgressKey,
  }
}
