import { useState } from 'react'

export function useDataScientistUIHelpers() {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)

  // Handle dropdown toggle
  const toggleDropdown = (evaluationId: number) => {
    setOpenDropdown(openDropdown === evaluationId ? null : evaluationId)
  }

  // Close dropdown
  const closeDropdown = () => {
    setOpenDropdown(null)
  }

  // Check if dropdown is open for a specific evaluation
  const isDropdownOpen = (evaluationId: number) => {
    return openDropdown === evaluationId
  }

  // Get evaluation statistics
  const getEvaluationStats = (evaluations: any[]) => {
    return {
      draft: evaluations.filter((e) => e.status === "draft").length,
      active: evaluations.filter((e) => e.status === "active").length,
      completed: evaluations.filter((e) => e.status === "completed").length
    }
  }

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Generate evaluation description text
  const generateEvaluationDescription = (evaluation: any, uniqueSamples: number) => {
    const completionText = evaluation.status === "completed" ? "Completed" : "Created"
    const dateText = formatDisplayDate(evaluation.createdAt)
    return `${uniqueSamples} Samples • ${evaluation.totalItems} Questions • ${completionText} ${dateText}`
  }

  return {
    openDropdown,
    toggleDropdown,
    closeDropdown,
    isDropdownOpen,
    getEvaluationStats,
    formatDisplayDate,
    generateEvaluationDescription
  }
}
