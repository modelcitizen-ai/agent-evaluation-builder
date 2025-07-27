"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { usePreviewDataInitialization } from "@/components/data-scientist/preview/usePreviewDataInitialization"
import { usePreviewFormNavigation } from "@/components/data-scientist/preview/usePreviewFormNavigation"
import { usePreviewColumnManagement } from "@/components/data-scientist/preview/usePreviewColumnManagement"
import { usePreviewUIHelpers } from "@/components/data-scientist/preview/usePreviewUIHelpers"
import { usePreviewMetricManagement } from "@/components/data-scientist/preview/usePreviewMetricManagement"

/**
 * IMPORTANT: The evaluationName is now a single source of truth from the backend API.
 * - Do NOT generate, clean, or fallback the evaluation name in the frontend.
 * - Always use the evaluationName returned from the API (AI or fallback).
 * - This eliminates bugs and duplication. See /app/api/analyze-data/route.ts for naming logic.
 */

export default function PreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Use the column management hook
  const {
    normalizeRole,
    updateColumnRole,
    updateColumnDisplayName,
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
