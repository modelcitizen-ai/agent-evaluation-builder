/**
 * Custom hook for handling Reviewer Task Page UI helpers and display logic
 * Extracts UI state management and helper functions from the main ReviewTaskPage component
 * 
 * This hook handles:
 * - Content display functions (getCurrentContent, getCurrentMetadata)
 * - Column resizing logic for the UI layout
 * - Progress calculation and visualization
 * - UI state management (instructions panel, column widths)
 * - Data formatting and title generation helpers
 */

import { useState, useEffect, useRef } from 'react'

interface Evaluation {
  id: number
  name: string
  instructions: string
  criteria: any[]
  columnRoles: any[]
  data: any[]
  totalItems: number
  assignedReviewers?: { id: string; name: string }[]
}

interface UseReviewerUIHelpersProps {
  evaluation: Evaluation | null
  currentItem: number
  submittedItems: Set<number>
}

interface UseReviewerUIHelpersReturn {
  // UI state
  showInstructions: boolean
  setShowInstructions: React.Dispatch<React.SetStateAction<boolean>>
  leftColumnWidth: number
  setLeftColumnWidth: React.Dispatch<React.SetStateAction<number>>
  isDragging: boolean
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
  containerRef: React.RefObject<HTMLDivElement | null>
  
  // Content display functions
  getCurrentContent: () => Array<{ name: string; content: string; type: string }>
  getCurrentMetadata: () => Array<{ name: string; value: string }>
  generateInputTitle: (columnName: string) => string
  
  // Progress calculation
  getProgressWidth: () => number
  progressWidth: number
  
  // Column resizing handlers
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useReviewerUIHelpers({
  evaluation,
  currentItem,
  submittedItems
}: UseReviewerUIHelpersProps): UseReviewerUIHelpersReturn {
  
  // UI state management
  const [showInstructions, setShowInstructions] = useState(false)
  const [leftColumnWidth, setLeftColumnWidth] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get current content to display
  const getCurrentContent = () => {
    if (!evaluation) return []
    
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

  // Get current metadata to display
  const getCurrentMetadata = () => {
    if (!evaluation) return []
    
    const currentRowIndex = (currentItem - 1) % evaluation.data.length
    const currentRow = evaluation.data[currentRowIndex]

    return evaluation.columnRoles
      .filter((role) => role.userRole === "Metadata")
      .map((col) => ({
        name: col.name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        value: currentRow[col.name] || "N/A",
      }))
  }

  // Generate display title for input columns
  const generateInputTitle = (columnName: string) => {
    if (!evaluation) return columnName
    
    // Check if there's a custom display name for this column
    const columnConfig = evaluation.columnRoles.find((col) => col.name === columnName)
    if (columnConfig?.displayName && columnConfig.displayName.trim()) {
      return columnConfig.displayName
    }

    // Fallback to formatted column name
    const formatted = columnName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    return formatted
  }

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

  // Handle column resizing (shared logic with preview page)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Column resizing effect
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

  return {
    // UI state
    showInstructions,
    setShowInstructions,
    leftColumnWidth,
    setLeftColumnWidth,
    isDragging,
    setIsDragging,
    containerRef,
    
    // Content display functions
    getCurrentContent,
    getCurrentMetadata,
    generateInputTitle,
    
    // Progress calculation
    getProgressWidth,
    progressWidth,
    
    // Column resizing handlers
    handleMouseDown,
  }
}
