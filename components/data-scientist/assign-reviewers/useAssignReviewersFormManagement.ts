import { useState } from "react"

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

    // Simulate API call
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

    setReviewers([newReviewer, ...reviewers])

    // Add reviewer to evaluationReviewers for progress tracking
    const existingReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
    
    // Get the actual total items from the current evaluation
    const storedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
    const currentEvaluation = storedEvaluations.find((evaluation: any) => evaluation.id.toString() === currentEvaluationId)
    let totalItems = currentEvaluation?.totalItems || 10 // Fallback to 10 if evaluation not found
    
    const progressReviewer = {
      id: reviewerId,
      name: newReviewer.name,
      email: newReviewer.email || `${newReviewer.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      status: "active",
      completed: 0,
      total: totalItems, // Use full dataset total items
      avgTime: 0,
      evaluationId: currentEvaluationId || "1234567890", // Use current evaluation ID
    }

    // Filter reviewers by evaluation ID and add new reviewer to the beginning of current evaluation's reviewers
    const otherEvaluationReviewers = existingReviewers.filter((r: any) => r.evaluationId !== currentEvaluationId)
    const currentEvaluationReviewers = existingReviewers.filter((r: any) => r.evaluationId === currentEvaluationId)
    currentEvaluationReviewers.unshift(progressReviewer)
    
    const updatedReviewers = [...otherEvaluationReviewers, ...currentEvaluationReviewers]
    localStorage.setItem("evaluationReviewers", JSON.stringify(updatedReviewers))

    // Update evaluation status to "active" when first reviewer is added
    if (reviewers.length === 0) {
      // This will be the first reviewer
      const storedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      const updatedEvaluations = storedEvaluations.map((evaluation: any) => {
        if (evaluation.id.toString() === currentEvaluationId) {
          return { ...evaluation, status: "active" }
        }
        return evaluation
      })
      localStorage.setItem("evaluations", JSON.stringify(updatedEvaluations))
    }

    // Clear form
    setReviewerName("")
    setReviewerEmail("")

    setIsGenerating(false)
  }

  const handleBulkAdd = async () => {
    if (uploadedReviewers.length === 0) return

    setIsGenerating(true)

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

    setReviewers([...newReviewers, ...reviewers])

    // Add to evaluationReviewers for progress tracking
    const existingReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
    const storedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
    const currentEvaluation = storedEvaluations.find((evaluation: any) => evaluation.id.toString() === currentEvaluationId)
    const totalItems = currentEvaluation?.totalItems || 10

    const progressReviewers = newReviewers.map(reviewer => {
      let totalItems = currentEvaluation?.totalItems || 10
      
      return {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email || `${reviewer.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        status: "active",
        completed: 0,
        total: totalItems,
        avgTime: 0,
        evaluationId: currentEvaluationId || "1234567890",
      }
    })

    // Filter reviewers by evaluation ID and add new reviewers to the beginning of current evaluation's reviewers
    const otherEvaluationReviewers = existingReviewers.filter((r: any) => r.evaluationId !== currentEvaluationId)
    const currentEvaluationReviewers = existingReviewers.filter((r: any) => r.evaluationId === currentEvaluationId)
    currentEvaluationReviewers.unshift(...progressReviewers)
    
    const updatedReviewers = [...otherEvaluationReviewers, ...currentEvaluationReviewers]
    localStorage.setItem("evaluationReviewers", JSON.stringify(updatedReviewers))

    // Update evaluation status to "active" when reviewers are added
    if (reviewers.length === 0) {
      const updatedEvaluations = storedEvaluations.map((evaluation: any) => {
        if (evaluation.id.toString() === currentEvaluationId) {
          return { ...evaluation, status: "active" }
        }
        return evaluation
      })
      localStorage.setItem("evaluations", JSON.stringify(updatedEvaluations))
    }

    // Clear uploaded data
    setUploadedReviewers([])
    if (clearFileInput) {
      clearFileInput()
    }

    setIsGenerating(false)
  }

  const handleRemoveReviewer = (reviewerId: string) => {
    setReviewers(reviewers.filter(r => r.id !== reviewerId))
    
    // Also remove from evaluationReviewers
    const existingReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
    const updatedReviewers = existingReviewers.filter((r: any) => r.id !== reviewerId)
    localStorage.setItem("evaluationReviewers", JSON.stringify(updatedReviewers))
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
