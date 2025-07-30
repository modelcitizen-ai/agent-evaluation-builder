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
import { getEvaluation, getReviewers } from '@/lib/client-db'

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

  // Memoize storage keys to prevent infinite re-renders
  const storageKey = useMemo(() => {
    return participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_responses`
      : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
  }, [taskId, participantId])

  const progressKey = useMemo(() => {
    return participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_progress`
      : `evaluation_${taskId}_progress` // Fallback for backwards compatibility
  }, [taskId, participantId])

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
    }, [taskId, participantId])

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

        // Load saved responses using memoized key
        console.log(`[useReviewerDataInitialization] Looking for saved responses with key: ${storageKey}`)
        
        const savedResponsesString = localStorage.getItem(storageKey)
        if (savedResponsesString) {
          console.log(`[useReviewerDataInitialization] Found saved responses:`, savedResponsesString)
          try {
            const savedResponses = JSON.parse(savedResponsesString)
            console.log(`[useReviewerDataInitialization] Parsed saved responses:`, savedResponses)
            setAllResponses(savedResponses)

            // Check if this evaluation is completed for the current reviewer
            let currentReviewerRecord
            
            if (participantId) {
              // Look for the specific reviewer by ID from URL parameter
              currentReviewerRecord = evaluationReviewers.find(
                (r: any) => r.id === participantId && 
                (r.evaluationId === taskId || r.evaluationId === Number(taskId))
              )
            }
            
            // If no specific reviewer found, fall back to first matching reviewer
            if (!currentReviewerRecord) {
              const matchingReviewers = evaluationReviewers.filter(
              (r: any) => r.evaluationId === taskId || r.evaluationId === Number(taskId)
            )
            if (matchingReviewers.length > 0) {
              currentReviewerRecord = matchingReviewers[0]
            }
          }
          
          const isCompleted = currentReviewerRecord?.status === "completed" || 
                            (currentReviewerRecord?.completed === currentReviewerRecord?.total && currentReviewerRecord?.total > 0)
          
          // Load progress (furthest item reached) from localStorage using memoized key
          const savedProgressString = localStorage.getItem(progressKey)
          
          if (savedProgressString) {
            try {
              const savedProgress = JSON.parse(savedProgressString)
              if (savedProgress.furthestItem) {
                const furthestItem = savedProgress.furthestItem
                console.log(`[useReviewerDataInitialization] Found saved progress. Setting to item ${furthestItem}`)
                setFurthestItemReached(furthestItem)
                
                // If evaluation is completed, mark as complete
                if (isCompleted) {
                  console.log(`[useReviewerDataInitialization] Evaluation is completed. Marking review as complete`)
                  setIsReviewComplete(true)
                }
              }
            } catch (progressError) {
              console.error('[useReviewerDataInitialization] Error parsing saved progress:', progressError)
            }
          } else if (isCompleted) {
            // If no progress saved but evaluation is marked complete
            console.log(`[useReviewerDataInitialization] No saved progress but evaluation is completed. Setting default values.`)
            setIsReviewComplete(true)
          }
        } catch (parseError) {
          console.error('[useReviewerDataInitialization] Error parsing saved responses:', parseError)
        }
        } else {
          // Initialize empty response
          console.log(`[useReviewerDataInitialization] No existing responses found. Creating initial state.`)
        }
      } catch (error) {
        console.error('[useReviewerDataInitialization] Error loading reviewer data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReviewerData()
  }, [taskId, storageKey, progressKey, participantId, identifyCurrentReviewer])

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
