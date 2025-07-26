import { useState, useEffect, useRef } from "react"

interface UsePreviewUIHelpersProps {
  // No dependencies needed - this manages its own state
}

interface UsePreviewUIHelpersReturn {
  // Column resizing state and handlers
  leftColumnWidth: number
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  handleMouseDown: (e: React.MouseEvent) => void

  // Modal and UI state
  showDatasetConfig: boolean
  setShowDatasetConfig: (show: boolean) => void
  showInstructions: boolean
  setShowInstructions: (show: boolean) => void
  isSaving: boolean
  setIsSaving: (saving: boolean) => void

  // Loading and error states
  analysisError: string | null
  setAnalysisError: (error: string | null) => void
  isComingFromUpload: boolean
  setIsComingFromUpload: (coming: boolean) => void
  useAIAnalysis: boolean
  setUseAIAnalysis: (useAI: boolean) => void
}

export function usePreviewUIHelpers({}: UsePreviewUIHelpersProps = {}): UsePreviewUIHelpersReturn {
  // Column resizing state
  const [leftColumnWidth, setLeftColumnWidth] = useState(50) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Modal and UI state
  const [showDatasetConfig, setShowDatasetConfig] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Loading and error states
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isComingFromUpload, setIsComingFromUpload] = useState(true)
  const [useAIAnalysis, setUseAIAnalysis] = useState(false)

  // Handle column resizing mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle column resizing mouse move and up
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
    // Column resizing
    leftColumnWidth,
    isDragging,
    containerRef,
    handleMouseDown,

    // Modal and UI state
    showDatasetConfig,
    setShowDatasetConfig,
    showInstructions,
    setShowInstructions,
    isSaving,
    setIsSaving,

    // Loading and error states
    analysisError,
    setAnalysisError,
    isComingFromUpload,
    setIsComingFromUpload,
    useAIAnalysis,
    setUseAIAnalysis,
  }
}
