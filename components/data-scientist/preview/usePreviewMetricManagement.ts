import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createEvaluation } from "@/lib/client-db"
import { initializeEmptyResultsDataset, saveResultsDataset } from "@/lib/results-dataset"

interface Metric {
  id: number
  name: string
  type: string
  options: string[]
  required: boolean
  likertLabels?: { low: string; high: string }
  aiGenerated?: boolean
}

interface DeletedMetric {
  metric: Metric
  index: number
}

interface AIAnalysisResult {
  columnAnalysis: Array<{
    columnName: string
    suggestedRole: "Input Data" | "Model Output" | "Excluded Data" | "Metadata"
    confidence: number
    reasoning: string
  }>
  suggestedMetrics: Array<{
    name: string
    type: "yes-no" | "likert-scale" | "custom-list" | "text-input"
    options: string[]
    reasoning: string
    confidence: number
    required: boolean
    likertLabels?: { low: string; high: string }
  }>
  evaluationName: string
  instructions: string
}

interface UsePreviewMetricManagementProps {
  criteria: Metric[]
  setCriteria: (criteria: Metric[]) => void
  evaluationName: string
  instructions: string
  columnRoles: any[]
  uploadedData: any[]
  previewData: any[]
  isEditMode: boolean
  editId: number | null
  getTotalItems: () => number
  setIsSaving: (saving: boolean) => void
  randomizationEnabled: boolean
}

interface UsePreviewMetricManagementReturn {
  // Metric editing state
  editingMetric: Metric | null
  setEditingMetric: (metric: Metric | null) => void
  isEditModalOpen: boolean
  setIsEditModalOpen: (open: boolean) => void
  
  // AI analysis state
  aiAnalysisResult: AIAnalysisResult | null
  setAiAnalysisResult: (result: AIAnalysisResult | null) => void
  
  // Undo functionality
  lastDeletedMetric: DeletedMetric | null
  setLastDeletedMetric: (deleted: DeletedMetric | null) => void
  
  // Metric manipulation handlers
  handleEditMetric: (metricId: number) => void
  handleAddMetric: () => void
  handleSaveMetric: (updatedMetric: Metric) => void
  handleEditMetricSave: (updatedMetric: Metric) => void
  handleCloseEditModal: () => void
  handleDeleteMetric: (metricId: number) => void
  handleUndoDelete: () => void
  moveMetric: (metricId: number, direction: "up" | "down") => void
  
  // Save evaluation handler
  handleSaveEvaluation: () => Promise<void>
}

