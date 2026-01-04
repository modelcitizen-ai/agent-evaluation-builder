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
import { getResultsDataset, addResultToDataset } from "@/lib/client-db"
import { type EvaluationResult } from "@/lib/results-dataset"

interface Evaluation {
  id: number
  name: string
  instructions: string
  criteria: any[]
  columnRoles: any[]
  data?: any[]  // Made optional for backward compatibility
  originalData?: any[]  // Added for PostgreSQL response
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
  currentQuestionStartTime: number | undefined
  
  // Validation
  isFormValid: boolean
  
  // Actions
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleInputChange: (criterionId: number, value: string) => void
  setCurrentItem: React.Dispatch<React.SetStateAction<number>>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  
  // Utility functions
  saveCurrentResponsesBeforeNavigation: () => void
  updateReviewerAverageTime: (reviewerId: string, newTimeSpent: number) => number
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
  
  // Per-question timing: tracks start time for each question until submission
  const [questionTimers, setQuestionTimers] = useState<Record<number, number>>({})
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize submitted items based on existing responses (for resume functionality)
  useEffect(() => {
    if (!evaluation || !currentReviewer.id) return

    // Determine which items have been submitted based on PostgreSQL results dataset
    const loadSubmittedItems = async () => {
      const submittedItemNumbers = new Set<number>()

      // Check PostgreSQL results dataset for completed submissions
      try {
        const resultsDataset = await getResultsDataset(Number(taskId))
        const currentReviewerId = currentReviewer.id

        if (resultsDataset && Array.isArray(resultsDataset.results)) {
          const reviewerResults = resultsDataset.results.filter(
            (result: any) => result.reviewerId === currentReviewerId
          )
          
          reviewerResults.forEach((result: any) => {
            // Extract item number from result data by matching itemId with originalData
            const evalData = evaluation.originalData || evaluation.data || []
            const itemIndex = evalData.findIndex(
              (row: any) => (row.item_id || row.id || `item-${evalData.indexOf(row) + 1}`) === result.itemId
            )
            
            if (itemIndex !== -1) {
              const itemNumber = itemIndex + 1
              submittedItemNumbers.add(itemNumber)
            }
          })
          
          console.log(`[useReviewerFormNavigation] Loaded ${submittedItemNumbers.size} submitted items from PostgreSQL:`, Array.from(submittedItemNumbers).sort((a, b) => a - b))
        }
      } catch (error) {
        console.error('[useReviewerFormNavigation] Error loading submitted items from PostgreSQL:', error)
      }

      if (submittedItemNumbers.size > 0) {
      console.log(`[useReviewerFormNavigation] Found ${submittedItemNumbers.size} previously submitted items:`, Array.from(submittedItemNumbers).sort((a, b) => a - b))
        setSubmittedItems(submittedItemNumbers)
        
        // Find the first unanswered question for smart resume
        if (!hasInitialized && currentItem === 1) {
          let nextUnansweredItem = 1
          for (let i = 1; i <= evaluation.totalItems; i++) {
            if (!submittedItemNumbers.has(i)) {
              nextUnansweredItem = i
              break
            }
          }
          
          // If all questions are answered, go to the last question
          if (nextUnansweredItem === 1 && submittedItemNumbers.has(1)) {
            nextUnansweredItem = evaluation.totalItems
          }
          
          console.log(`[useReviewerFormNavigation] Smart resume: jumping to first unanswered question ${nextUnansweredItem}`)
          setCurrentItem(nextUnansweredItem)
          setFurthestItemReached(Math.max(furthestItemReached, nextUnansweredItem))
          setHasInitialized(true)
        }
        
        // Synchronize the progress dashboard with the restored submission count
        try {
          const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
          const reviewerIndex = evaluationReviewers.findIndex(
            (r: any) => r.id === currentReviewer.id && 
            (r.evaluationId === taskId || r.evaluationId === Number(taskId))
          )
          
          if (reviewerIndex !== -1) {
            const currentProgress = evaluationReviewers[reviewerIndex].completed || 0
            const actualSubmittedCount = submittedItemNumbers.size
            
            // Only update if the counts don't match
            if (currentProgress !== actualSubmittedCount) {
              evaluationReviewers[reviewerIndex].completed = actualSubmittedCount
              localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
              console.log(`[useReviewerFormNavigation] Synchronized progress dashboard: ${actualSubmittedCount} submitted items for reviewer ${currentReviewer.id}`)
              
              // Dispatch event to notify Progress Dashboard of the corrected count
              try {
                if (typeof window !== 'undefined') {
                  const progressEvent = new CustomEvent('reviewerProgressUpdated', { 
                    detail: { 
                      evaluationId: Number(taskId), 
                      reviewerId: currentReviewer.id,
                      completed: actualSubmittedCount,
                      total: evaluation.totalItems,
                      avgTime: evaluationReviewers[reviewerIndex].avgTime || "0.0"
                    } 
                  });
                  window.dispatchEvent(progressEvent);
                  console.log(`[useReviewerFormNavigation] Dispatched reviewerProgressUpdated event to sync progress dashboard`);
                }
              } catch (eventError) {
                console.error('[useReviewerFormNavigation] Error dispatching progress sync event:', eventError);
              }
            }
          }
        } catch (error) {
          console.error('[useReviewerFormNavigation] Error synchronizing progress dashboard:', error)
        }
      } else if (!hasInitialized) {
        // No submitted items found, initialize normally
        setHasInitialized(true)
      }
    }
    
    loadSubmittedItems()
  }, [evaluation, taskId, currentReviewer.id, searchParams, hasInitialized, currentItem, furthestItemReached, setFurthestItemReached])

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

