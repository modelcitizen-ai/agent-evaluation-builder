"use client"

import type React from "react"
import { getResultsDataset, addResultToDataset, saveResultsDataset, type EvaluationResult } from "@/lib/results-dataset"
import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowRightIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import ContentRenderer from "@/components/content-renderer"
import { Button } from "@/components/ui/button"
import { useReviewerDataInitialization } from "@/components/reviewer/useReviewerDataInitialization"
import { useReviewerFormNavigation } from "@/components/reviewer/useReviewerFormNavigation"
import { useReviewerUIHelpers } from "@/components/reviewer/useReviewerUIHelpers"
import DOMPurify from "dompurify"

interface Evaluation {
  id: number
  name: string
  instructions: string
  criteria: any[]
  columnRoles: any[]
  data: any[]
  totalItems: number
  assignedReviewers?: { id: string; name: string }[] // Added assignedReviewers property
}

export default function ReviewTaskPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()

  // Simple inline content renderer for metadata
  const renderInlineContent = (content: string) => {
    if (!content) return content

    console.log('[renderInlineContent] Processing content:', content)

    // Check if content contains HTML tags (already formatted)
    if (content.includes('<') && content.includes('>')) {
      console.log('[renderInlineContent] Found HTML tags, using dangerouslySetInnerHTML')
      // Sanitize HTML and render inline with link styling
      const sanitizedHtml = typeof window !== 'undefined' 
        ? DOMPurify.sanitize(content)
        : content
      
      return (
        <span 
          className="inline [&_a]:text-blue-600 [&_a]:hover:text-blue-800"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      )
    }

    // Check for Markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    if (markdownLinkRegex.test(content)) {
      console.log('[renderInlineContent] Found Markdown links, converting to HTML')
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
    console.log('[renderInlineContent] Checking if URL:', trimmedContent, 'matches:', urlRegex.test(trimmedContent))
    
    if (urlRegex.test(trimmedContent)) {
      console.log('[renderInlineContent] Creating link for URL:', trimmedContent)
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
      console.log('[renderInlineContent] Found URL within text, converting to links')
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

    console.log('[renderInlineContent] Rendering as plain text')
    // Plain text content
    return <span>{content}</span>
  }

  // Use the data initialization hook
  const {
    evaluation,
    currentReviewer,
    allResponses,
    furthestItemReached,
    isReviewComplete,
    isLoading,
    setAllResponses,
    setFurthestItemReached,
    setIsReviewComplete,
    getStorageKey,
    getProgressKey,
  } = useReviewerDataInitialization()

  // Use the form navigation hook
  const {
    currentItem,
    formData,
    isSubmitting,
    submittedItems,
    isCurrentFormModified,
    currentQuestionStartTime,
    isFormValid,
    handleSubmit,
    handleInputChange,
    setCurrentItem,
    setIsSubmitting,
    saveCurrentResponsesBeforeNavigation,
    updateReviewerAverageTime,
  } = useReviewerFormNavigation({
    evaluation,
    currentReviewer,
    allResponses,
    furthestItemReached,
    isReviewComplete,
    setAllResponses,
    setFurthestItemReached,
    setIsReviewComplete,
  })

  // Use the UI helpers hook
  const {
    showInstructions,
    setShowInstructions,
    leftColumnWidth,
    setLeftColumnWidth,
    isDragging,
    setIsDragging,
    containerRef,
    getCurrentContent,
    getCurrentMetadata,
    generateInputTitle,
    getProgressWidth,
    progressWidth,
    handleMouseDown,
  } = useReviewerUIHelpers({
    evaluation,
    currentItem,
    submittedItems,
  })

  const taskId = params.id

  // Form navigation and submission handling is now managed by the hook

  // Auto-save mechanism to periodically save state
  useEffect(() => {
    if (taskId) {
      const participantId = searchParams.get('participant')
      const storageKey = participantId 
        ? `evaluation_${taskId}_reviewer_${participantId}_responses`
        : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
      
      // Only save if we have responses to save
      if (Object.keys(allResponses).length > 0) {
        console.log(`[saveResponses] Saving responses to localStorage with key: ${storageKey}`, allResponses)
        localStorage.setItem(storageKey, JSON.stringify(allResponses))
        console.log(`[saveResponses] Responses saved successfully. Current localStorage:`, 
          Object.keys(localStorage).filter(key => key.includes('evaluation_')))
      } else {
        console.log(`[saveResponses] No responses to save for ${storageKey}`)
      }
    }
  }, [allResponses, taskId])

  // Synchronize progress in evaluationReviewers based on submitted items
  useEffect(() => {
    if (evaluation && submittedItems.size > 0) {
      // Count how many items have been actually submitted (not just have responses)
      const completedItemsCount = submittedItems.size

      // Update the progress in evaluationReviewers to match actual completion
      try {
        const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
        
        // Find the current reviewer for this evaluation (use specific reviewer from URL)
        const participantId = searchParams.get('participant')
        
        let currentReviewer;
        if (participantId) {
          // Look for the specific reviewer by ID
          const specificReviewer = evaluationReviewers.find(
            (r: any) => r.id === participantId && 
            (r.evaluationId === taskId || r.evaluationId === Number(taskId))
          )
          
          if (specificReviewer) {
            currentReviewer = {
              id: specificReviewer.id,
              name: specificReviewer.name
            }
          }
        }
        
        // If no specific reviewer found, fall back to first matching reviewer
        if (!currentReviewer) {
          const matchingReviewers = evaluationReviewers.filter(
            (r: any) => r.evaluationId === taskId || r.evaluationId === Number(taskId)
          )
          
          if (matchingReviewers.length > 0) {
            currentReviewer = {
              id: matchingReviewers[0].id,
              name: matchingReviewers[0].name
            }
          } else {
            // Fallback to original logic
            const assignedReviewers = evaluation.assignedReviewers || []
            currentReviewer = assignedReviewers.length > 0 
              ? assignedReviewers[0] 
              : { id: "reviewer-1", name: "Anonymous Reviewer" }
          }
        }
        
        const reviewerIndex = evaluationReviewers.findIndex(
          (r: any) => r.id === currentReviewer.id && 
          (r.evaluationId === taskId || r.evaluationId === Number(taskId))
        )
        
        if (reviewerIndex !== -1) {
          const currentProgress = evaluationReviewers[reviewerIndex].completed
          
          // Only update if the count is different (to avoid unnecessary updates)
          if (currentProgress !== completedItemsCount) {
            evaluationReviewers[reviewerIndex].completed = completedItemsCount
            localStorage.setItem("evaluationReviewers", JSON.stringify(evaluationReviewers))
            console.log(`[syncProgress] Synchronized reviewer ${currentReviewer.id} progress: ${completedItemsCount}/${evaluation.totalItems} (was ${currentProgress})`)
            
            // Dispatch event to notify Progress Dashboard
            try {
              if (typeof window !== 'undefined') {
                const progressEvent = new CustomEvent('reviewerProgressUpdated', { 
                  detail: { 
                    evaluationId: Number(taskId), 
                    reviewerId: currentReviewer.id,
                    completed: completedItemsCount,
                    total: evaluation.totalItems,
                    avgTime: evaluationReviewers[reviewerIndex].avgTime || "0.0"
                  } 
                });
                window.dispatchEvent(progressEvent);
                console.log(`[syncProgress] Dispatched reviewerProgressUpdated event for synchronization`);
              }
            } catch (eventError) {
              console.error('[syncProgress] Error dispatching progress sync event:', eventError);
            }
          }
        }
      } catch (error) {
        console.error('[syncProgress] Error synchronizing reviewer progress:', error)
      }
    }
  }, [evaluation, submittedItems, taskId])

  if (!evaluation) {
    return (
      <PageLayout title="Evaluation Not Found">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Evaluation Not Found</h3>
            <p className="text-gray-600 mb-4">The evaluation you're looking for doesn't exist or has been removed.</p>          <button
            onClick={() => router.push("/reviewer")}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600"
          >
            Back to Review Tasks
          </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Get current content and metadata from the UI helpers hook
  const currentContent = getCurrentContent()
  const currentMetadata = getCurrentMetadata()

  // Actions for PageLayout (matching preview page)
  const actions = (
    <div className="flex space-x-3">
      {/* Instructions Toggle Button */}
      <Button
        onClick={() => setShowInstructions(!showInstructions)}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 ${
          showInstructions 
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/30" 
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
      </Button>

      {/* Exit Button */}
      <Button
        onClick={() => {
          // Save current item position before exiting
          const participantId = searchParams.get('participant')
          const progressKey = participantId 
            ? `evaluation_${taskId}_reviewer_${participantId}_progress`
            : `evaluation_${taskId}_progress` // Fallback for backwards compatibility
          const currentProgress = { furthestItem: Math.max(currentItem, furthestItemReached) }
          
          try {
            // Save current form data first
            const storageKey = participantId 
              ? `evaluation_${taskId}_reviewer_${participantId}_responses`
              : `evaluation_${taskId}_responses` // Fallback for backwards compatibility
            const updatedResponses = {
              ...allResponses,
              [currentItem]: formData,
            }
            localStorage.setItem(storageKey, JSON.stringify(updatedResponses))
            
            // Then save progress
            localStorage.setItem(progressKey, JSON.stringify(currentProgress))
            console.log(`[exitEvaluation] Saved current progress before exit: ${JSON.stringify(currentProgress)}`)
          } catch (error) {
            console.error('[exitEvaluation] Error saving progress before exit:', error)
          }
          
          const from = searchParams.get('from')
          const participant = searchParams.get('participant')
          
          if (from === 'data-scientist') {
            router.push("/data-scientist")
          } else if (participant) {
            // If we have a participant ID, go back to reviewer page with that ID
            router.push(`/reviewer?participant=${participant}`)
          } else if (from === 'reviewer') {
            // Explicit from=reviewer parameter, go back to reviewer page
            router.push("/reviewer")
          } else {
            // Default fallback - go back to reviewer page
            router.push("/reviewer")
          }
        }}
        variant="outline"
        size="sm"
      >
        Exit
      </Button>
    </div>
  )

  const isCurrentItemSubmitted = submittedItems.has(currentItem)
  // Enable submit when: form is valid AND (item not submitted OR item submitted but form modified)
  const canSubmit = isFormValid && (!isCurrentItemSubmitted || isCurrentFormModified)

  return (
    <PageLayout title={evaluation.name} actions={actions}>
      <div ref={containerRef} className="relative flex" style={{ cursor: isDragging ? "col-resize" : "default" }}>
        {/* Left Column - Instructions and Review */}
        <div className="space-y-6 pr-4 pb-6" style={{ width: `${leftColumnWidth}%` }}>
          {/* Content for Review */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {Array.isArray(currentContent) && currentContent.length > 0 ? (
                <div 
                  className="space-y-4 overflow-y-auto pr-3 -mr-3"
                  style={{ 
                    maxHeight: currentMetadata.length > 0 
                      ? 'calc(100vh - 400px)' // Leave space for metadata card + padding
                      : 'calc(100vh - 274px)',  // More conservative with additional 24px bottom buffer
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#9ca3af #f3f4f6' // thumb: gray-400, track: gray-100
                  }}
                >
                  {currentContent.map((item, index) => (
                    <ContentRenderer key={index} content={item.content} title={generateInputTitle(item.name)} />
                  ))}
                </div>
              ) : (
                <div>
                  <ContentRenderer content="No content available" />
                </div>
              )}
            </div>
          </div>

          {/* Metadata Card */}
          {(() => {
            console.log('[MetadataCard] currentMetadata:', currentMetadata)
            console.log('[MetadataCard] currentMetadata.length:', currentMetadata.length)
            return currentMetadata.length > 0
          })() && (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-2 text-xs">
                  {currentMetadata.map((item, index) => {
                    console.log(`[MetadataCard] Rendering item ${index}:`, item)
                    return (
                      <div key={index}>
                        {item.name ? (
                          <>
                            <span className="font-medium text-gray-600">{item.name}: </span>
                            <span className="text-gray-900">
                              {renderInlineContent(item.value)}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-900">
                            {renderInlineContent(item.value)}
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
              className="h-full w-1 bg-transparent group-hover:bg-indigo-400 transition-colors duration-200"
              style={{ backgroundColor: isDragging ? "rgb(79 70 229)" : "" }}
            ></div>
          </div>
        </div>

        {/* Right Column - Evaluation Form */}
        <div className="pl-4" style={{ width: `${100 - leftColumnWidth}%` }}>
          {/* Instructions Panel - conditionally rendered */}
          {showInstructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg leading-6 font-medium text-blue-900">Instructions</h3>
                </div>
                <p className="text-sm text-blue-800">{evaluation.instructions}</p>
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
                      console.log(`[BackButton] Current item: ${currentItem}, attempting to go back`)
                      if (currentItem > 1) {
                        // Save current responses before navigating
                        saveCurrentResponsesBeforeNavigation()
                        const newItem = currentItem - 1
                        console.log(`[BackButton] Navigating from ${currentItem} to ${newItem}`)
                        setCurrentItem(newItem)
                      } else {
                        console.log(`[BackButton] Cannot go back from item ${currentItem}`)
                      }
                    }}
                    disabled={currentItem <= 1}
                    className={`p-1 rounded-md ${
                      currentItem <= 1
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap flex-shrink-0">
                      {currentItem} of {evaluation.totalItems}
                    </div>
                    <div className="flex-1 min-w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${progressWidth}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentItem < evaluation.totalItems && currentItem < furthestItemReached) {
                        // Save current responses before navigating
                        setAllResponses((prev) => ({
                          ...prev,
                          [currentItem]: formData,
                        }))
                        setCurrentItem(currentItem + 1)
                      }
                    }}
                    disabled={currentItem >= evaluation.totalItems || currentItem >= furthestItemReached}
                    className={`p-1 rounded-md ${
                      currentItem >= evaluation.totalItems || currentItem >= furthestItemReached
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {evaluation.criteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-3">
                    <div className="flex items-center">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {criterion.name}
                        {criterion.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                      </label>
                    </div>

                    {criterion.type === "yes-no" && (
                      <div className="flex flex-wrap gap-2">
                        {criterion.options.map((option: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleInputChange(criterion.id, option)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                              formData[`criterion-${criterion.id}`] === option
                                ? isReviewComplete 
                                  ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                                  : "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600"
                                : isReviewComplete
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                            disabled={isReviewComplete}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {criterion.type === "likert-scale" && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{criterion.likertLabels?.low || "Low"}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{criterion.likertLabels?.high || "High"}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 4, 5].map((number) => (
                            <button
                              key={number}
                              type="button"
                              onClick={() => handleInputChange(criterion.id, number.toString())}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                                formData[`criterion-${criterion.id}`] === number.toString()
                                  ? isReviewComplete 
                                    ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                                    : "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600"
                                  : isReviewComplete
                                    ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                              }`}
                              disabled={isReviewComplete}
                            >
                              {number}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {criterion.type === "custom-list" && (
                      <div className="flex flex-wrap gap-2">
                        {criterion.options.map((option: string, index: number) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleInputChange(criterion.id, option)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                              formData[`criterion-${criterion.id}`] === option
                                ? isReviewComplete 
                                  ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                                  : "bg-blue-500 dark:bg-blue-600 text-white border-blue-500 dark:border-blue-600"
                                : isReviewComplete
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                            disabled={isReviewComplete}
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
                        className={`block w-full border rounded-md shadow-sm sm:text-sm px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 ${
                          isReviewComplete
                            ? "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                        }`}
                        placeholder={`Enter ${criterion.name.toLowerCase()}...`}
                        disabled={isReviewComplete}
                      />
                    )}
                  </div>
                ))}
              </form>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                    canSubmit && !isSubmitting
                      ? "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      : "bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={handleSubmit}
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
                
                {/* Completion message */}
                {isReviewComplete && (
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <svg className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Thank you! Your evaluation has been completed successfully.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
