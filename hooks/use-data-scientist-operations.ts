import { useRouter } from 'next/navigation'

export function useDataScientistOperations() {
  const router = useRouter()

  // Handle editing an evaluation
  const handleEditEvaluation = (evaluationId: number) => {
    // Navigate to preview page for editing
    router.push(`/data-scientist/new/preview?editId=${evaluationId}`)
  }

  // Handle viewing progress for an evaluation
  const handleViewProgress = (evaluationId: number) => {
    // Navigate to progress page
    router.push(`/data-scientist/evaluation/${evaluationId}/progress`)
  }

  // Handle assigning reviewers to an evaluation
  const handleAssignReviewers = (evaluationId: number) => {
    // Navigate to assign reviewers page
    router.push(`/data-scientist/new/assign-reviewers?evaluationId=${evaluationId}`)
  }

  // Handle deleting an evaluation
  const handleDeleteEvaluation = (evaluationId: number) => {
    if (confirm("Are you sure you want to delete this evaluation? This action cannot be undone.")) {
      try {
        // Remove the evaluation from localStorage
        const evaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
        const updatedEvaluations = evaluations.filter((e: any) => e.id !== evaluationId)
        localStorage.setItem("evaluations", JSON.stringify(updatedEvaluations))

        // Remove associated reviewers
        const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
        const updatedReviewers = evaluationReviewers.filter(
          (reviewer: any) => reviewer.evaluationId !== evaluationId.toString() && reviewer.evaluationId !== evaluationId
        )
        localStorage.setItem("evaluationReviewers", JSON.stringify(updatedReviewers))

        // Trigger a page refresh to update the UI
        window.location.reload()
      } catch (error) {
        console.error("Error deleting evaluation:", error)
        alert("Failed to delete evaluation. Please try again.")
      }
    }
  }

  // Calculate unique samples from evaluation data
  const calculateUniqueSamples = (evaluation: any) => {
    // Calculate unique samples from data IDs
    if (!evaluation.data || !Array.isArray(evaluation.data) || evaluation.data.length === 0) {
      return evaluation.totalItems; // Fallback to totalItems if no data
    }
    
    // Find ID columns (common ID field names, case-insensitive)
    const idColumns = [
      'id', 'item_id', 'sample_id', 'row_id', 'record_id', 'uuid',
      'ID', 'Item_ID', 'Sample_ID', 'Row_ID', 'Record_ID', 'UUID',
      'Record ID', 'Item ID', 'Sample ID', 'Row ID', 'record id', 'item id', 'sample id', 'row id'
    ];
    let idColumn = null;
    
    // First try exact match
    for (const col of idColumns) {
      if (evaluation.data[0] && evaluation.data[0].hasOwnProperty(col)) {
        idColumn = col;
        break;
      }
    }
    
    // If no exact match, try case-insensitive search
    if (!idColumn && evaluation.data[0]) {
      const dataKeys = Object.keys(evaluation.data[0]);
      for (const key of dataKeys) {
        if (idColumns.some(idCol => idCol.toLowerCase() === key.toLowerCase())) {
          idColumn = key;
          break;
        }
      }
    }
    
    // If still no match, try fuzzy matching for common ID patterns
    if (!idColumn && evaluation.data[0]) {
      const dataKeys = Object.keys(evaluation.data[0]);
      for (const key of dataKeys) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
        if (normalizedKey.includes('id') || 
            normalizedKey.includes('record') || 
            normalizedKey.includes('sample') ||
            normalizedKey.includes('item') ||
            normalizedKey.includes('row')) {
          idColumn = key;
          break;
        }
      }
    }
    
    if (!idColumn) {
      // If no ID column found, assume all items are unique
      return evaluation.totalItems;
    }
    
    // Count unique IDs (convert to string to handle different data types)
    const uniqueIds = new Set(
      evaluation.data
        .map((row: any) => String(row[idColumn] || '').trim())
        .filter((id: string) => id !== '' && id !== 'null' && id !== 'undefined')
    );
    return uniqueIds.size || evaluation.totalItems;
  }

  // Get status badge styling
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground border border-border"
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
      default:
        return "bg-muted text-muted-foreground border border-border"
    }
  }

  // Get status display text
  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft"
      case "active":
        return "Active"
      case "completed":
        return "Completed"
      default:
        return status
    }
  }

  return {
    handleEditEvaluation,
    handleViewProgress,
    handleAssignReviewers,
    handleDeleteEvaluation,
    calculateUniqueSamples,
    getStatusBadgeClass,
    getStatusDisplayText
  }
}
