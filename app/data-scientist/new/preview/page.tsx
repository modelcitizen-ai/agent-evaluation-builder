"use client"

import type React from "react"

import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowRightIcon,
  CogIcon,
  PencilIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import EditMetricModal from "@/components/edit-metric-modal"
import ConfigureDatasetModal from "@/components/configure-dataset-modal"
import ContentRenderer from "@/components/content-renderer"
import TableCellRenderer from "@/components/table-cell-renderer"
import { createEvaluation } from "@/lib/client-db"
import { usePreviewDataInitialization } from "@/components/data-scientist/preview/usePreviewDataInitialization"
import { usePreviewFormNavigation } from "@/components/data-scientist/preview/usePreviewFormNavigation"

// Import the results dataset utilities at the top of the file
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

interface ColumnRole {
  id: string
  name: string
  suggestedRole: string
  confidence: number
  reason: string
  userRole: "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded" | "Input Data"
  displayName?: string
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

/**
 * IMPORTANT: The evaluationName is now a single source of truth from the backend API.
 * - Do NOT generate, clean, or fallback the evaluation name in the frontend.
 * - Always use the evaluationName returned from the API (AI or fallback).
 * - This eliminates bugs and duplication. See /app/api/analyze-data/route.ts for naming logic.
 */

export default function PreviewPage() {
  const router = useRouter()
  const params = useParams()

  // Detect if we're in edit mode
  const isEditMode = params?.id !== undefined
  const editId = params?.id ? Number(params.id) : null

  // Track evaluation name editing state
  const [evaluationNameEdited, setEvaluationNameEdited] = useState(false)

  // Use the data initialization hook
  const {
    uploadedData,
    dataColumns,
    evaluationName,
    instructions,
    criteria,
    columnRoles,
    setEvaluationName,
    setInstructions,
    setCriteria,
    setColumnRoles,
    setUploadedData,
    setDataColumns,
  } = usePreviewDataInitialization({
    isEditMode,
    editId,
    evaluationNameEdited
  })

  // Use the form navigation hook
  const {
    currentItem,
    formData,
    isSubmitting,
    allResponses,
    submittedItems,
    furthestItemReached,
    isReviewComplete,
    isCurrentFormModified,
    isFormValid,
    handleSubmit,
    handleInputChange,
    saveCurrentResponse,
    setCurrentItem,
    setIsSubmitting,
    getTotalItems,
  } = usePreviewFormNavigation({
    criteria,
    uploadedData
  })

  const [editingMetric, setEditingMetric] = useState<Metric | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showDatasetConfig, setShowDatasetConfig] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastDeletedMetric, setLastDeletedMetric] = useState<DeletedMetric | null>(null)

  // Column resizing state
  const [leftColumnWidth, setLeftColumnWidth] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Near the top of the file, add a new state variable to track if we're coming from the upload page
  const [isComingFromUpload, setIsComingFromUpload] = useState(true)

  // Add a new state variable to track AI analysis preference
  const [useAIAnalysis, setUseAIAnalysis] = useState(false)

  // Add this with the other state variables
  // const [isInitialLoading, setIsInitialLoading] = useState(true)

  // Add this useEffect near the beginning of the component, after state declarations
  // Remove the useEffect for initial loading timer

  // Add keyboard event listener for undo functionality
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

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Add keyboard event listener for undo functionality
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

  // Sample data for preview
  const previewData =
    uploadedData.length > 0
      ? uploadedData
      : [
          {
            user_query: "How do I reset my password?",
            ai_response: "To reset your password, click on 'Forgot Password' on the login page and follow the instructions sent to your email.",
            category: "support",
            item_id: "item_001",
          },
          {
            user_query: "How do I reset my password?",
            ai_response: "You can reset your password by visiting our password reset page at example.com/reset and entering your email address.",
            category: "support", 
            item_id: "item_002",
          },
          {
            user_query: "How do I reset my password?",
            ai_response: "Password reset is simple! Just go to the login page, click 'Forgot Password', and we'll send you a reset link via email within minutes.",
            category: "support",
            item_id: "item_003",
          },
          {
            user_query: "What are your business hours?",
            ai_response: "Our business hours are Monday through Friday, 9 AM to 6 PM EST. We're closed on weekends and major holidays.",
            category: "general",
            item_id: "item_004",
          },
          {
            user_query: "What are your business hours?",
            ai_response: "We're open Monday-Friday from 9 AM to 6 PM Eastern Time. Weekend and holiday hours may vary.",
            category: "general",
            item_id: "item_005",
          },
          {
            user_query: "What are your business hours?",
            ai_response: "Our team is available to help you Monday through Friday, 9:00 AM to 6:00 PM EST. We're closed weekends and on major holidays.",
            category: "general",
            item_id: "item_006",
          },
          {
            user_query: "Can I return an item after 30 days?",
            ai_response: "Our standard return policy is 30 days from purchase. However, you may still be eligible for store credit depending on the item condition.",
            category: "returns",
            item_id: "item_007",
          },
          {
            user_query: "Can I return an item after 30 days?",
            ai_response: "Returns are typically accepted within 30 days, but we can offer store credit for items in good condition beyond that timeframe.",
            category: "returns",
            item_id: "item_008",
          },
          {
            user_query: "Can I return an item after 30 days?",
            ai_response: "While our standard policy is 30 days, we understand that sometimes life gets in the way. Contact us and we'll work with you to find a solution, possibly including store credit.",
            category: "returns",
            item_id: "item_009",
          },
        ]

  const generateInputTitle = (columnName: string) => {
    // Check if there's a custom display name for this column
    const columnConfig = columnRoles.find((col) => col.name === columnName)
    if (columnConfig?.displayName && columnConfig.displayName.trim()) {
      return columnConfig.displayName
    }

    // Fallback to formatted column name
    const formatted = columnName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    return formatted
  }

  const normalizeRole = (role: string): "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded" => {
    if (role === "Input Data" || role === "Input") return "Input";
    if (role === "Model Output" || role === "Output") return "Model Output";
    if (role === "Reference") return "Reference";
    if (role === "Excluded Data" || role === "Excluded") return "Excluded";
    return "Metadata";
  };

  const updateColumnRole = (
    columnId: string,
    newRole: "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded",
  ) => {
    setColumnRoles((prev) =>
      prev.map((col) => {
        if (col.id === columnId) {
          // Update reasoning based on new role
          let newReason = col.reason
          if (normalizeRole(col.userRole) !== newRole) {
            switch (newRole) {
              case "Input":
                newReason = "Manually set as input data for evaluation"
                break
              case "Model Output":
                newReason = "Manually set as model output data for evaluation"
                break
              case "Reference":
                newReason = "Manually set as reference data for evaluation"
                break
              case "Excluded":
                newReason = "Manually excluded from evaluation (may contain labels or sensitive information)"
                break
              case "Metadata":
                newReason = "Manually set as metadata (provides context but not directly evaluated)"
                break
            }
          }

          return {
            ...col,
            userRole: newRole,
            reason: newReason,
          }
        }
        return col
      }),
    )
  }

  const updateColumnDisplayName = (columnId: string, displayName: string) => {
    setColumnRoles((prev) =>
      prev.map((col) => {
        if (col.id === columnId) {
          return {
            ...col,
            displayName: displayName,
          }
        }
        return col
      }),
    )
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 bg-green-100"
    if (confidence >= 75) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-500"
    if (confidence >= 75) return "bg-yellow-500"
    return "bg-red-500"
  }

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
  function handleEditMetricSave(updatedMetric: Metric) {
    setCriteria((prev) =>
      prev.map((metric) =>
        metric.id === updatedMetric.id ? { ...metric, ...updatedMetric } : metric
      )
    );
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
          status: "draft",
          createdAt: new Date().toISOString(),
        }

        try {
          // First try to save to database via API
          const result = await createEvaluation(newEvaluation);
          console.log("Evaluation created successfully:", result);
          
          // Also add to localStorage so it shows up in My Projects immediately
          existingEvaluations.unshift(newEvaluation);
          localStorage.setItem("evaluations", JSON.stringify(existingEvaluations));
        } catch (error) {
          console.error("Error creating evaluation in database:", error);
          // Fall back to localStorage if database creation fails
          console.log("Falling back to localStorage");
          existingEvaluations.unshift(newEvaluation);
          localStorage.setItem("evaluations", JSON.stringify(existingEvaluations));
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

  // Function to get input column content
  const getInputColumnContent = () => {
    try {
      if (uploadedData.length === 0 && previewData.length === 0) return "No data available for preview."

      // Use uploaded data if available, otherwise use preview data
      const dataToUse = uploadedData.length > 0 ? uploadedData : previewData
      
      // Safety check for columnRoles
      if (!columnRoles || columnRoles.length === 0) {
        return "Column roles not yet configured. Please wait for analysis to complete."
      }
      
      const inputColumns = columnRoles.filter((role) => role.userRole === "Input" || role.userRole === "Model Output")

      if (inputColumns.length === 0)
        return "No input or model output columns identified. Please set at least one column as 'Input' or 'Model Output' in the Configure Dataset section."

      const currentRowIndex = (currentItem - 1) % dataToUse.length
      const currentRow = dataToUse[currentRowIndex]

      if (!currentRow) return "No content available for this item."

      // Always return array format for consistent rendering with labels
      return inputColumns.map((col) => ({
        name: col.name,
        content: currentRow[col.name] || "No content available",
        type: col.userRole,
      }))
    } catch (error) {
      console.error('Error in getInputColumnContent:', error)
      return "Error loading content. Please refresh the page."
    }
  }

  // Update the PageLayout to only render main content when not analyzing
  return (
    <PageLayout
      title={
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={evaluationName}
            onChange={(e) => {
              setEvaluationName(e.target.value)
              setEvaluationNameEdited(true)
            }}
            className="bg-transparent border-none text-2xl font-semibold text-gray-900 focus:outline-none focus:ring-0 p-0 m-0 min-w-0 flex-1"
          />
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 flex-shrink-0">
            Draft
          </span>
        </div>
      }
      actions={
        <div className="flex space-x-3">
          {/* Configure Dataset Button */}
          <button
            onClick={() => setShowDatasetConfig(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <CogIcon className="h-4 w-4 mr-2" />
            Configure Dataset
          </button>

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

          {/* Cancel Button */}
          <button
            onClick={() => router.push("/data-scientist")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
              isSaving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      }
    >
      {/* Error Banner */}
      {analysisError && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900">Azure OpenAI Analysis Issue</h3>
              <p className="text-sm text-yellow-700">{analysisError} Using fallback analysis instead.</p>
            </div>
          </div>
        </div>
      )}

      {/* Only show main content after analysis is ready; render a full-viewport loader while analyzing */}
      {columnRoles.length === 0 || criteria.length === 0 ? (
        <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center min-h-screen">
          {/* Animated Logo (copied from upload page for consistency) */}
          <div className="mb-8">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center relative animate-bounce">
                <div className="h-6 w-6 bg-white rounded-full animate-pulse"></div>
                <div className="absolute inset-0 animate-spin">
                  <div className="absolute top-1 right-1 h-3 w-3 bg-yellow-300 rounded-full animate-ping"></div>
                </div>
                <div className="absolute inset-0 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}>
                  <div className="absolute bottom-1 left-1 h-2 w-2 bg-pink-300 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute -top-2 -left-2 h-1.5 w-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute -bottom-2 -right-2 h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping opacity-20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-purple-200 animate-ping opacity-30" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Interpreting your Data...</h3>
            <p className="text-sm text-gray-600">This may take a few moments</p>
            <div className="flex justify-center mt-4 space-x-1">
              <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative flex animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{ cursor: isDragging ? "col-resize" : "default" }}
        >
          {/* Left Column - Instructions and Review */}
          <div className="space-y-6 pr-4 pb-6" style={{ width: `${leftColumnWidth}%` }}>
            {/* Content for Evaluation */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {(() => {
                  const content = getInputColumnContent()
                  if (typeof content === "string") {
                    return (
                      <div className="mb-4">
                        <ContentRenderer content={content} />
                      </div>
                    )
                  } else if (Array.isArray(content)) {
                    return (
                      <div 
                        className="space-y-4 overflow-y-auto pr-3 -mr-3"
                        style={{ 
                          maxHeight: columnRoles.filter((role) => role.userRole === "Metadata").length > 0 
                            ? 'calc(100vh - 400px)' // Leave space for metadata card + padding
                            : 'calc(100vh - 274px)',  // More conservative with additional 24px bottom buffer
                          scrollbarWidth: 'thin',
                          scrollbarColor: '#9ca3af #f3f4f6' // thumb: gray-400, track: gray-100
                        }}
                      >
                        {content.map((item, index) => (
                          <ContentRenderer key={index} content={item.content} title={generateInputTitle(item.name)} />
                        ))}
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>

            {/* Metadata Card */}
            {columnRoles.filter((role) => role.userRole === "Metadata").length > 0 && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-2 text-xs">
                    {columnRoles
                      .filter((role) => role.userRole === "Metadata")
                      .slice(0, 4)
                      .map((metadataCol) => {
                        // Use uploaded data if available, otherwise use preview data
                        const dataToUse = uploadedData.length > 0 ? uploadedData : previewData
                        const currentValue = dataToUse[(currentItem - 1) % dataToUse.length]?.[metadataCol.name] || "N/A"
                        return (
                          <div key={metadataCol.name}>
                            <span className="font-medium text-gray-600">{generateInputTitle(metadataCol.name)}:</span>
                            <span className="ml-2 text-gray-900">{String(currentValue)}</span>
                          </div>
                        )
                      })}
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
            {/* Task Instructions - Moved above evaluation */}
            {/* Instructions Panel - conditionally rendered */}
            {showInstructions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg leading-6 font-medium text-blue-900">Instructions</h3>
                  </div>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full text-sm text-blue-800 bg-transparent border border-blue-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={5}
                  />
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
                            saveCurrentResponse()
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
                        {currentItem} of {getTotalItems()}
                      </div>
                      {(() => {
                        // Calculate progress - ensure it starts at 0% and reaches 100% on final submission
                        const getProgressWidth = () => {
                          if (getTotalItems() === 0) {
                            return 0
                          }

                          // If current item is submitted, show progress as if we've completed this question
                          // Otherwise, show progress based on position (currentItem - 1)
                          const isCurrentSubmitted = submittedItems.has(currentItem)
                          const progressPosition = isCurrentSubmitted ? currentItem : currentItem - 1
                          const progress = (progressPosition / getTotalItems()) * 100

                          return progress
                        }

                        const progressWidth = getProgressWidth()

                        return (
                          <div className="flex-1 min-w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${progressWidth}%`,
                              }}
                            ></div>
                          </div>
                        )
                      })()}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentItem < getTotalItems() && currentItem < furthestItemReached) {
                          // Save current responses before navigating
                          saveCurrentResponse()
                          setCurrentItem(currentItem + 1)
                        }
                      }}
                      disabled={currentItem >= getTotalItems() || currentItem >= furthestItemReached}
                      className={`p-1 rounded-md ${
                        currentItem >= getTotalItems() || currentItem >= furthestItemReached
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
                  {criteria.map((criterion) => (
                    <div key={criterion.id} className="border border-gray-200 rounded-lg p-4 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <label className="block text-sm font-semibold text-gray-700">
                            {criterion.name}
                            {criterion.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => moveMetric(criterion.id, "up")}
                            disabled={criteria.findIndex((m) => m.id === criterion.id) === 0}
                            className={`p-1 rounded-md hover:bg-gray-100 ${
                              criteria.findIndex((m) => m.id === criterion.id) === 0
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-600 hover:text-gray-800"
                            }`}
                            aria-label="Move question up"
                          >
                            <ChevronUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMetric(criterion.id, "down")}
                            disabled={criteria.findIndex((m) => m.id === criterion.id) === criteria.length - 1}
                            className={`p-1 rounded-md hover:bg-gray-100 ${
                              criteria.findIndex((m) => m.id === criterion.id) === criteria.length - 1
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-600 hover:text-gray-800"
                            }`}
                            aria-label="Move question down"
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditMetric(criterion.id)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-gray-100 border border-gray-200"
                            aria-label="Edit question"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {criteria.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMetric(criterion.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-gray-100 border border-gray-200"
                              aria-label="Delete question"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {criterion.type === "yes-no" && (
                        <div className="flex flex-wrap gap-2">
                          {criterion.options.map((option, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleInputChange(criterion.id, option)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                                formData[`criterion-${criterion.id}`] === option
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
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
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {number}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {criterion.type === "custom-list" && (
                        <div className="flex flex-wrap gap-2">
                          {criterion.options.map((option, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleInputChange(criterion.id, option)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                                formData[`criterion-${criterion.id}`] === option
                                  ? "bg-blue-500 text-white border-blue-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              }`}
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
                          className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-1.5"
                          placeholder={`Enter ${criterion.name.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}

                  {/* Add Metric Button */}
                  <button
                    type="button"
                    onClick={handleAddMetric}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                  >
                    <PlusIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm font-medium text-gray-600">Add a Question</span>
                  </button>

                  <div className="pt-4">
                    {/* Update the submit button logic to check if the item was already submitted and if form was modified: */}
                    {/* Update the submit button logic to check if the item was already submitted and if form was modified: */}
                    {/* Update the submit button logic to check if the item was already submitted and if form was modified: */}
                    {(() => {
                      const isCurrentItemSubmitted = submittedItems.has(currentItem)
                      const canSubmit = isFormValid && (!isCurrentItemSubmitted || isCurrentFormModified)

                      return (
                        <button
                          type="submit"
                          disabled={!canSubmit || isSubmitting}
                          className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                            canSubmit && !isSubmitting
                              ? "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              : "bg-gray-400 cursor-not-allowed"
                          }`}
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
                      )
                    })()}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Configuration Modal */}
      <ConfigureDatasetModal
        isOpen={showDatasetConfig}
        onClose={() => setShowDatasetConfig(false)}
        uploadedData={uploadedData}
        dataColumns={dataColumns}
        previewData={previewData}
        columnRoles={columnRoles}
        onUpdateColumnRole={updateColumnRole}
        onUpdateColumnDisplayName={updateColumnDisplayName}
      />

      {/* Edit Metric Modal */}
      <EditMetricModal
        metric={editingMetric}
        metrics={criteria}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveMetric}
      />
    </PageLayout>
  )
}
