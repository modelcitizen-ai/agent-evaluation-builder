"use client"

import type React from "react"
import { getResultsDataset, addResultToDataset, saveResultsDataset, type EvaluationResult } from "@/lib/results-dataset"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowRightIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import ContentRenderer from "@/components/content-renderer"

interface Evaluation {
  id: number
  name: string
  instructions: string
  criteria: any[]
  columnRoles: any[]
  data: any[]
  totalItems: number
  assignedReviewers?: { id: string; name: string }[] // Added assignedReviewers property
}

export default function ReviewTaskPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [currentItem, setCurrentItem] = useState(1)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [allResponses, setAllResponses] = useState<Record<number, Record<string, string>>>({})
  const [furthestItemReached, setFurthestItemReached] = useState(1)
  const [submittedItems, setSubmittedItems] = useState<Set<number>>(new Set())
  const [isReviewComplete, setIsReviewComplete] = useState(false)
  const [isCurrentFormModified, setIsCurrentFormModified] = useState(false)

  // Time tracking state
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

  // Column resizing state (shared with preview page)
  const [leftColumnWidth, setLeftColumnWidth] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const taskId = params.id

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
        const timeTrackingKey = `time_tracking_${reviewerId}_${taskId}`
        const existingTimeData = JSON.parse(localStorage.getItem(timeTrackingKey) || "[]")
        
        // Add the new time spent to the tracking data
        existingTimeData.push(newTimeSpent)
        
        // Calculate the average time (in seconds)
        const totalTime = existingTimeData.reduce((sum: number, time: number) => sum + time, 0)
        const averageTime = totalTime / existingTimeData.length
        
        // Update reviewer's avgTime field (convert to string for consistency)
        evaluationReviewers[reviewerIndex].avgTime = averageTime.toFixed(1)
        
        // Save updated reviewer data
        localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
        
        // Save time tracking data
        localStorage.setItem(timeTrackingKey, JSON.stringify(existingTimeData))
        
        console.log(`[updateReviewerAverageTime] Updated reviewer ${reviewerId} average time: ${averageTime.toFixed(1)}s (${existingTimeData.length} questions completed)`)
        
        return averageTime
      } else {
        console.warn(`[updateReviewerAverageTime] Reviewer ${reviewerId} not found for evaluation ${taskId}`)
        return 0
      }
    } catch (error) {
      console.error('[updateReviewerAverageTime] Error updating reviewer average time:', error)
      return 0
    }
  }

  useEffect(() => {
    const rawEvaluations = localStorage.getItem("evaluations")
    const storedEvaluations = JSON.parse(rawEvaluations || "[]")

    const taskIdNum = Number(taskId)

    const foundEvaluation = storedEvaluations.find((evaluationItem: any) => Number(evaluationItem.id) === taskIdNum)
    if (foundEvaluation) {
      setEvaluation(foundEvaluation)
      // Ensure submittedItems starts empty
      setSubmittedItems(new Set())
      console.log(`[loadEvaluation] Found evaluation with ID ${taskId}:`, foundEvaluation)
    } else {
      console.error(`❌ Evaluation with ID ${taskId} not found`)
    }

    // Load saved responses from localStorage if they exist
    try {
      // Get the specific reviewer ID from URL parameter for reviewer-specific storage
      const participantId = searchParams.get('participant')
      const savedResponsesKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_responses`
        : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
      console.log(`[loadResponses] Looking for saved responses with key: ${savedResponsesKey}`)
      const savedResponsesString = localStorage.getItem(savedResponsesKey)
      
      if (savedResponsesString) {
        console.log(`[loadResponses] Found saved responses:`, savedResponsesString)
        try {
          const savedResponses = JSON.parse(savedResponsesString)
          console.log(`[loadResponses] Parsed saved responses:`, savedResponses)
          setAllResponses(savedResponses)
          
          // Check if this evaluation is completed for the current reviewer
          const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
          
          // Find the specific reviewer for this evaluation using participant URL parameter
          const participantId = searchParams.get('participant')
          
          let currentReviewerRecord;
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
              currentReviewerRecord = matchingReviewers[0];
            }
          }
          
          const isCompleted = currentReviewerRecord?.status === "completed" || 
                            (currentReviewerRecord?.completed === currentReviewerRecord?.total && currentReviewerRecord?.total > 0)
          
          // Load progress (furthest item reached) from localStorage  
          const progressKey = participantId 
            ? `evaluation_${taskId}_reviewer_${participantId}_progress`
            : `evaluation_${taskId}_progress` // Fallback for backwards compatibility
          const savedProgressString = localStorage.getItem(progressKey)
          
          if (savedProgressString) {
            try {
              const savedProgress = JSON.parse(savedProgressString)
              if (savedProgress.furthestItem) {
                const furthestItem = savedProgress.furthestItem
                console.log(`[loadProgress] Found saved progress. Setting to item ${furthestItem}`)
                setFurthestItemReached(furthestItem)
                
                // If evaluation is completed, set current item to the first question and mark as complete
                if (isCompleted && foundEvaluation) {
                  console.log(`[loadProgress] Evaluation is completed. Setting current item to 1 for review`)
                  setCurrentItem(1)
                  setIsReviewComplete(true)
                } else {
                  setCurrentItem(furthestItem)
                }
              }
            } catch (progressError) {
              console.error('[loadProgress] Error parsing saved progress:', progressError)
            }
          } else if (isCompleted && foundEvaluation) {
            // If no progress saved but evaluation is marked complete, go to first question for review
            console.log(`[loadProgress] No saved progress but evaluation is completed. Setting to first item for review.`)
            setCurrentItem(1)
            setFurthestItemReached(foundEvaluation.totalItems)
            setIsReviewComplete(true)
          }
        } catch (parseError) {
          console.error('[loadResponses] Error parsing saved responses:', parseError)
        }
      } else {
        // Initialize empty response and save it immediately to mark as started
        console.log(`[loadResponses] No existing responses found. Creating initial state.`)
        // We'll set this in a separate useEffect to avoid state update during render
      }
    } catch (error) {
      console.error('[loadResponses] Error loading saved responses:', error)
    }
  }, [taskId])
  
  // Initialize empty responses if none exist yet and set submitted items for completed evaluations
  useEffect(() => {
    if (evaluation && Object.keys(allResponses).length === 0) {
      // Create an empty initial response to mark as started
      const initialResponses = { 1: {} }
      console.log(`[initResponses] Setting initial empty responses:`, initialResponses)
      
      // Update state
      setAllResponses(initialResponses)
      
      // Also save directly to localStorage to mark as started
      const participantId = searchParams.get('participant')
      const storageKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_responses`
        : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
      try {
        localStorage.setItem(storageKey, JSON.stringify(initialResponses))
        console.log(`[initResponses] Saved initial empty responses to localStorage with key: ${storageKey}`)
      } catch (error) {
        console.error('[initResponses] Error saving initial responses to localStorage:', error)
      }
    }
    
    // Set submitted items for completed evaluations
    if (evaluation && isReviewComplete) {
      // For completed evaluations, mark all items as submitted
      const allItemsSubmitted = new Set<number>()
      for (let i = 1; i <= evaluation.totalItems; i++) {
        allItemsSubmitted.add(i)
      }
      setSubmittedItems(allItemsSubmitted)
      console.log(`[initSubmittedItems] Set all items as submitted for completed evaluation:`, Array.from(allItemsSubmitted))
    } else if (evaluation) {
      // For non-completed evaluations, load submitted items from localStorage
      try {
        const participantId = searchParams.get('participant')
        const submittedKey = participantId 
          ? `evaluation_${taskId}_reviewer_${participantId}_submitted`
          : `evaluation_${taskId}_submitted` // Fallback for backwards compatibility
        const savedSubmitted = localStorage.getItem(submittedKey)
        if (savedSubmitted) {
          const submittedArray = JSON.parse(savedSubmitted)
          const submittedSet = new Set<number>(submittedArray)
          setSubmittedItems(submittedSet)
          console.log(`[initSubmittedItems] Loaded submitted items from localStorage:`, Array.from(submittedSet))
        } else {
          setSubmittedItems(new Set<number>())
          console.log(`[initSubmittedItems] No submitted items found, starting with empty set`)
        }
      } catch (error) {
        console.error('[initSubmittedItems] Error loading submitted items from localStorage:', error)
        setSubmittedItems(new Set<number>())
      }
    }
  }, [evaluation, allResponses, taskId, isReviewComplete])

  // Handle column resizing (shared logic with preview page)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width
      const mouseX = e.clientX - containerRect.left

      // Calculate percentage (constrain between 30% and 70%)
      let newLeftWidth = (mouseX / containerWidth) * 100
      newLeftWidth = Math.max(30, Math.min(70, newLeftWidth))

      setLeftColumnWidth(newLeftWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Load responses for current item
  useEffect(() => {
    // First, check localStorage for any saved data for the current item
    try {
      // Load from state first
      const savedResponsesForItem = allResponses[currentItem] || {}
      console.log(`[loadCurrentItem] Loading saved responses for item ${currentItem}:`, savedResponsesForItem)
      
      // Set the form data with saved responses
      setFormData(savedResponsesForItem)
      
      // If we have saved responses in localStorage but not in state, try to reload from localStorage
      if (Object.keys(savedResponsesForItem).length === 0) {
        const participantId = searchParams.get('participant')
        const storageKey = participantId 
          ? `evaluation_${taskId}_reviewer_${participantId}_responses`
          : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
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
      const participantId = searchParams.get('participant')
      const progressKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_progress`
        : `evaluation_${taskId}_progress` // Fallback for backwards compatibility
      try {
        localStorage.setItem(progressKey, JSON.stringify({ furthestItem: currentItem }))
        console.log(`[updateProgress] Saved furthest item reached to localStorage: ${currentItem} with key: ${progressKey}`)
      } catch (error) {
        console.error('[updateProgress] Error saving progress to localStorage:', error)
      }
    }
  }, [currentItem, allResponses, furthestItemReached, taskId])

  // Save responses to localStorage whenever they change
  useEffect(() => {
    if (taskId) {
      const participantId = searchParams.get('participant')
      const storageKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_responses`
        : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
      
      // Only save if we have responses to save
      if (Object.keys(allResponses).length > 0) {
        console.log(`[saveResponses] Saving responses to localStorage with key: ${storageKey}`, allResponses)
        localStorage.setItem(storageKey, JSON.stringify(allResponses))
        console.log(`[saveResponses] Responses saved successfully. Current localStorage:`, 
          Object.keys(localStorage).filter(key => key.includes('evaluation_')))
      } else {
        console.log(`[saveResponses] No responses to save for ${storageKey}`)
      }
    }
  }, [allResponses, taskId])

  // Synchronize progress in evaluationReviewers based on submitted items
  useEffect(() => {
    if (evaluation && submittedItems.size > 0) {
      // Count how many items have been actually submitted (not just have responses)
      const completedItemsCount = submittedItems.size

      // Update the progress in evaluationReviewers to match actual completion
      try {
        const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
        
        // Find the current reviewer for this evaluation (use specific reviewer from URL)
        const participantId = searchParams.get('participant')
        
        let currentReviewer;
        if (participantId) {
          // Look for the specific reviewer by ID
          const specificReviewer = evaluationReviewers.find(
            (r: any) => r.id === participantId && 
            (r.evaluationId === taskId || r.evaluationId === Number(taskId))
          )
          
          if (specificReviewer) {
            currentReviewer = {
              id: specificReviewer.id,
              name: specificReviewer.name
            }
          }
        }
        
        // If no specific reviewer found, fall back to first matching reviewer
        if (!currentReviewer) {
          const matchingReviewers = evaluationReviewers.filter(
            (r: any) => r.evaluationId === taskId || r.evaluationId === Number(taskId)
          )
          
          if (matchingReviewers.length > 0) {
            currentReviewer = {
              id: matchingReviewers[0].id,
              name: matchingReviewers[0].name
            }
          } else {
            // Fallback to original logic
            const assignedReviewers = evaluation.assignedReviewers || []
            currentReviewer = assignedReviewers.length > 0 
              ? assignedReviewers[0] 
              : { id: "reviewer-1", name: "Anonymous Reviewer" }
          }
        }
        
        const reviewerIndex = evaluationReviewers.findIndex(
          (r: any) => r.id === currentReviewer.id && 
          (r.evaluationId === taskId || r.evaluationId === Number(taskId))
        )
        
        if (reviewerIndex !== -1) {
          const currentProgress = evaluationReviewers[reviewerIndex].completed
          
          // Only update if the count is different (to avoid unnecessary updates)
          if (currentProgress !== completedItemsCount) {
            evaluationReviewers[reviewerIndex].completed = completedItemsCount
            localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
            console.log(`[syncProgress] Synchronized reviewer ${currentReviewer.id} progress: ${completedItemsCount}/${evaluation.totalItems} (was ${currentProgress})`)
            
            // Dispatch event to notify Progress Dashboard
            try {
              if (typeof window !== 'undefined') {
                const progressEvent = new CustomEvent('reviewerProgressUpdated', { 
                  detail: { 
                    evaluationId: Number(taskId), 
                    reviewerId: currentReviewer.id,
                    completed: completedItemsCount,
                    total: evaluation.totalItems,
                    avgTime: evaluationReviewers[reviewerIndex].avgTime || "0.0"
                  } 
                });
                window.dispatchEvent(progressEvent);
                console.log(`[syncProgress] Dispatched reviewerProgressUpdated event for synchronization`);
              }
            } catch (eventError) {
              console.error('[syncProgress] Error dispatching progress sync event:', eventError);
            }
          }
        }
      } catch (error) {
        console.error('[syncProgress] Error synchronizing reviewer progress:', error)
      }
    }
  }, [evaluation, submittedItems, taskId])

  if (!evaluation) {
    return (
      <PageLayout title="Evaluation Not Found">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Evaluation Not Found</h3>
            <p className="text-gray-600 mb-4">The evaluation you're looking for doesn't exist or has been removed.</p>          <button
            onClick={() => router.push("/reviewer")}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600"
          >
            Back to Review Tasks
          </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  const isFormValid = evaluation.criteria.every((criterion) => {
    if (!criterion.required) return true
    const value = formData[`criterion-${criterion.id}`]
    return value !== undefined && value !== null && value.trim() !== ""
  })

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
      const participantId = searchParams.get('participant')
      const storageKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_responses`
        : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) return

    setIsSubmitting(true)

    // Save current responses
    const updatedAllResponses = {
      ...allResponses,
      [currentItem]: formData,
    }
    setAllResponses(updatedAllResponses)
    
    // Explicitly save to localStorage right now
    const participantId = searchParams.get('participant')
    const storageKey = participantId 
      ? `evaluation_${taskId}_reviewer_${participantId}_responses`
      : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
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

    // Get the assigned reviewer - fix the ID matching issue
    // Get the specific reviewer from URL parameter if available
    let currentReviewer;
    
    try {
      const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
      
      // First try to get the specific reviewer from URL parameter
      const participantId = searchParams.get('participant')
      
      if (participantId) {
        // Look for the specific reviewer by ID
        const specificReviewer = evaluationReviewers.find(
          (r: any) => r.id === participantId && 
          (r.evaluationId === taskId || r.evaluationId === Number(taskId))
        )
        
        if (specificReviewer) {
          currentReviewer = {
            id: specificReviewer.id,
            name: specificReviewer.name
          }
          console.log(`[handleSubmit] Found specific reviewer from URL: ${currentReviewer.name} (ID: ${currentReviewer.id}) for evaluation ${taskId}`)
        } else {
          console.warn(`[handleSubmit] Reviewer ${participantId} not found for evaluation ${taskId}`)
        }
      }
      
      // If no specific reviewer found, fall back to first matching reviewer
      if (!currentReviewer) {
        const matchingReviewers = evaluationReviewers.filter(
          (r: any) => r.evaluationId === taskId || r.evaluationId === Number(taskId)
        )
        
        if (matchingReviewers.length > 0) {
          currentReviewer = {
            id: matchingReviewers[0].id,
            name: matchingReviewers[0].name
          }
          console.log(`[handleSubmit] Using first matching reviewer: ${currentReviewer.name} (ID: ${currentReviewer.id}) for evaluation ${taskId}`)
        } else {
          // Fallback to original logic
          const assignedReviewers = evaluation.assignedReviewers || []
          currentReviewer = assignedReviewers.length > 0
            ? assignedReviewers[0]
            : {
                id: "reviewer-1",
                name: "Anonymous Reviewer",
              }
          console.log(`[handleSubmit] Using fallback reviewer: ${currentReviewer.name} (ID: ${currentReviewer.id})`)
        }
      }
    } catch (error) {
      console.error('[handleSubmit] Error finding reviewer:', error)
      // Final fallback
      currentReviewer = {
        id: "reviewer-1",
        name: "Anonymous Reviewer",
      }
    }

    // Create result object
    const result: EvaluationResult = {
      evaluationId: Number(taskId),
      itemId: currentRow.item_id || currentRow.id || `item-${currentItem}`,
      reviewerId: currentReviewer.id,
      reviewerName: currentReviewer.name,
      submittedAt: new Date().toISOString(),
      timeSpent,
responses: Object.fromEntries(
  Object.entries(formData)
    .map(([key, value]) => {
      const criterionId = Number(key.split("-")[1])
      const criterion = evaluation.criteria.find((c) => c.id === criterionId)
      if (!criterion) {
        console.warn(`Criterion with ID ${criterionId} not found in evaluation criteria`)
        return null
      }
      return [criterion.name, value]
    })
    .filter((entry): entry is [string, string] => entry !== null)
),
      originalData: currentRow,
    }

    // Get and update results dataset
    const resultsDataset = getResultsDataset(Number(taskId))
    if (resultsDataset) {
      const updatedDataset = addResultToDataset(resultsDataset, result)
      saveResultsDataset(updatedDataset)
    }

    // Update reviewer's average time with the actual time spent
    updateReviewerAverageTime(currentReviewer.id, timeSpent)

    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)

    // Mark the current item as submitted
    const newSubmittedItems = new Set([...submittedItems, currentItem])
    setSubmittedItems(newSubmittedItems)
    setIsCurrentFormModified(false)

    // Save submitted items to localStorage for progress tracking
    try {
      const participantId = searchParams.get('participant')
      const submittedKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_submitted`
        : `evaluation_${taskId}_submitted` // Fallback for backwards compatibility
      const submittedArray = Array.from(newSubmittedItems)
      localStorage.setItem(submittedKey, JSON.stringify(submittedArray))
      console.log(`[handleSubmit] Saved submitted items to localStorage with key: ${submittedKey}:`, submittedArray)
    } catch (error) {
      console.error('[handleSubmit] Error saving submitted items to localStorage:', error)
    }

    // Update progress in evaluationReviewers after each submission
    try {
      const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
      
      // Find the current reviewer
      const currentReviewerId = currentReviewer.id
      const reviewerIndex = evaluationReviewers.findIndex(
        (r: any) => r.id === currentReviewerId && 
        (r.evaluationId === taskId || r.evaluationId === Number(taskId))
      )
      
      if (reviewerIndex !== -1) {
        // Update the completed count to reflect actual submitted items count
        const submittedCount = newSubmittedItems.size
        evaluationReviewers[reviewerIndex].completed = submittedCount
        
        // Update the total to match the actual evaluation size (which may be filtered for segments)
        evaluationReviewers[reviewerIndex].total = evaluation.totalItems
        
        localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
        console.log(`[updateProgress] Updated reviewer ${currentReviewerId} progress: ${submittedCount}/${evaluation.totalItems} submitted`)
        
        // Dispatch event to notify Progress Dashboard of the update
        try {
          if (typeof window !== 'undefined') {
            const progressEvent = new CustomEvent('reviewerProgressUpdated', { 
              detail: { 
                evaluationId: Number(taskId), 
                reviewerId: currentReviewerId,
                completed: submittedCount,
                total: evaluation.totalItems,
                avgTime: evaluationReviewers[reviewerIndex].avgTime || "0.0"
              } 
            });
            window.dispatchEvent(progressEvent);
            console.log(`[updateProgress] Dispatched reviewerProgressUpdated event for reviewer ${currentReviewerId}: ${submittedCount}/${evaluation.totalItems}, avgTime: ${evaluationReviewers[reviewerIndex].avgTime}s`);
          }
        } catch (eventError) {
          console.error('[updateProgress] Error dispatching progress event:', eventError);
        }
      } else {
        console.warn(`[updateProgress] Reviewer ${currentReviewerId} not found for evaluation ${taskId}`);
      }
    } catch (error) {
      console.error('[updateProgress] Error updating reviewer progress:', error)
    }

    if (currentItem >= evaluation.totalItems) {
      // Mark this evaluation as completed for this reviewer by updating their status in evaluationReviewers
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
          evaluationReviewers[reviewerIndex].total = evaluation.totalItems
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

  // Get current content to display
  const getCurrentContent = () => {
    const currentRowIndex = (currentItem - 1) % evaluation.data.length
    const currentRow = evaluation.data[currentRowIndex]

    const inputColumns = evaluation.columnRoles.filter(
      (role) => role.userRole === "Input" || role.userRole === "Model Output",
    )

    // Always return array format for consistent rendering with labels
    return inputColumns.map((col) => ({
      name: col.name,
      content: currentRow[col.name] || "No content available",
      type: col.userRole,
    }))
  }

  const getCurrentMetadata = () => {
    const currentRowIndex = (currentItem - 1) % evaluation.data.length
    const currentRow = evaluation.data[currentRowIndex]

    return evaluation.columnRoles
      .filter((role) => role.userRole === "Metadata")
      .map((col) => ({
        name: col.name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        value: currentRow[col.name] || "N/A",
      }))
  }

const generateInputTitle = (columnName: string) => {
  // Check if there's a custom display name for this column
  const columnConfig = evaluation.columnRoles.find((col) => col.name === columnName)
  if (columnConfig?.displayName && columnConfig.displayName.trim()) {
    return columnConfig.displayName
  }

  // Fallback to formatted column name
  const formatted = columnName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return formatted
}

  const currentContent = getCurrentContent()
  const currentMetadata = getCurrentMetadata()

  // Calculate progress - ensure it starts at 0% and reaches 100% on final submission
  const getProgressWidth = () => {
    if (!evaluation || evaluation.totalItems === 0) {
      return 0
    }

    // If current item is submitted, show progress as if we've completed this question
    // Otherwise, show progress based on position (currentItem - 1)
    const isCurrentSubmitted = submittedItems.has(currentItem)
    const progressPosition = isCurrentSubmitted ? currentItem : currentItem - 1
    const progress = (progressPosition / evaluation.totalItems) * 100

    return progress
  }

  const progressWidth = getProgressWidth()

  // Actions for PageLayout (matching preview page)
  const actions = (
    <div className="flex space-x-3">
      {/* Instructions Toggle Button */}
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className={`inline-flex items-center px-4 py-2 border ${
          showInstructions ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
        } shadow-sm text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none transition-colors`}
        aria-label={showInstructions ? "Hide instructions" : "Show instructions"}
        title="Toggle instructions"
      >
        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Instructions
      </button>

      {/* Exit Button */}
      <button
        onClick={() => {
          // Save current item position before exiting
          const participantId = searchParams.get('participant')
          const progressKey = participantId 
            ? `evaluation_${taskId}_reviewer_${participantId}_progress`
            : `evaluation_${taskId}_progress` // Fallback for backwards compatibility
          const currentProgress = { furthestItem: Math.max(currentItem, furthestItemReached) }
          
          try {
            // Save current form data first
            const storageKey = participantId 
              ? `evaluation_${taskId}_reviewer_${participantId}_responses`
              : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
            const updatedResponses = {
              ...allResponses,
              [currentItem]: formData,
            }
            localStorage.setItem(storageKey, JSON.stringify(updatedResponses))
            
            // Then save progress
            localStorage.setItem(progressKey, JSON.stringify(currentProgress))
            console.log(`[exitEvaluation] Saved current progress before exit: ${JSON.stringify(currentProgress)}`)
          } catch (error) {
            console.error('[exitEvaluation] Error saving progress before exit:', error)
          }
          
          const from = searchParams.get('from')
          const participant = searchParams.get('participant')
          
          if (from === 'data-scientist') {
            router.push("/data-scientist")
          } else if (participant) {
            // If we have a participant ID, go back to reviewer page with that ID
            router.push(`/reviewer?participant=${participant}`)
          } else if (from === 'reviewer') {
            // Explicit from=reviewer parameter, go back to reviewer page
            router.push("/reviewer")
          } else {
            // Default fallback - go back to reviewer page
            router.push("/reviewer")
          }
        }}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Exit
      </button>
    </div>
  )

  const isCurrentItemSubmitted = submittedItems.has(currentItem)
  const canSubmit = isFormValid && (!isCurrentItemSubmitted || isCurrentFormModified)

  return (
    <PageLayout title={evaluation.name} actions={actions}>
      <div ref={containerRef} className="relative flex" style={{ cursor: isDragging ? "col-resize" : "default" }}>
        {/* Left Column - Instructions and Review */}
        <div className="space-y-6 pr-4 pb-6" style={{ width: `${leftColumnWidth}%` }}>
          {/* Content for Review */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {Array.isArray(currentContent) && currentContent.length > 0 ? (
                <div 
                  className="space-y-4 overflow-y-auto pr-3 -mr-3"
                  style={{ 
                    maxHeight: currentMetadata.length > 0 
                      ? 'calc(100vh - 400px)' // Leave space for metadata card + padding
                      : 'calc(100vh - 274px)',  // More conservative with additional 24px bottom buffer
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#9ca3af #f3f4f6' // thumb: gray-400, track: gray-100
                  }}
                >
                  {currentContent.map((item, index) => (
                    <ContentRenderer key={index} content={item.content} title={generateInputTitle(item.name)} />
                  ))}
                </div>
              ) : (
                <div>
                  <ContentRenderer content="No content available" />
                </div>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          {currentMetadata.length > 0 && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-2 text-xs">
                  {currentMetadata.map((item, index) => (
                    <div key={index}>
                      <span className="font-medium text-gray-600">{item.name}:</span>
                      <span className="ml-2 text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resizable Divider */}
        <div className="relative group" style={{ cursor: "col-resize" }}>
          <div
            className="absolute inset-y-0 w-4 -left-2 flex items-center justify-center cursor-col-resize"
            onMouseDown={handleMouseDown}
          >
            <div
              className="h-full w-1 bg-transparent group-hover:bg-indigo-400 transition-colors duration-200"
              style={{ backgroundColor: isDragging ? "rgb(79 70 229)" : "" }}
            ></div>
          </div>
        </div>

        {/* Right Column - Evaluation Form */}
        <div className="pl-4" style={{ width: `${100 - leftColumnWidth}%` }}>
          {/* Instructions Panel - conditionally rendered */}
          {showInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg leading-6 font-medium text-blue-900">Instructions</h3>
                </div>
                <p className="text-sm text-blue-800">{evaluation.instructions}</p>
              </div>
            </div>
          )}

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 relative">
              {/* Heading and navigation on the same line */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Evaluation</h3>
                
                {/* Navigation unit */}
                <div className="flex items-center space-x-3 flex-shrink-0 -mr-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentItem > 1) {
                        // Save current responses before navigating
                        setAllResponses((prev) => ({
                          ...prev,
                          [currentItem]: formData,
                        }))
                        setCurrentItem(currentItem - 1)
                      }
                    }}
                    disabled={currentItem <= 1}
                    className={`p-1 rounded-md ${
                      currentItem <= 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="text-sm text-gray-600 whitespace-nowrap flex-shrink-0">
                      {currentItem} of {evaluation.totalItems}
                    </div>
                    <div className="flex-1 min-w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${progressWidth}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentItem < evaluation.totalItems && currentItem < furthestItemReached) {
                        // Save current responses before navigating
                        setAllResponses((prev) => ({
                          ...prev,
                          [currentItem]: formData,
                        }))
                        setCurrentItem(currentItem + 1)
                      }
                    }}
                    disabled={currentItem >= evaluation.totalItems || currentItem >= furthestItemReached}
                    className={`p-1 rounded-md ${
                      currentItem >= evaluation.totalItems || currentItem >= furthestItemReached
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {evaluation.criteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-3">
                    <div className="flex items-center">
                      <label className="block text-sm font-semibold text-gray-700">
                        {criterion.name}
                        {criterion.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>

                    {criterion.type === "yes-no" && (
                      <div className="flex flex-wrap gap-2">
                        {criterion.options.map((option: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleInputChange(criterion.id, option)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                              formData[`criterion-${criterion.id}`] === option
                                ? isReviewComplete 
                                  ? "bg-gray-500 text-white border-gray-500"
                                  : "bg-blue-500 text-white border-blue-500"
                                : isReviewComplete
                                  ? "bg-gray-100 text-gray-500 border-gray-300"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                            disabled={isReviewComplete}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {criterion.type === "likert-scale" && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">{criterion.likertLabels?.low || "Low"}</span>
                          <span className="text-xs text-gray-500">{criterion.likertLabels?.high || "High"}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((number) => (
                            <button
                              key={number}
                              type="button"
                              onClick={() => handleInputChange(criterion.id, number.toString())}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                                formData[`criterion-${criterion.id}`] === number.toString()
                                  ? isReviewComplete 
                                    ? "bg-gray-500 text-white border-gray-500"
                                    : "bg-blue-500 text-white border-blue-500"
                                  : isReviewComplete
                                    ? "bg-gray-100 text-gray-500 border-gray-300"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
                              disabled={isReviewComplete}
                            >
                              {number}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {criterion.type === "custom-list" && (
                      <div className="flex flex-wrap gap-2">
                        {criterion.options.map((option: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleInputChange(criterion.id, option)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                              formData[`criterion-${criterion.id}`] === option
                                ? isReviewComplete 
                                  ? "bg-gray-500 text-white border-gray-500"
                                  : "bg-blue-500 text-white border-blue-500"
                                : isReviewComplete
                                  ? "bg-gray-100 text-gray-500 border-gray-300"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                            disabled={isReviewComplete}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {criterion.type === "text-input" && (
                      <textarea
                        rows={3}
                        value={formData[`criterion-${criterion.id}`] || ""}
                        onChange={(e) => handleInputChange(criterion.id, e.target.value)}
                        className={`block w-full border rounded-md shadow-sm sm:text-sm px-3 py-1.5 ${
                          isReviewComplete
                            ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                        placeholder={`Enter ${criterion.name.toLowerCase()}...`}
                        disabled={isReviewComplete}
                      />
                    )}
                  </div>
                ))}
              </form>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    canSubmit && !isSubmitting
                      ? "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      Submit
                      <svg
                        className="ml-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </>
                  ) : isReviewComplete && !isCurrentFormModified ? (
                    "Review Complete"
                  ) : (
                    <>
                      Submit
                      <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
                
                {/* Completion message */}
                {isReviewComplete && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-md">
                      <svg className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">
                        Thank you! Your evaluation has been completed successfully.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
