/**
 * Custom hook for handling Preview Page form validation and navigation
 * Extracts form handling and navigation logic from the main PreviewPage component
 * 
 * This hook handles:
 * - Form data management and validation
 * - Item navigation (next/previous)
 * - Response tracking and submission
 * - Progress management
 */

import React, { useState, useEffect } from 'react'

interface Metric {
  id: number
  name: string
  type: string
  options: string[]
  required: boolean
  likertLabels?: { low: string; high: string }
  aiGenerated?: boolean
}

interface UsePreviewFormNavigationProps {
  criteria: Metric[]
  uploadedData: any[]
}

interface UsePreviewFormNavigationReturn {
  // Current state
  currentItem: number
  formData: Record<string, string>
  isSubmitting: boolean
  allResponses: Record<number, Record<string, string>>
  submittedItems: Set<number>
  furthestItemReached: number
  isReviewComplete: boolean
  isCurrentFormModified: boolean
  
  // Validation
  isFormValid: boolean
  
  // Actions
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleInputChange: (criterionId: number, value: string) => void
  saveCurrentResponse: () => void
  setCurrentItem: React.Dispatch<React.SetStateAction<number>>
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  
  // Utilities
  getTotalItems: () => number
}

export function usePreviewFormNavigation({
  criteria,
  uploadedData
}: UsePreviewFormNavigationProps): UsePreviewFormNavigationReturn {
  
  // Navigation and form state
  const [currentItem, setCurrentItem] = useState(1)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Response tracking
  const [allResponses, setAllResponses] = useState<Record<number, Record<string, string>>>({})
  const [submittedItems, setSubmittedItems] = useState<Set<number>>(new Set())
  const [furthestItemReached, setFurthestItemReached] = useState(1)
  const [isReviewComplete, setIsReviewComplete] = useState(false)
  const [isCurrentFormModified, setIsCurrentFormModified] = useState(false)

  // Form validation
  const isFormValid = criteria.every((criterion) => {
    if (!criterion.required) return true
    const value = formData[`criterion-${criterion.id}`]
    return value !== undefined && value !== null && value.trim() !== ""
  })

  // Calculate total items from actual data
  const getTotalItems = () => {
    try {
      if (uploadedData && uploadedData.length > 0) {
        return uploadedData.length
      }
      return 20 // fallback to 20 for demo
    } catch (error) {
      console.error('Error in getTotalItems:', error)
      return 20 // fallback
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setIsSubmitting(true)

    // Save current responses
    const updatedAllResponses = {
      ...allResponses,
      [currentItem]: formData,
    }
    setAllResponses(updatedAllResponses)

    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)

    // Mark the current item as submitted
    const newSubmittedItems = new Set([...submittedItems, currentItem])
    setSubmittedItems(newSubmittedItems)

    // Reset modification flag
    setIsCurrentFormModified(false)

    // Check if review is complete or advance to next item
    if (currentItem >= getTotalItems()) {
      setIsReviewComplete(true)
    } else {
      const nextItem = currentItem + 1
      setCurrentItem(nextItem)
      setFurthestItemReached(Math.max(furthestItemReached, nextItem))
    }
  }

  // Handle input changes
  const handleInputChange = (criterionId: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [`criterion-${criterionId}`]: value,
    }))

    // Mark form as modified when user changes an answer
    setIsCurrentFormModified(true)
  }

  // Manual save function for navigation
  const saveCurrentResponse = () => {
    setAllResponses(prev => ({
      ...prev,
      [currentItem]: formData,
    }))
  }

  // Load responses for current item when item changes
  useEffect(() => {
    const savedResponses = allResponses[currentItem] || {}
    setFormData(savedResponses)

    // Reset modification flag when loading a new item
    setIsCurrentFormModified(false)

    // Update furthest item reached if current item is further
    if (currentItem > furthestItemReached) {
      setFurthestItemReached(currentItem)
    }
  }, [currentItem, allResponses, furthestItemReached])

  return {
    // Current state
    currentItem,
    formData,
    isSubmitting,
    allResponses,
    submittedItems,
    furthestItemReached,
    isReviewComplete,
    isCurrentFormModified,
    
    // Validation
    isFormValid,
    
    // Actions
    handleSubmit,
    handleInputChange,
    saveCurrentResponse,
    setCurrentItem,
    setIsSubmitting,
    
    // Utilities
    getTotalItems,
  }
}