    // Start timing for this question if not already started and not yet submitted
    if (!questionTimers[currentItem] && !submittedItems.has(currentItem)) {
      setQuestionTimers(prev => ({
        ...prev,
        [currentItem]: Date.now()
      }))
      console.log(`[Timer] Started timing for question ${currentItem}`)
    }

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
  }, [currentItem, furthestItemReached, taskId, evaluation, memoizedStorageKey, memoizedProgressKey, setFurthestItemReached])

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
        
        return avgTime
      } else {
        console.warn(`[updateReviewerAverageTime] Reviewer ${reviewerId} not found for evaluation ${taskId}`)
        return 0
      }
    } catch (error) {
      console.error('[updateReviewerAverageTime] Error updating reviewer average time:', error)
      return 0
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
    const questionStartTime = questionTimers[currentItem]
    let timeSpent = 0
    
    if (questionStartTime) {
      timeSpent = Math.round((currentTime - questionStartTime) / 1000)
      console.log(`[handleSubmit] Question ${currentItem} completed in ${timeSpent} seconds (total thinking time including navigation)`)
      
      // Remove the timer for this question since it's now submitted
      setQuestionTimers(prev => {
        const updated = { ...prev }
        delete updated[currentItem]
        return updated
      })
    } else {
      console.warn(`[handleSubmit] No timer found for question ${currentItem}, using 0 seconds`)
    }

    // Get current data item
    const evaluationData = evaluation.originalData || evaluation.data || []
    const currentRowIndex = (currentItem - 1) % evaluationData.length
    const currentRow = evaluationData[currentRowIndex]

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

    // Submit result to dataset via API
    try {
      await addResultToDataset(Number(taskId), result)
      console.log(`[handleSubmit] Successfully submitted result for evaluation ${taskId}, item ${currentItem}`)
    } catch (error) {
      console.error(`[handleSubmit] Error submitting result for evaluation ${taskId}:`, error)
      // For now, continue despite error - could show user notification in future
    }

    // Update reviewer's average time
    updateReviewerAverageTime(currentReviewer.id, timeSpent)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)

    // Mark the current item as submitted
    const newSubmittedItems = new Set([...submittedItems, currentItem])
    setSubmittedItems(newSubmittedItems)
    setIsCurrentFormModified(false)
    
    console.log(`[handleSubmit] Added item ${currentItem} to submitted items. Full set:`, Array.from(newSubmittedItems).sort((a, b) => a - b))

    if (currentItem >= evaluation.totalItems) {
      // Update completion status and reviewer tracking using database adapter
      try {
        // Import database functions at the top level
        const { getReviewers, updateReviewer } = await import('@/lib/client-db')
        
        const currentReviewerId = currentReviewer.id
        
        // Get current reviewers from database
        const evaluationReviewers = await getReviewers(Number(taskId))
        
        // Find the current reviewer
        const reviewerRecord = evaluationReviewers.find(
          (r: any) => r.id === currentReviewerId && 
          (r.evaluationId === taskId || r.evaluationId === Number(taskId))
        )
        
        if (reviewerRecord) {
          // Update the reviewer's status and completion count in database
          await updateReviewer(reviewerRecord.id, {
            status: "completed",
            completed: evaluation.totalItems
          })
          console.log(`[updateReviewerStatus] Updated reviewer ${currentReviewerId} status to completed for evaluation ${taskId}`)
          
          // Also update localStorage for backward compatibility (in case any code still reads from it)
          try {
            const localReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
            const localIndex = localReviewers.findIndex(
              (r: any) => r.id === currentReviewerId && 
              (r.evaluationId === taskId || r.evaluationId === Number(taskId))
            )
            if (localIndex !== -1) {
              localReviewers[localIndex].status = "completed"
              localReviewers[localIndex].completed = evaluation.totalItems
              localStorage.setItem("evaluationReviewers", JSON.stringify(localReviewers))
            }
          } catch (localError) {
            console.warn('[updateReviewerStatus] Could not update localStorage (non-critical):', localError)
          }
          
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
    currentQuestionStartTime: questionTimers[currentItem],
    
    // Validation
    isFormValid,
    
    // Actions
    handleSubmit,
    handleInputChange,
    setCurrentItem,
    setIsSubmitting,
    
    // Utility functions
    saveCurrentResponsesBeforeNavigation,
    updateReviewerAverageTime,
  }
}
