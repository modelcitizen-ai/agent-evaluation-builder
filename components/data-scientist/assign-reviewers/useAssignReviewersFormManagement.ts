import { useState } from "react"
import { getEvaluations, updateEvaluation } from "@/lib/client-db"
import { addReviewer, removeReviewer } from "@/lib/client-db"

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

interface UseAssignReviewersFormManagementProps {
  reviewers: Reviewer[]
  setReviewers: (reviewers: Reviewer[]) => void
  currentEvaluationId: string | null
  uploadedReviewers: UploadedReviewer[]
  setUploadedReviewers: (reviewers: UploadedReviewer[]) => void
  generateUniqueLink: (reviewerId: string) => string
  clearFileInput?: () => void
}

interface UseAssignReviewersFormManagementReturn {
  // Form state
  reviewerName: string
  setReviewerName: (name: string) => void
  reviewerEmail: string
  setReviewerEmail: (email: string) => void
  reviewerNotes: string
  setReviewerNotes: (notes: string) => void
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  
  // Handler functions
  handleGenerateLink: (e: React.FormEvent) => Promise<void>
  handleBulkAdd: () => Promise<void>
  handleRemoveReviewer: (reviewerId: string) => void
}

export function useAssignReviewersFormManagement({
  reviewers,
  setReviewers,
  currentEvaluationId,
  uploadedReviewers,
  setUploadedReviewers,
  generateUniqueLink,
  clearFileInput,
}: UseAssignReviewersFormManagementProps): UseAssignReviewersFormManagementReturn {
  // Form state
  const [reviewerName, setReviewerName] = useState("")
  const [reviewerEmail, setReviewerEmail] = useState("")
  const [reviewerNotes, setReviewerNotes] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewerName.trim()) return

    setIsGenerating(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const reviewerId = Date.now().toString()
      const newReviewer: Reviewer = {
        id: reviewerId,
        name: reviewerName.trim(),
        email: reviewerEmail.trim(),
        notes: "", // Set to empty since notes input was removed
        link: generateUniqueLink(reviewerId),
        createdAt: new Date().toISOString(),
        evaluationId: currentEvaluationId || "",
      }

      // Get the actual total items from the current evaluation
      const evaluations = await getEvaluations()
      const currentEvaluation = evaluations.find((evaluation: any) => evaluation.id.toString() === currentEvaluationId)
      let totalItems = currentEvaluation?.totalItems || 10 // Fallback to 10 if evaluation not found
      
      const progressReviewer = {
        id: reviewerId,
        name: newReviewer.name,
        email: newReviewer.email || `${newReviewer.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        status: "active",
        completed: 0,
        total: totalItems, // Use full dataset total items
        avgTime: 0,
        evaluationId: parseInt(currentEvaluationId || "0"), // Convert to number for API
      }

      // Add reviewer to database
      await addReviewer(progressReviewer)
      
      // Update local state
      setReviewers([newReviewer, ...reviewers])

      // Update evaluation status to "active" when first reviewer is added
      if (reviewers.length === 0) {
        await updateEvaluation(parseInt(currentEvaluationId || "0"), { status: "active" })
      }

      // Clear form
      setReviewerName("")
      setReviewerEmail("")
    } catch (error) {
      console.error("Error adding reviewer:", error)
    }

    setIsGenerating(false)
  }

  const handleBulkAdd = async () => {
    if (uploadedReviewers.length === 0) return

    setIsGenerating(true)

    try {
      // Get current evaluation for total items
      const evaluations = await getEvaluations()
      const currentEvaluation = evaluations.find((evaluation: any) => evaluation.id.toString() === currentEvaluationId)
      const totalItems = currentEvaluation?.totalItems || 10

      // Add all uploaded reviewers
      const newReviewers: Reviewer[] = uploadedReviewers.map((uploaded, index) => {
        const reviewerId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
        
        return {
          id: reviewerId,
          name: uploaded.ReviewerName,
          email: uploaded.Email,
          notes: '',
          link: generateUniqueLink(reviewerId),
          createdAt: new Date().toISOString(),
          evaluationId: currentEvaluationId || "",
        }
      })

      // Add all reviewers to database
      for (const reviewer of newReviewers) {
        const progressReviewer = {
          id: reviewer.id,
          name: reviewer.name,
          email: reviewer.email || `${reviewer.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
          status: "active",
          completed: 0,
          total: totalItems,
          avgTime: 0,
          evaluationId: parseInt(currentEvaluationId || "0"),
        }
        
        await addReviewer(progressReviewer)
      }

      // Update local state
      setReviewers([...newReviewers, ...reviewers])

      // Update evaluation status to "active" when reviewers are added
      if (reviewers.length === 0) {
        await updateEvaluation(parseInt(currentEvaluationId || "0"), { status: "active" })
      }

      // Clear uploaded data
      setUploadedReviewers([])
      if (clearFileInput) {
        clearFileInput()
      }
    } catch (error) {
      console.error("Error bulk adding reviewers:", error)
    }

    setIsGenerating(false)
  }

  const handleRemoveReviewer = async (reviewerId: string) => {
    try {
      // Remove from database
      await removeReviewer(reviewerId)
      
      // Update local state
      setReviewers(reviewers.filter(r => r.id !== reviewerId))
    } catch (error) {
      console.error("Error removing reviewer:", error)
    }
  }

  return {
    // Form state
    reviewerName,
    setReviewerName,
    reviewerEmail,
    setReviewerEmail,
    reviewerNotes,
    setReviewerNotes,
    isGenerating,
    setIsGenerating,
    
    // Handler functions
    handleGenerateLink,
    handleBulkAdd,
    handleRemoveReviewer,
  }
}
