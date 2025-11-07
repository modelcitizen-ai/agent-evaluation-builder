"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { usePreviewDataInitialization } from "@/components/data-scientist/preview/usePreviewDataInitialization"
import { usePreviewFormNavigation } from "@/components/data-scientist/preview/usePreviewFormNavigation"
import { usePreviewColumnManagement } from "@/components/data-scientist/preview/usePreviewColumnManagement"
import { usePreviewUIHelpers } from "@/components/data-scientist/preview/usePreviewUIHelpers"
import { usePreviewMetricManagement } from "@/components/data-scientist/preview/usePreviewMetricManagement"
import DOMPurify from "dompurify"

/**
 * IMPORTANT: The evaluationName is now a single source of truth from the backend API.
 * - Do NOT generate, clean, or fallback the evaluation name in the frontend.
 * - Always use the evaluationName returned from the API (AI or fallback).
 * - This eliminates bugs and duplication. See /app/api/analyze-data/route.ts for naming logic.
 */

// Component that uses useSearchParams - needs to be wrapped in Suspense
function PreviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Simple inline content renderer for metadata
  const renderInlineContent = (content: string) => {
    if (!content) return content

    // Check if content contains HTML tags (already formatted)
    if (content.includes('<') && content.includes('>')) {
      
      // Process HTML to standardize link colors before sanitization
      let processedHtml = content
      
      // Remove any existing color styles from links and apply our standard blue colors
      if (typeof window !== 'undefined') {
        // Create a temporary DOM element to process the HTML
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = content
        
        // Find all links and standardize their styling
        const links = tempDiv.querySelectorAll('a')
        links.forEach(link => {
          // Remove any existing styling that might conflict
          link.removeAttribute('style')
          link.removeAttribute('color')
          
          // Remove legacy color classes
          if (link.className) {
            link.className = link.className
              .split(' ')
              .filter(cls => !cls.includes('indigo') && !cls.includes('purple'))
              .join(' ')
          }
          
          // Add our standard link classes AND inline styles to force blue color
          link.className = 'text-blue-600 hover:text-blue-800 no-underline'
          link.style.color = 'rgb(37, 99, 235) !important' // Force blue-600 inline with !important
          link.style.textDecoration = 'none !important' // Remove underline
        })
        
        processedHtml = tempDiv.innerHTML
      }
      
      // Sanitize the processed HTML
      const sanitizedHtml = typeof window !== 'undefined' 
        ? DOMPurify.sanitize(processedHtml, {
            ADD_ATTR: ['class', 'style'], // Allow both class and style attributes
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
          })
        : processedHtml
      
      return (
        <span 
          className="inline html-content"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )
    }

    // Check for Markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    if (markdownLinkRegex.test(content)) {
      // Reset regex for replacement
      markdownLinkRegex.lastIndex = 0
      
      const parts = []
      let lastIndex = 0
      let match
      
      while ((match = markdownLinkRegex.exec(content)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index))
        }
        
        // Add the link without underline
        const linkText = match[1]
        const linkUrl = match[2]
        parts.push(
          <a
            key={match.index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 no-underline"
          >
            {linkText}
          </a>
        )
        
        lastIndex = match.index + match[0].length
      }
      
      // Add remaining text
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex))
      }
      
      return <span>{parts}</span>
    }

    // Check if content is a URL (plain text URL that needs to be converted to link)
    const urlRegex = /^(https?:\/\/[^\s]+)$/
    const trimmedContent = content.trim()
    
    if (urlRegex.test(trimmedContent)) {
      return (
        <a
          href={trimmedContent}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {trimmedContent}
        </a>
      )
    }

    // Also check if content contains URLs within text
    const hasUrl = /https?:\/\/[^\s]+/.test(trimmedContent)
    if (hasUrl) {
      const parts = trimmedContent.split(/(https?:\/\/[^\s]+)/g)
      return (
        <span>
          {parts.map((part, index) => {
            if (/^https?:\/\/[^\s]+$/.test(part)) {
              return (
                <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {part}
                </a>
              )
            }
            return part
          })}
        </span>
      )
    }

    // Plain text content
    return <span>{content}</span>
  }

  // Detect if we're in edit mode
  const editId = searchParams.get('editId') ? Number(searchParams.get('editId')) : null
  const isEditMode = editId !== null

  // Track evaluation name editing state
  const [evaluationNameEdited, setEvaluationNameEdited] = useState(false)

  // Use the data initialization hook
  const {
    uploadedData,
    dataColumns,
    previewData,
    evaluationName,
    instructions,
    criteria,
    columnRoles,
    randomizationEnabled,
    setEvaluationName,
    setInstructions,
    setCriteria,
    setColumnRoles,
    setUploadedData,
    setDataColumns,
    setRandomizationEnabled,
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

  // Use the column management hook
  const {
    normalizeRole,
    updateColumnRole,
    updateColumnDisplayName,
    updateColumnVisibility,
    generateInputTitle,
    getInputColumnContent,
    getConfidenceColor,
    getConfidenceBarColor,
    getInputColumns,
    getMetadataColumns,
    hasMetadataColumns,
  } = usePreviewColumnManagement({
    columnRoles,
    setColumnRoles,
    uploadedData,
    previewData,
    currentItem
  })

  // Use the UI helpers hook
  const {
    leftColumnWidth,
    isDragging,
    containerRef,
    handleMouseDown,
    showDatasetConfig,
    setShowDatasetConfig,
    showInstructions,
    setShowInstructions,
    isSaving,
    setIsSaving,
    analysisError,
    setAnalysisError,
    isComingFromUpload,
    setIsComingFromUpload,
    useAIAnalysis,
    setUseAIAnalysis,
  } = usePreviewUIHelpers()

  // Use the metric management hook
  const {
    editingMetric,
    setEditingMetric,
    isEditModalOpen,
    setIsEditModalOpen,
    aiAnalysisResult,
    setAiAnalysisResult,
    lastDeletedMetric,
    setLastDeletedMetric,
    handleEditMetric,
    handleAddMetric,
    handleSaveMetric,
    handleEditMetricSave,
    handleCloseEditModal,
    handleDeleteMetric,
    handleUndoDelete,
    moveMetric,
    handleSaveEvaluation,
  } = usePreviewMetricManagement({
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
  })

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
            className="bg-transparent border-none text-2xl font-semibold text-foreground focus:outline-none focus:ring-0 p-0 m-0 min-w-0 flex-1"
          />
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground flex-shrink-0">
            Draft
          </span>
        </div>
      }
      actions={
        <div className="flex space-x-3">
          {/* Configure Dataset Button */}
                  <Button
                    onClick={() => setShowDatasetConfig(true)}
                    variant="outline"
                    size="sm"
                  >
                    <CogIcon className="h-4 w-4 mr-2" />
                    Configure Dataset
                  </Button>          {/* Instructions Toggle Button */}
                  <Button
                    onClick={() => setShowInstructions(!showInstructions)}
                    variant="outline"
                    size="sm"
                    className={`flex items-center gap-2 ${
                      showInstructions 
                        ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" 
                        : "hover:bg-muted/50"
                    }`}
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
                  </Button>          {/* Cancel Button */}
          <Button
            onClick={() => router.push("/data-scientist")}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>

          {/* Save Button */}
          <Button
            onClick={handleSaveEvaluation}
            disabled={isSaving}
            variant="default"
            size="sm"
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
          </Button>
        </div>
      }
    >
      {/* Error Banner */}
      {analysisError && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Azure OpenAI Analysis Issue</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">{analysisError} Using fallback analysis instead.</p>
            </div>
          </div>
        </div>
      )}

      {/* Only show main content after analysis is ready; render a full-viewport loader while analyzing */}
      {columnRoles.length === 0 || criteria.length === 0 ? (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col items-center justify-center min-h-screen">
          {/* Animated Logo (copied from upload page for consistency) */}
          <div className="mb-8">
            <div className="relative">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center relative animate-bounce">
                <div className="h-6 w-6 bg-white rounded-full animate-pulse"></div>
                <div className="absolute inset-0 animate-spin">
                  <div className="absolute top-1 right-1 h-3 w-3 bg-yellow-300 rounded-full animate-ping"></div>
                </div>
                <div className="absolute inset-0 animate-spin animate-reverse-slow">
                  <div className="absolute bottom-1 left-1 h-2 w-2 bg-pink-300 rounded-full animate-pulse"></div>
                </div>
                <div className="absolute -top-2 -left-2 h-1.5 w-1.5 bg-green-400 rounded-full animate-bounce animate-delay-500"></div>
                <div className="absolute -bottom-2 -right-2 h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce animate-delay-1000"></div>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping opacity-20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-ping opacity-30 animate-delay-500"></div>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">Interpreting your Data...</h3>
            <p className="text-sm text-muted-foreground">This may take a few moments</p>
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
            <div className="bg-card shadow sm:rounded-lg border border-border">
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
                        className={`space-y-4 overflow-y-auto pr-3 -mr-3 scrollable-content-area ${
                          columnRoles.filter((role) => role.userRole === "Metadata").length > 0 
                            ? 'content-height-with-metadata' 
                            : 'content-height-without-metadata'
                        }`}
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
              <div className="bg-card shadow sm:rounded-lg border border-border">
                <div className="px-4 py-5 sm:p-6">
                  <div className="space-y-2 text-xs">
                    {columnRoles
                      .filter((role) => role.userRole === "Metadata")
                      .slice(0, 4)
                      .map((metadataCol) => {
                        // Use uploaded data if available, otherwise use preview data
                        const dataToUse = uploadedData.length > 0 ? uploadedData : previewData
                        const currentValue = dataToUse[(currentItem - 1) % dataToUse.length]?.[metadataCol.name] || "N/A"
                        const columnTitle = generateInputTitle(metadataCol.name)
                        
                        // Always render metadata content, but conditionally show the label
                        return (
                          <div key={metadataCol.name}>
                            {columnTitle && (
                              <>
                                <span className="font-medium text-muted-foreground">{columnTitle}: </span>
                                <span className="text-foreground">
                                  {renderInlineContent(String(currentValue))}
                                </span>
                              </>
                            )}
                            {!columnTitle && (
                              <span className="text-foreground">
                                {renderInlineContent(String(currentValue))}
                              </span>
                            )}
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
                className="h-full w-1 bg-transparent group-hover:bg-blue-400 transition-colors duration-200"
                style={{ backgroundColor: isDragging ? "rgb(59 130 246)" : "" }}
              ></div>
            </div>
          </div>

          {/* Right Column - Evaluation Form */}
          <div className="pl-4" style={{ width: `${100 - leftColumnWidth}%` }}>
            {/* Instructions Panel - conditionally rendered */}
            {showInstructions && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg leading-6 font-medium text-blue-900 dark:text-blue-100">Instructions</h3>
                  </div>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full text-sm bg-card text-card-foreground border border-border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={5}
                  />
                </div>
              </div>
            )}
            <div className="bg-card shadow sm:rounded-lg border border-border">
              <div className="px-4 py-5 sm:p-6 relative">
                {/* Heading and navigation on the same line */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-foreground">Evaluation</h3>
                  
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
                    <div key={criterion.id} className="border border-border rounded-lg p-4 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {criterion.name}
                            {criterion.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                          </label>
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => moveMetric(criterion.id, "up")}
                            disabled={criteria.findIndex((m) => m.id === criterion.id) === 0}
                            className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 ${
                              criteria.findIndex((m) => m.id === criterion.id) === 0
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                            }`}
                            aria-label="Move question up"
                          >
                            <ChevronUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMetric(criterion.id, "down")}
                            disabled={criteria.findIndex((m) => m.id === criterion.id) === criteria.length - 1}
                            className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 ${
                              criteria.findIndex((m) => m.id === criterion.id) === criteria.length - 1
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                            }`}
                            aria-label="Move question down"
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditMetric(criterion.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                            aria-label="Edit question"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {criteria.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMetric(criterion.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
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
                                  ? "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600"
                                  : "bg-card text-card-foreground border-border hover:bg-muted/50"
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
                            <span className="text-xs text-gray-500 dark:text-gray-600">{criterion.likertLabels?.low || "Low"}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-600">{criterion.likertLabels?.high || "High"}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((number) => (
                              <button
                                key={number}
                                type="button"
                                onClick={() => handleInputChange(criterion.id, number.toString())}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                                  formData[`criterion-${criterion.id}`] === number.toString()
                                    ? "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600"
                                    : "bg-card text-card-foreground border-border hover:bg-muted/50"
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
                            {criterion.options.map((option, optionIndex) => (
                              <button
                                key={optionIndex}
                                type="button"
                                onClick={() => handleInputChange(criterion.id, option)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                                  formData[`criterion-${criterion.id}`] === option
                                    ? "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600"
                                    : "bg-card text-card-foreground border-border hover:bg-muted/50"
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
                          className="block w-full border border-border rounded-md shadow-sm focus:ring-0 focus:outline-none focus:border-blue-500 focus:border-[1px] sm:text-sm px-3 py-1.5 bg-card text-card-foreground transition-colors"
                          placeholder={`Enter ${criterion.name.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}

                  {/* Add Metric Button */}
                  <button
                    type="button"
                    onClick={handleAddMetric}
                    className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    <PlusIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Add a Question</span>
                  </button>

                  <div className="pt-4">
                    {(() => {
                      const isCurrentItemSubmitted = submittedItems.has(currentItem)
                      const canSubmit = isFormValid && (!isCurrentItemSubmitted || isCurrentFormModified)

                      return (
                        <button
                          type="submit"
                          disabled={!canSubmit || isSubmitting}
                          className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                            canSubmit && !isSubmitting
                              ? "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              : "bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed"
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
        randomizationEnabled={randomizationEnabled}
        onUpdateColumnRole={updateColumnRole}
        onUpdateColumnDisplayName={updateColumnDisplayName}
        onUpdateColumnVisibility={updateColumnVisibility}
        onUpdateRandomization={setRandomizationEnabled}
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

// Main component with Suspense boundary
export default function PreviewPage() {
  return (
    <Suspense fallback={
      <PageLayout title="Loading Preview">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading preview...</p>
          </div>
        </div>
      </PageLayout>
    }>
      <PreviewPageContent />
    </Suspense>
  )
}
