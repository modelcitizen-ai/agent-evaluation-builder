/**
 * Custom hook for handling Preview Page column management and configuration
 * Extracts column-related logic from the main PreviewPage component
 * 
 * This hook handles:
 * - Column role management and updates
 * - Column display name customization
 * - Role normalization and validation
 * - Column content extraction and filtering
 * - Column confidence scoring and styling
 */

import React from 'react'

interface ColumnRole {
  id: string
  name: string
  suggestedRole: string
  confidence: number
  reason: string
  userRole: "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded" | "Input Data"
  displayName?: string
  labelVisible?: boolean
}

interface UsePreviewColumnManagementProps {
  columnRoles: ColumnRole[]
  setColumnRoles: React.Dispatch<React.SetStateAction<ColumnRole[]>>
  uploadedData: any[]
  previewData: any[]
  currentItem: number
}

interface UsePreviewColumnManagementReturn {
  // Column role management
  normalizeRole: (role: string) => "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded"
  updateColumnRole: (columnId: string, newRole: "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded") => void
  updateColumnDisplayName: (columnId: string, displayName: string) => void
  updateColumnVisibility: (columnId: string, visible: boolean) => void
  
  // Column display utilities
  generateInputTitle: (columnName: string) => string
  getInputColumnContent: () => string | Array<{ name: string; content: string; type: string }>
  
  // Confidence styling
  getConfidenceColor: (confidence: number) => string
  getConfidenceBarColor: (confidence: number) => string
  
  // Column filtering utilities
  getInputColumns: () => ColumnRole[]
  getMetadataColumns: () => ColumnRole[]
  hasMetadataColumns: () => boolean
}

export function usePreviewColumnManagement({
  columnRoles,
  setColumnRoles,
  uploadedData,
  previewData,
  currentItem
}: UsePreviewColumnManagementProps): UsePreviewColumnManagementReturn {
  
  // Generate display title for column input
  const generateInputTitle = (columnName: string) => {
    // Check if there's a custom display name for this column
    const columnConfig = columnRoles.find((col) => col.name === columnName)
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

  // Normalize role strings to standard values
  const normalizeRole = (role: string): "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded" => {
    if (role === "Input Data" || role === "Input") return "Input";
    if (role === "Model Output" || role === "Output") return "Model Output";
    if (role === "Reference") return "Reference";
    if (role === "Excluded Data" || role === "Excluded") return "Excluded";
    return "Metadata";
  };

  // Update column role with appropriate reasoning
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

  // Update column display name
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

  // Update column label visibility
  const updateColumnVisibility = (columnId: string, visible: boolean) => {
    console.log(`[updateColumnVisibility] Called with columnId="${columnId}", visible=${visible}`)
    
    setColumnRoles((prev) => {
      const updated = prev.map((col) => {
        if (col.id === columnId) {
          console.log(`[updateColumnVisibility] Updating column ${col.name} from labelVisible=${col.labelVisible} to ${visible}`)
          return {
            ...col,
            labelVisible: visible,
          }
        }
        return col
      })
      
      console.log('[updateColumnVisibility] Updated columnRoles:', updated.map(r => ({ name: r.name, userRole: r.userRole, labelVisible: r.labelVisible })))
      return updated
    })
  }

  // Get confidence color classes for styling
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 bg-green-100"
    if (confidence >= 75) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  // Get confidence bar color for progress indicators
  const getConfidenceBarColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-500"
    if (confidence >= 75) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Get input column content for current item
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

  // Filter utilities
  const getInputColumns = () => {
    return columnRoles.filter((role) => role.userRole === "Input" || role.userRole === "Model Output")
  }

  const getMetadataColumns = () => {
    return columnRoles.filter((role) => role.userRole === "Metadata")
  }

  const hasMetadataColumns = () => {
    return columnRoles.filter((role) => role.userRole === "Metadata").length > 0
  }

  return {
    // Column role management
    normalizeRole,
    updateColumnRole,
    updateColumnDisplayName,
    updateColumnVisibility,
    
    // Column display utilities
    generateInputTitle,
    getInputColumnContent,
    
    // Confidence styling
    getConfidenceColor,
    getConfidenceBarColor,
    
    // Column filtering utilities
    getInputColumns,
    getMetadataColumns,
    hasMetadataColumns,
  }
}