export function usePreviewMetricManagement({
  criteria,
  setCriteria,
  evaluationName,
  instructions,
  columnRoles,
  uploadedData,
  previewData,
  isEditMode,
  editId,
  getTotalItems,
  setIsSaving,
  randomizationEnabled,
}: UsePreviewMetricManagementProps): UsePreviewMetricManagementReturn {
  const router = useRouter()

  // Metric editing state
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  
  // AI analysis state
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null)
  
  // Undo functionality
  const [lastDeletedMetric, setLastDeletedMetric] = useState<DeletedMetric | null>(null)

  // Keyboard event listener for undo functionality
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault()
        handleUndoDelete()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [lastDeletedMetric, criteria])

  const handleEditMetric = (metricId: number) => {
    const metric = criteria.find((m) => m.id === metricId)
    if (metric) {
      setEditingMetric(metric)
      setIsEditModalOpen(true)
    }
  }

  const handleAddMetric = () => {
    const newId = criteria.length > 0 ? Math.max(...criteria.map((m) => m.id)) + 1 : 1
    const newMetric: Metric = {
      id: newId,
      name: "",
      type: "yes-no",
      options: ["Yes", "No"],
      required: false,
    }
    setEditingMetric(newMetric)
    setIsEditModalOpen(true)
  }

  const handleSaveMetric = (updatedMetric: Metric) => {
    const existingMetricIndex = criteria.findIndex((m) => m.id === updatedMetric.id)

    if (existingMetricIndex >= 0) {
      // Update existing metric
      setCriteria(criteria.map((m) => (m.id === updatedMetric.id ? updatedMetric : m)))
    } else {
      // Add new metric
      setCriteria([...criteria, updatedMetric])
    }

    setIsEditModalOpen(false)
    setEditingMetric(null)
  }

  // Handler to update a metric in the criteria array
  const handleEditMetricSave = (updatedMetric: Metric) => {
    setCriteria(
      criteria.map((metric) =>
        metric.id === updatedMetric.id ? { ...metric, ...updatedMetric } : metric
      )
    )
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingMetric(null)
  }

  const handleDeleteMetric = (metricId: number) => {
    const metricIndex = criteria.findIndex((metric) => metric.id === metricId)
    if (metricIndex === -1) return

    const metricToDelete = criteria[metricIndex]

    // Store the deleted metric for potential undo
    setLastDeletedMetric({
      metric: metricToDelete,
      index: metricIndex,
    })

    // Remove the metric immediately
    setCriteria(criteria.filter((metric) => metric.id !== metricId))
  }

  const handleUndoDelete = () => {
    if (!lastDeletedMetric) return

    const newCriteria = [...criteria]
    newCriteria.splice(lastDeletedMetric.index, 0, lastDeletedMetric.metric)
    setCriteria(newCriteria)
    setLastDeletedMetric(null)
  }

  const moveMetric = (metricId: number, direction: "up" | "down") => {
    const index = criteria.findIndex((m) => m.id === metricId)
    if (index === -1) return

    // Can't move first item up or last item down
    if ((direction === "up" && index === 0) || (direction === "down" && index === criteria.length - 1)) {
      return
    }

    const newCriteria = [...criteria]
    const targetIndex = direction === "up" ? index - 1 : index + 1

    // Swap the items
    ;[newCriteria[index], newCriteria[targetIndex]] = [newCriteria[targetIndex], newCriteria[index]]

    setCriteria(newCriteria)
  }

  // Save evaluation function
  const handleSaveEvaluation = async () => {
    setIsSaving(true)

    try {
      const existingEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      const dataToUse = uploadedData.length > 0 ? uploadedData : previewData

      if (isEditMode && editId) {
        // Update existing evaluation
        const updatedEvaluations = existingEvaluations.map((evaluation: any) =>
          evaluation.id === editId
            ? {
                ...evaluation,
                name: evaluationName,
                instructions,
                criteria,
                columnRoles,
                data: dataToUse,
                totalItems: getTotalItems(),
                randomizationEnabled,
              }
            : evaluation,
        )
        localStorage.setItem("evaluations", JSON.stringify(updatedEvaluations))
      } else {
        // Create new evaluation
        const evaluationId = Date.now()
        const newEvaluation = {
          id: evaluationId,
          name: evaluationName,
          instructions,
          criteria,
          columnRoles,
          data: dataToUse,
          totalItems: getTotalItems(),
          randomizationEnabled,
          status: "draft",
          createdAt: new Date().toISOString(),
        }

        try {
          // First try to save to database via API
          const result = await createEvaluation(newEvaluation)
          console.log("Evaluation created successfully:", result)
          
          // Also add to localStorage so it shows up in My Projects immediately
          existingEvaluations.unshift(newEvaluation)
          localStorage.setItem("evaluations", JSON.stringify(existingEvaluations))
        } catch (error) {
          console.error("Error creating evaluation in database:", error)
          // Fall back to localStorage if database creation fails
          console.log("Falling back to localStorage")
          existingEvaluations.unshift(newEvaluation)
          localStorage.setItem("evaluations", JSON.stringify(existingEvaluations))
        }

        // Initialize empty results dataset for this evaluation
        const resultsDataset = initializeEmptyResultsDataset(evaluationId, evaluationName, dataToUse, criteria)
        saveResultsDataset(resultsDataset)

        // Clear session storage only for new evaluations
        sessionStorage.removeItem("uploadedData")
        sessionStorage.removeItem("fileName")
        sessionStorage.removeItem("aiAnalysisResult")
        sessionStorage.removeItem("useAIAnalysis")
      }

      // Redirect to data scientist dashboard without confirmation
      router.push("/data-scientist")
    } catch (error) {
      console.error("Error saving evaluation:", error)
      alert("Error saving evaluation. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return {
    // Metric editing state
    editingMetric,
    setEditingMetric,
    isEditModalOpen,
    setIsEditModalOpen,
    
    // AI analysis state
    aiAnalysisResult,
    setAiAnalysisResult,
    
    // Undo functionality
    lastDeletedMetric,
    setLastDeletedMetric,
    
    // Metric manipulation handlers
    handleEditMetric,
    handleAddMetric,
    handleSaveMetric,
    handleEditMetricSave,
    handleCloseEditModal,
    handleDeleteMetric,
    handleUndoDelete,
    moveMetric,
    
    // Save evaluation handler
    handleSaveEvaluation,
  }
}
