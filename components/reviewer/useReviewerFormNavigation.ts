/**
 * Custom hook for handling Reviewer Task Page form navigation and management
 * Extracts form handling and navigation logic from the main ReviewTaskPage component
 * 
 * This hook handles:
 * - Form data management and validation
 * - Item navigation (next/previous with auto-save)
 * - Response tracking and submission
 * - Progress management and localStorage persistence
 * - Time tracking for completion analytics
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getResultsDataset, addResultToDataset, saveResultsDataset, type EvaluationResult } from "@/lib/results-dataset"

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

interface UseReviewerFormNavigationProps {
  evaluation: Evaluation | null
  currentReviewer: ReviewerInfo
  allResponses: Record<number, Record<string, string>>
  furthestItemReached: number
  isReviewComplete: boolean
  setAllResponses: React.Dispatch<React.SetStateAction<Record<number, Record<string, string>>>>
  setFurthestItemReached: React.Dispatch<React.SetStateAction<number>>
  setIsReviewComplete: React.Dispatch<React.SetStateAction<boolean>>
}

interface UseReviewerFormNavigationReturn {
  // Current navigation state
  currentItem: number
  formData: Record<string, string>
  isSubmitting: boolean
  submittedItems: Set<number>
  isCurrentFormModified: boolean
  questionStartTime: number
  
  // Validation
  isFormValid: boolean
  
  // Actions
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleInputChange: (criterionId: number, value: string) => void
  setCurrentItem: React.Dispatch<React.SetStateAction<number>>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  
  // Utility functions
  saveCurrentResponsesBeforeNavigation: () => void
}

export function useReviewerFormNavigation({
  evaluation,
  currentReviewer,
  allResponses,
  furthestItemReached,
  isReviewComplete,
  setAllResponses,
  setFurthestItemReached,
  setIsReviewComplete
}: UseReviewerFormNavigationProps): UseReviewerFormNavigationReturn {
  
  const params = useParams()
  const searchParams = useSearchParams()
  const taskId = params.id

  // Navigation and form state
  const [currentItem, setCurrentItem] = useState(1)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedItems, setSubmittedItems] = useState<Set<number>>(new Set())
  const [isCurrentFormModified, setIsCurrentFormModified] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

  // Memoized storage keys to prevent infinite render loops
  const memoizedStorageKey = useMemo(() => {
    const participantId = searchParams.get('participant')
    return participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_responses`
      : `evaluation_${taskId}_responses`
  }, [taskId, searchParams])

  const memoizedProgressKey = useMemo(() => {
    const participantId = searchParams.get('participant')
    return participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_progress`
      : `evaluation_${taskId}_progress`
  }, [taskId, searchParams])

  // Form validation
  const isFormValid = useMemo(() => {
    if (!evaluation?.criteria) return false
    return evaluation.criteria.every((criterion) => {
      if (!criterion.required) return true
      const value = formData[`criterion-${criterion.id}`]
      return value !== undefined && value !== null && value.trim() !== ""
    })
  }, [formData, evaluation?.criteria])

  // Load responses for current item when item changes
  useEffect(() => {
    if (!evaluation) return

    try {
      // Load from state first
      const savedResponsesForItem = allResponses[currentItem] || {}
      console.log(`[loadCurrentItem] Loading saved responses for item ${currentItem}:`, savedResponsesForItem)
      
      // Set the form data with saved responses
      setFormData(savedResponsesForItem)
      
      // If we have saved responses in localStorage but not in state, try to reload from localStorage
      if (Object.keys(savedResponsesForItem).length === 0) {
        const storageKey = memoizedStorageKey
        const savedResponsesString = localStorage.getItem(storageKey)
        
        if (savedResponsesString) {
          try {
            const savedResponses = JSON.parse(savedResponsesString)
            if (savedResponses[currentItem]) {
              console.log(`[loadCurrentItem] Found responses in localStorage for item ${currentItem}:`, savedResponses[currentItem])
              setFormData(savedResponses[currentItem])
            }
          } catch (error) {
            console.error('[loadCurrentItem] Error parsing saved responses:', error)
          }
        }
      }
    } catch (error) {
      console.error('[loadCurrentItem] Error loading item responses:', error)
    }

    // Reset modification flag when loading a new item
    setIsCurrentFormModified(false)

    // Reset question start time when moving to a new question
    setQuestionStartTime(Date.now())

    // Update furthest item reached if current item is further
    if (currentItem > furthestItemReached) {
      setFurthestItemReached(currentItem)
      
      // Save furthest item reached to localStorage
      const progressKey = memoizedProgressKey
      try {
        localStorage.setItem(progressKey, JSON.stringify({ furthestItem: currentItem }))
        console.log(`[updateProgress] Saved furthest item reached to localStorage: ${currentItem} with key: ${progressKey}`)
      } catch (error) {
        console.error('[updateProgress] Error saving progress to localStorage:', error)
      }
    }
  }, [currentItem, allResponses, furthestItemReached, taskId, evaluation, memoizedStorageKey, memoizedProgressKey, setFurthestItemReached])

  // Handle input changes with immediate localStorage persistence
  const handleInputChange = (criterionId: number, value: string) => {
    // Update form data
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [`criterion-${criterionId}`]: value,
      }
      
      // Update responses immediately when a user enters input
      // This ensures we have data to detect "Continue" state
      const updatedAllResponses = {
        ...allResponses,
        [currentItem]: newFormData,
      }
      
      // Save to state
      setAllResponses(updatedAllResponses)
      
      // Also save directly to localStorage for immediate persistence (for navigation)
      const storageKey = memoizedStorageKey
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedAllResponses))
        console.log(`[handleInputChange] Saved responses to localStorage for item ${currentItem} with key: ${storageKey}`, newFormData)
      } catch (error) {
        console.error('[handleInputChange] Error saving to localStorage:', error)
      }
      
      // Mark form as modified when user changes an answer
      setIsCurrentFormModified(true)
      
      return newFormData
    })
  }

  // Helper function to update reviewer's average time
  const updateReviewerAverageTime = (reviewerId: string, newTimeSpent: number) => {
    try {
      const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
      
      // Find the current reviewer
      const reviewerIndex = evaluationReviewers.findIndex(
        (r: any) => r.id === reviewerId && 
        (r.evaluationId === taskId || r.evaluationId === Number(taskId))
      )
      
      if (reviewerIndex !== -1) {
        const reviewer = evaluationReviewers[reviewerIndex]
        
        // Get existing time tracking data for this reviewer
        const existingTimes = reviewer.timeSpentArray || []
        const newTimesArray = [...existingTimes, newTimeSpent]
        
        // Calculate new average (in seconds)
        const totalTime = newTimesArray.reduce((sum, time) => sum + time, 0)
        const avgTime = Math.round(totalTime / newTimesArray.length)
        
        // Update the reviewer record
        evaluationReviewers[reviewerIndex] = {
          ...reviewer,
          avgTime: avgTime,
          timeSpentArray: newTimesArray,
          lastSubmissionTime: new Date().toISOString()
        }
        
        localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
        console.log(`[updateReviewerAverageTime] Updated average time for reviewer ${reviewerId}: ${avgTime}s (based on ${newTimesArray.length} submissions)`)
      }
    } catch (error) {
      console.error('[updateReviewerAverageTime] Error updating reviewer average time:', error)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || !evaluation) return

    setIsSubmitting(true)

    // Save current responses
    const updatedAllResponses = {
      ...allResponses,
      [currentItem]: formData,
    }
    setAllResponses(updatedAllResponses)
    
    // Explicitly save to localStorage right now
    const storageKey = memoizedStorageKey
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedAllResponses))
      console.log(`[handleSubmit] Explicitly saved responses to localStorage with key: ${storageKey}:`, updatedAllResponses)
    } catch (error) {
      console.error('[handleSubmit] Error saving to localStorage:', error)
    }

    // Calculate actual time spent on this question (in seconds)
    const currentTime = Date.now()
    const timeSpent = Math.round((currentTime - questionStartTime) / 1000)
    
    console.log(`[handleSubmit] Question completed in ${timeSpent} seconds`)

    // Get current data item
    const currentRowIndex = (currentItem - 1) % evaluation.data.length
    const currentRow = evaluation.data[currentRowIndex]

    // Get the assigned reviewer from the hook
    console.log(`[handleSubmit] Using reviewer from hook: ${currentReviewer.name} (ID: ${currentReviewer.id}) for evaluation ${taskId}`)

    // Create result object
    const result: EvaluationResult = {
      evaluationId: Number(taskId),
      itemId: currentRow.item_id || currentRow.id || `item-${currentItem}`,
      reviewerId: currentReviewer.id,
      reviewerName: currentReviewer.name,
      submittedAt: new Date().toISOString(),
      timeSpent,
      responses: Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          const criterionId = Number(key.split("-")[1])
          const criterion = evaluation.criteria.find((c) => c.id === criterionId)
          
          if (!criterion) {
            console.warn(`Criterion with ID ${criterionId} not found in evaluation criteria`)
            return null
          }
          
          return [criterion.name, value]
        }).filter((entry) => entry !== null)
      ),
      originalData: currentRow,
    }

    // Get and update results dataset
    const resultsDataset = getResultsDataset(Number(taskId))
    if (resultsDataset) {
      const updatedDataset = addResultToDataset(resultsDataset, result)
      saveResultsDataset(updatedDataset)
    }

    // Update reviewer's average time
    updateReviewerAverageTime(currentReviewer.id, timeSpent)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)

    // Mark the current item as submitted
    const newSubmittedItems = new Set([...submittedItems, currentItem])
    setSubmittedItems(newSubmittedItems)
    setIsCurrentFormModified(false)

    if (currentItem >= evaluation.totalItems) {
      // Update completion status and reviewer tracking
      try {
        const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
        
        // Find the current reviewer
        const currentReviewerId = currentReviewer.id
        const reviewerIndex = evaluationReviewers.findIndex(
          (r: any) => r.id === currentReviewerId && 
          (r.evaluationId === taskId || r.evaluationId === Number(taskId))
        )
        
        if (reviewerIndex !== -1) {
          // Update the reviewer's status and completion count
          evaluationReviewers[reviewerIndex].status = "completed"
          evaluationReviewers[reviewerIndex].completed = evaluation.totalItems
          localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
          console.log(`[updateReviewerStatus] Updated reviewer ${currentReviewerId} status to completed for evaluation ${taskId}`)
          
          // Force an update check on the data scientist page by triggering a custom event
          try {
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('evaluationCompleted', { 
                detail: { evaluationId: Number(taskId) } 
              });
              window.dispatchEvent(event);
              console.log(`[updateReviewerStatus] Dispatched evaluationCompleted event for ${taskId}`);
              
              // Also dispatch reviewerStatusUpdated for Progress Dashboard
              const statusEvent = new CustomEvent('reviewerStatusUpdated', { 
                detail: { evaluationId: Number(taskId), reviewerId: currentReviewerId } 
              });
              window.dispatchEvent(statusEvent);
              console.log(`[updateReviewerStatus] Dispatched reviewerStatusUpdated event for reviewer ${currentReviewerId}`);
            }
          } catch (eventError) {
            console.error('[updateReviewerStatus] Error dispatching completion event:', eventError);
          }
        } else {
          console.warn(`[updateReviewerStatus] Reviewer ${currentReviewerId} not found for evaluation ${taskId}`);
        }
      } catch (error) {
        console.error('[updateReviewerStatus] Error updating reviewer status:', error)
      }

      // Set review complete state
      setIsReviewComplete(true)
    } else {
      const nextItem = currentItem + 1
      setCurrentItem(nextItem)
      setFurthestItemReached(Math.max(furthestItemReached, nextItem))
    }
  }

  // Utility function to save current responses before navigation
  const saveCurrentResponsesBeforeNavigation = () => {
    setAllResponses((prev) => ({
      ...prev,
      [currentItem]: formData,
    }))
  }

  return {
    // Current navigation state
    currentItem,
    formData,
    isSubmitting,
    submittedItems,
    isCurrentFormModified,
    questionStartTime,
    
    // Validation
    isFormValid,
    
    // Actions
    handleSubmit,
    handleInputChange,
    setCurrentItem,
    setIsSubmitting,
    
    // Utility functions
    saveCurrentResponsesBeforeNavigation,
  }
}
