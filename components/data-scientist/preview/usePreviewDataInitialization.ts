/**
 * Custom hook for handling Preview Page data initialization
 * Extracts data loading logic from the main PreviewPage component
 * 
 * This hook handles:
 * - Loading data from sessionStorage (for new evaluations)
 * - Loading data from localStorage (for editing existing evaluations)
 * - Applying AI analysis results
 * - Fallback analysis when AI is not available
 */

import React, { useState, useLayoutEffect } from 'react'
import { useDatasetAnalysis } from '@/lib/hooks/use-dataset-analysis'
import { generateFallbackAnalysis } from '@/lib/analysis/fallback'

interface Metric {
  id: number
  name: string
  type: string
  options: string[]
  required: boolean
  likertLabels?: { low: string; high: string }
  aiGenerated?: boolean
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

interface UsePreviewDataInitializationProps {
  isEditMode: boolean
  editId: number | null
  evaluationNameEdited: boolean
}

interface UsePreviewDataInitializationReturn {
  uploadedData: any[]
  dataColumns: string[]
  previewData: any[]
  evaluationName: string
  instructions: string
  criteria: Metric[]
  columnRoles: ColumnRole[]
  setEvaluationName: React.Dispatch<React.SetStateAction<string>>
  setInstructions: React.Dispatch<React.SetStateAction<string>>
  setCriteria: React.Dispatch<React.SetStateAction<Metric[]>>
  setColumnRoles: React.Dispatch<React.SetStateAction<ColumnRole[]>>
  setUploadedData: React.Dispatch<React.SetStateAction<any[]>>
  setDataColumns: React.Dispatch<React.SetStateAction<string[]>>
}

export function usePreviewDataInitialization({
  isEditMode,
  editId,
  evaluationNameEdited
}: UsePreviewDataInitializationProps): UsePreviewDataInitializationReturn {
  
  const { analyzeWithAPI } = useDatasetAnalysis()

  // State for data management
  const [uploadedData, setUploadedData] = useState<any[]>([])
  const [dataColumns, setDataColumns] = useState<string[]>([])
  
  // Sample data for preview when no uploaded data is available
  const previewData = [
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
  
  const [evaluationName, setEvaluationName] = useState("Content Quality Assessment")
  const [instructions, setInstructions] = useState(
    "Please evaluate each response carefully. Focus on quality, relevance, accuracy, and appropriateness of the generated content."
  )

  // Default criteria
  const [criteria, setCriteria] = useState<Metric[]>([
    {
      id: 1,
      name: "Overall Quality",
      type: "likert-scale",
      options: ["1", "2", "3", "4", "5"],
      required: true,
      likertLabels: { low: "Poor", high: "Excellent" },
      aiGenerated: false,
    },
    {
      id: 2,
      name: "Is the content appropriate and accurate?",
      type: "yes-no",
      options: ["Yes", "No"],
      required: true,
      aiGenerated: false,
    },
    {
      id: 3,
      name: "Additional Comments",
      type: "text-input",
      options: [],
      required: false,
      aiGenerated: false,
    },
  ])

  // Default column roles
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([
    {
      id: "user_query",
      name: "user_query",
      suggestedRole: "Input Data",
      confidence: 85,
      reason: "Contains user queries/prompts for AI evaluation",
      userRole: "Input Data",
    },
    {
      id: "ai_response",
      name: "ai_response",
      suggestedRole: "Model Output",
      confidence: 90,
      reason: "Contains AI responses that need human evaluation",
      userRole: "Model Output",
    },
    {
      id: "category",
      name: "category",
      suggestedRole: "Metadata",
      confidence: 80,
      reason: "Categorical field providing context for analysis",
      userRole: "Metadata",
    },
    {
      id: "item_id",
      name: "item_id",
      suggestedRole: "Metadata",
      confidence: 90,
      reason: "Identifier field providing context but not directly used for evaluation",
      userRole: "Metadata",
    },
  ])

  // Helper function to apply AI results
  const applyAIResults = (aiResult: any) => {
    if (aiResult.evaluationName && !evaluationNameEdited) {
      setEvaluationName(aiResult.evaluationName)
    }
    
    if (aiResult.instructions) {
      setInstructions(aiResult.instructions)
    }

    // Update column roles from AI analysis
    const aiColumnRoles = aiResult.columnAnalysis.map((col: any) => {
      let convertedRole = col.suggestedRole
      if (col.suggestedRole === "Input Data" || col.suggestedRole === "Input") convertedRole = "Input"
      if (col.suggestedRole === "Model Output" || col.suggestedRole === "Output") convertedRole = "Model Output"
      if (col.suggestedRole === "Excluded Data" || col.suggestedRole === "Excluded") convertedRole = "Excluded"
      if (col.suggestedRole === "Reference") convertedRole = "Reference"
      if (col.suggestedRole === "Metadata") convertedRole = "Metadata"

      return {
        id: col.columnName,
        name: col.columnName,
        suggestedRole: col.suggestedRole,
        confidence: col.confidence,
        reasoning: col.reasoning,
        reason: col.reasoning,
        userRole: convertedRole,
      }
    })
    setColumnRoles(aiColumnRoles)

    // Update criteria from AI suggestions
    const aiCriteria = aiResult.suggestedMetrics.map((metric: any, index: number) => ({
      id: index + 1,
      name: metric.name,
      type: metric.type,
      options: metric.options,
      required: metric.required,
      likertLabels: metric.likertLabels,
      aiGenerated: true,
    }))
    setCriteria(aiCriteria)
  }

  // Fallback analysis function
  const performFallbackAnalysis = async (data: any[], columns: string[]) => {
    try {
      const fallbackResult = generateFallbackAnalysis(data, columns)
      
      // Apply fallback analysis results
      if (fallbackResult.evaluationName && !evaluationNameEdited) {
        setEvaluationName(fallbackResult.evaluationName)
      }
      
      if (fallbackResult.instructions) {
        setInstructions(fallbackResult.instructions)
      }

      // Convert fallback column analysis to column roles
      const fallbackColumnRoles = fallbackResult.columnAnalysis.map((col: any) => {
        // Apply the same conversion logic as AI analysis
        let convertedRole = col.suggestedRole
        if (col.suggestedRole === "Input Data" || col.suggestedRole === "Input") convertedRole = "Input"
        if (col.suggestedRole === "Model Output" || col.suggestedRole === "Output") convertedRole = "Model Output"
        if (col.suggestedRole === "Excluded Data" || col.suggestedRole === "Excluded") convertedRole = "Excluded"
        if (col.suggestedRole === "Reference") convertedRole = "Reference"
        if (col.suggestedRole === "Metadata") convertedRole = "Metadata"

        return {
          id: col.columnName,
          name: col.columnName,
          suggestedRole: col.suggestedRole,
          confidence: col.confidence,
          reason: col.reasoning,
          reasoning: col.reasoning,
          userRole: convertedRole,
        }
      })
      setColumnRoles(fallbackColumnRoles)

      // Convert fallback metrics to criteria
      const fallbackCriteria = fallbackResult.suggestedMetrics.map((metric: any, index: number) => ({
        id: index + 1,
        name: metric.name,
        type: metric.type,
        options: metric.options,
        required: metric.required,
        likertLabels: metric.likertLabels,
        aiGenerated: false,
      }))
      setCriteria(fallbackCriteria)
    } catch (error) {
      console.error('Fallback analysis failed:', error)
      // Keep default settings if fallback fails
    }
  }

  // Data initialization effect
  useLayoutEffect(() => {
    if (isEditMode && editId) {
      // Load existing evaluation for editing
      const storedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      const existingEvaluation = storedEvaluations.find((evaluation: any) => evaluation.id === editId)

      if (existingEvaluation) {
        setEvaluationName(existingEvaluation.name)
        setInstructions(existingEvaluation.instructions)
        setCriteria(existingEvaluation.criteria)
        setColumnRoles(existingEvaluation.columnRoles)
        setUploadedData(existingEvaluation.data)

        if (existingEvaluation.data.length > 0) {
          const columns = Object.keys(existingEvaluation.data[0])
          setDataColumns(columns)
        }
      }
    } else {
      // Load data from sessionStorage for new evaluations
      const storedData = sessionStorage.getItem("uploadedData")
      const storedAIResult = sessionStorage.getItem("aiAnalysisResult")
      const storedAIPreference = sessionStorage.getItem("useAIAnalysis")
      const storedJsonlColumnRoles = sessionStorage.getItem("jsonlColumnRoles")

      if (storedData) {
        const parsedData = JSON.parse(storedData)
        setUploadedData(parsedData)

        if (parsedData.length > 0) {
          const columns = Object.keys(parsedData[0])
          setDataColumns(columns)

          // If JSONL column roles exist, use them
          if (storedJsonlColumnRoles) {
            setColumnRoles(JSON.parse(storedJsonlColumnRoles))
          } else {
            const shouldUseAI = storedAIResult && storedAIPreference === "true"
            if (shouldUseAI) {
              const aiResult = JSON.parse(storedAIResult)
              applyAIResults(aiResult)
            } else {
              // Use fallback analysis
              performFallbackAnalysis(parsedData, columns)
            }
          }
        }
      }
    }
  }, [isEditMode, editId, evaluationNameEdited])

  return {
    uploadedData,
    dataColumns,
    previewData,
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
  }
}
