import { useState, useEffect } from 'react'

interface Evaluation {
  id: number
  name: string
  status: 'draft' | 'active' | 'completed'
  createdAt: string
  completedAt?: string
  data: any[]
  totalItems: number
}

export function useDataScientistDataInitialization() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load evaluations on component mount and set up periodic checks
  useEffect(() => {
    const loadEvaluations = () => {
      try {
        const storedEvaluations = localStorage.getItem("evaluations")
        if (storedEvaluations) {
          const parsedEvaluations = JSON.parse(storedEvaluations)
          setEvaluations(parsedEvaluations)
        }
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading evaluations:", error)
        setError("Failed to load evaluations")
        setIsLoading(false)
      }
    }

    // Initial load
    loadEvaluations()

    // Listen for evaluation completion events
    const handleEvaluationCompleted = () => {
      console.log('[useDataScientistDataInitialization] Evaluation completed event received, reloading evaluations')
      loadEvaluations()
    }

    window.addEventListener('evaluationCompleted', handleEvaluationCompleted)

    // Set up periodic check every 3 seconds for completion updates
    const intervalId = setInterval(async () => {
      console.log('[useDataScientistDataInitialization] Periodic completion check triggered')
      const updatedCount = await forceCheckAllEvaluationCompletions()
      if (updatedCount > 0) {
        console.log(`[useDataScientistDataInitialization] ${updatedCount} evaluation(s) updated, reloading data`)
        loadEvaluations()
      }
    }, 3000)

    return () => {
      window.removeEventListener('evaluationCompleted', handleEvaluationCompleted)
      clearInterval(intervalId)
    }
  }, [])

  // Force check all evaluations for completion (comprehensive check)
  const forceCheckAllEvaluationCompletions = async () => {
    try {
      console.log('[forceCheckAllEvaluationCompletions] Starting comprehensive completion check');
      const allEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]");
      const allReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]");
      
      let updatedCount = 0;
      let hasReviewerUpdates = false;
      
      for (const evaluation of allEvaluations) {
        // Check all evaluations, not just active ones
        if (evaluation.status !== "completed") {
          const assignedReviewers = allReviewers.filter(
            (reviewer: any) => reviewer.evaluationId === evaluation.id.toString() || reviewer.evaluationId === evaluation.id
          );
          
          if (assignedReviewers.length > 0) {
            // Check completion using individual reviewer status only (fixed bug where global completions affected all reviewers)
            const allCompleted = assignedReviewers.every((reviewer: any) => {
              // Individual reviewer is completed if they have completed all tasks OR are explicitly marked completed
              const completedByStatus = reviewer.status === "completed";
              const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0;
              
              const isComplete = completedByStatus || completedByCount;
              
              // Log detailed checking for debugging
              console.log(`[forceCheckAllEvaluationCompletions] Reviewer ${reviewer.name} for eval ${evaluation.id}:`, {
                status: reviewer.status,
                completedByStatus,
                completed: reviewer.completed,
                total: reviewer.total,
                completedByCount,
                isComplete
              });
              
              // Update reviewer status if they completed all tasks but status hasn't been updated
              if (completedByCount && reviewer.status !== "completed") {
                reviewer.status = "completed";
                hasReviewerUpdates = true;
                console.log(`[forceCheckAllEvaluationCompletions] Updated reviewer ${reviewer.name} to completed status (completed all tasks)`);
              }
              
              return isComplete;
            });
            
            if (allCompleted) {
              console.log(`[forceCheckAllEvaluationCompletions] Found completed evaluation: ${evaluation.name} (${evaluation.id})`);
              const wasUpdated = await updateEvaluationStatus(evaluation.id);
              if (wasUpdated) {
                updatedCount++;
              }
            }
          }
        }
      }
      
      // Save reviewer updates if any were made
      if (hasReviewerUpdates) {
        localStorage.setItem("evaluationReviewers", JSON.stringify(allReviewers));
        console.log(`[forceCheckAllEvaluationCompletions] Saved reviewer status updates`);
      }
      
      console.log(`[forceCheckAllEvaluationCompletions] Updated ${updatedCount} evaluation(s)`);
      return updatedCount;
    } catch (error) {
      console.error('[forceCheckAllEvaluationCompletions] Error during comprehensive check:', error);
      return 0;
    }
  }

  // Check if all assigned reviewers have completed an evaluation
  const checkIfEvaluationIsComplete = (evaluationId: number) => {
    try {
      // Get the evaluation reviewers for this evaluation
      const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
      const evaluationAssignedReviewers = evaluationReviewers.filter(
        (reviewer: any) => reviewer.evaluationId === evaluationId.toString() || reviewer.evaluationId === evaluationId
      )
      
      // If there are no assigned reviewers, evaluation is not complete
      if (evaluationAssignedReviewers.length === 0) {
        console.log(`[checkIfEvaluationIsComplete] No assigned reviewers found for evaluation ${evaluationId}`);
        return false
      }
      
      // Check if all assigned reviewers have completed their evaluations (individual status only)
      const allCompleted = evaluationAssignedReviewers.every((reviewer: any) => {
        // Individual reviewer is completed if they have completed all tasks OR are explicitly marked completed
        const completedByStatus = reviewer.status === "completed";
        const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0;
        
        const isComplete = completedByStatus || completedByCount;
        
        console.log(`[checkIfEvaluationIsComplete] Reviewer ${reviewer.name} for eval ${evaluationId}:`, {
          status: reviewer.status,
          completedByStatus,
          completed: reviewer.completed,
          total: reviewer.total, 
          completedByCount,
          isComplete
        });
        
        return isComplete;
      });
      
      // Log detailed completion information for debugging
      console.log(`[checkIfEvaluationIsComplete] Evaluation ${evaluationId}: ${allCompleted ? 'Complete' : 'Incomplete'}. 
        ${evaluationAssignedReviewers.length} reviewers, 
        ${evaluationAssignedReviewers.filter((r: any) => r.status === "completed").length} completed by status,
        ${evaluationAssignedReviewers.filter((r: any) => r.completed === r.total && r.total > 0).length} completed by count`)
      
      return allCompleted
    } catch (error) {
      console.error(`[checkIfEvaluationIsComplete] Error checking evaluation ${evaluationId} completion:`, error)
      return false
    }
  }

  // Update the evaluation status in localStorage if all reviewers have completed it
  const updateEvaluationStatus = async (evaluationId: number) => {
    try {
      // Get the evaluation from localStorage
      const evaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      const evaluationIndex = evaluations.findIndex((e: any) => e.id === evaluationId)
      
      if (evaluationIndex === -1) {
        console.error(`[updateEvaluationStatus] Evaluation ${evaluationId} not found`)
        return false
      }
      
      // Check if all reviewers have completed this evaluation
      const isComplete = checkIfEvaluationIsComplete(evaluationId)
      
      // If all reviewers have completed and the evaluation is not already marked as completed
      if (isComplete && evaluations[evaluationIndex].status !== "completed") {
        // Update the evaluation status and set completion date
        evaluations[evaluationIndex].status = "completed"
        evaluations[evaluationIndex].completedAt = new Date().toISOString()
        
        // Save back to localStorage
        localStorage.setItem("evaluations", JSON.stringify(evaluations))
        console.log(`[updateEvaluationStatus] Updated evaluation ${evaluationId} status to completed`)
        
        // Return true to indicate an update was made
        return true
      }
      
      // No update was made
      return false
    } catch (error) {
      console.error(`[updateEvaluationStatus] Error updating evaluation ${evaluationId} status:`, error)
      return false
    }
  }

  return {
    evaluations,
    isLoading,
    error,
    forceCheckAllEvaluationCompletions,
    checkIfEvaluationIsComplete,
    updateEvaluationStatus
  }
}
