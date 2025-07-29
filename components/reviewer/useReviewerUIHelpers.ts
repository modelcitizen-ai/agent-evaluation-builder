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
 * - Sample randomization for participants
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDataIndexForPosition } from '@/lib/utils/randomization'

interface Evaluation {
  id: number
  name: string
  instructions: string
  criteria: any[]
  columnRoles: any[]
  data: any[]
  totalItems: number
  randomizationEnabled?: boolean
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
  
  // Get URL parameters for participant-specific randomization
  const searchParams = useSearchParams()
  const participantId = searchParams.get('participant')
  const isSequential = searchParams.get('sequential') === 'true'

  // Get current content to display with randomization support
  const getCurrentContent = () => {
    if (!evaluation) return []
    
    // Determine if randomization should be used
    // Check both participant ID AND evaluation's randomization setting
    const useRandomization = participantId && !isSequential && evaluation.randomizationEnabled === true
    
    let currentRowIndex: number
    if (useRandomization) {
      // Use randomized order for this participant
      currentRowIndex = getDataIndexForPosition(participantId, currentItem, evaluation.data.length)
      console.log(`[getCurrentContent] Randomized mode: UI position ${currentItem} -> data index ${currentRowIndex} for participant ${participantId}`)
    } else {
      // Use sequential order (legacy behavior)
      currentRowIndex = (currentItem - 1) % evaluation.data.length
      console.log(`[getCurrentContent] Sequential mode: UI position ${currentItem} -> data index ${currentRowIndex}`)
    }
    
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

  // Get current metadata to display with randomization support
  const getCurrentMetadata = () => {
    if (!evaluation) return []
    
    // Use the same randomization logic as getCurrentContent
    // Check both participant ID AND evaluation's randomization setting
    const useRandomization = participantId && !isSequential && evaluation.randomizationEnabled === true
    
    let currentRowIndex: number
    if (useRandomization) {
      // Use randomized order for this participant
      currentRowIndex = getDataIndexForPosition(participantId, currentItem, evaluation.data.length)
    } else {
      // Use sequential order (legacy behavior)
      currentRowIndex = (currentItem - 1) % evaluation.data.length
    }
    
    const currentRow = evaluation.data[currentRowIndex]

    const metadataRoles = evaluation.columnRoles.filter((role) => role.userRole === "Metadata")
    console.log('[getCurrentMetadata] Found metadata roles:', metadataRoles.map(r => ({ name: r.name, labelVisible: r.labelVisible })))

    const result = metadataRoles.map((col) => {
        const isLabelVisible = col.labelVisible !== false // default to true
        
        // For metadata, if label is hidden, use empty string for name but still show value
        const displayName = isLabelVisible 
          ? (col.displayName && col.displayName.trim() 
              ? col.displayName 
              : col.name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()))
          : "" // Hide label but still show content
        
        const item = {
          name: displayName,
          value: currentRow[col.name] || "N/A",
        }
        
        console.log(`[getCurrentMetadata] ${col.name}: labelVisible=${isLabelVisible}, displayName="${displayName}", value="${item.value}"`)
        return item
      })
    
    console.log('[getCurrentMetadata] Final result:', result)
    return result
  }

  // Generate display title for input columns
  const generateInputTitle = (columnName: string) => {
    if (!evaluation) return columnName
    
    // Check if there's a custom display name for this column
    const columnConfig = evaluation.columnRoles.find((col) => col.name === columnName)
    const isLabelVisible = columnConfig?.labelVisible !== false // default to true
    
    // If label visibility is turned off, return empty string to hide the title
    if (!isLabelVisible) {
      return ""
    }
    
    // If visible and has custom display name, use it
    if (columnConfig?.displayName && columnConfig.displayName.trim()) {
      return columnConfig.displayName
    }

    // Fallback to formatted column name
    const formatted = columnName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    return formatted
  }

  // Calculate progress based on actual completion (number of submitted items)
  const getProgressWidth = () => {
    if (!evaluation || evaluation.totalItems === 0) {
      return 0
    }

    // Simple completion-based progress: percentage of questions actually completed
    const completedCount = submittedItems.size
    const progressPercentage = (completedCount / evaluation.totalItems) * 100

    return progressPercentage
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
