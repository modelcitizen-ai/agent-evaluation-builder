import { useState, useEffect } from "react"

interface Reviewer {
  id: string
  name: string
  email: string
  notes: string
  link: string
  createdAt: string
  evaluationId: string
}

interface UploadedReviewer {
  ReviewerName: string
  Email: string
}

interface UseAssignReviewersDataInitializationProps {
  // No props needed - manages its own initialization
}

interface UseAssignReviewersDataInitializationReturn {
  // State
  reviewers: Reviewer[]
  setReviewers: (reviewers: Reviewer[]) => void
  currentEvaluationId: string | null
  setCurrentEvaluationId: (id: string | null) => void
  uploadedReviewers: UploadedReviewer[]
  setUploadedReviewers: (reviewers: UploadedReviewer[]) => void
  
  // Helper functions
  generateUniqueLink: (reviewerId: string) => string
}

export function useAssignReviewersDataInitialization({}: UseAssignReviewersDataInitializationProps = {}): UseAssignReviewersDataInitializationReturn {
  // Core state
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [currentEvaluationId, setCurrentEvaluationId] = useState<string | null>(null)
  const [uploadedReviewers, setUploadedReviewers] = useState<UploadedReviewer[]>([])

  // Initialize evaluation ID from URL params or localStorage
  useEffect(() => {
    // Try to get evaluation ID from URL params first (if coming from edit mode)
    const urlParams = new URLSearchParams(window.location.search)
    const evalId = urlParams.get("evaluationId")

    if (evalId) {
      setCurrentEvaluationId(evalId)
    } else {
      // Fallback: get the most recent evaluation from localStorage
      const storedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      if (storedEvaluations.length > 0) {
        setCurrentEvaluationId(storedEvaluations[0].id.toString())
      }
    }
  }, [])

  // Load existing reviewers for the current evaluation
  useEffect(() => {
    if (currentEvaluationId) {
      const existingReviewers = JSON.parse(localStorage.getItem(`evaluation_${currentEvaluationId}_reviewers`) || "[]")
      setReviewers(existingReviewers)
    }
  }, [currentEvaluationId])

  // Save reviewers to localStorage whenever they change
  useEffect(() => {
    if (currentEvaluationId && reviewers.length > 0) {
      localStorage.setItem(`evaluation_${currentEvaluationId}_reviewers`, JSON.stringify(reviewers))
    }
  }, [reviewers, currentEvaluationId])

  // Helper function to generate unique links
  const generateUniqueLink = (reviewerId: string) => {
    // Generate link to reviewer dashboard where reviewers can see their assigned evaluations
    return `${window.location.origin}/reviewer?participant=${reviewerId}`
  }

  return {
    // State
    reviewers,
    setReviewers,
    currentEvaluationId,
    setCurrentEvaluationId,
    uploadedReviewers,
    setUploadedReviewers,
    
    // Helper functions
    generateUniqueLink,
  }
}
