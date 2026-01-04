import { useState, useEffect } from "react"
import { getEvaluations } from "@/lib/client-db"
import { getReviewers, addReviewer, updateReviewer } from "@/lib/client-db"

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

  // Initialize evaluation ID from URL params or database
  useEffect(() => {
    const initializeEvaluationId = async () => {
      // Try to get evaluation ID from URL params first (if coming from edit mode)
      const urlParams = new URLSearchParams(window.location.search)
      const evalId = urlParams.get("evaluationId")

      if (evalId) {
        setCurrentEvaluationId(evalId)
      } else {
        // Fallback: get the most recent evaluation from database
        try {
          const evaluations = await getEvaluations()
          if (evaluations.length > 0) {
            setCurrentEvaluationId(evaluations[0].id.toString())
          }
        } catch (error) {
          console.error("Error loading evaluations:", error)
        }
      }
    }

    initializeEvaluationId()
  }, [])

  // Helper function to generate unique links
  const generateUniqueLink = (reviewerId: string) => {
    // Generate link to reviewer dashboard where reviewers can see their assigned evaluations
    return `${window.location.origin}/reviewer?participant=${reviewerId}`
  }

  // Load existing reviewers for the current evaluation
  useEffect(() => {
    if (currentEvaluationId) {
      const loadReviewers = async () => {
        try {
          const existingReviewers = await getReviewers(parseInt(currentEvaluationId))
          
          // Add the generated link to each reviewer since it's not stored in DB
          const reviewersWithLinks = existingReviewers.map((r: any) => ({
            ...r,
            link: generateUniqueLink(r.id)
          }))
          
          setReviewers(reviewersWithLinks)
        } catch (error) {
          console.error("Error loading reviewers:", error)
        }
      }
      
      loadReviewers()
    }
  }, [currentEvaluationId])

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
