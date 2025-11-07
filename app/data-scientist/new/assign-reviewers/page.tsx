"use client"

import type React from "react"

import { ClipboardDocumentIcon, DocumentArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import { useAssignReviewersDataInitialization } from "@/components/data-scientist/assign-reviewers/useAssignReviewersDataInitialization"
import { useAssignReviewersFormManagement } from "@/components/data-scientist/assign-reviewers/useAssignReviewersFormManagement"
import { useAssignReviewersUIHelpers } from "@/components/data-scientist/assign-reviewers/useAssignReviewersUIHelpers"

export default function AssignTeamPage() {
  // Use the data initialization hook
  const {
    reviewers,
    setReviewers,
    currentEvaluationId,
    setCurrentEvaluationId,
    uploadedReviewers,
    setUploadedReviewers,
    generateUniqueLink,
  } = useAssignReviewersDataInitialization()

  // Use the UI helpers hook
  const {
    handleBack,
    isUploading,
    setIsUploading,
    selectedFileName,
    setSelectedFileName,
    fileInputRef,
    handleFileUpload,
    copiedLinkId,
    setCopiedLinkId,
    handleCopyLink,
    handleExportCSV,
    clearFileInput,
  } = useAssignReviewersUIHelpers({
    reviewers,
    setUploadedReviewers,
  })

  // Use the form management hook
  const {
    reviewerName,
    setReviewerName,
    reviewerEmail,
    setReviewerEmail,
    reviewerNotes,
    setReviewerNotes,
    isGenerating,
    setIsGenerating,
    handleGenerateLink,
    handleBulkAdd,
    handleRemoveReviewer,
  } = useAssignReviewersFormManagement({
    reviewers,
    setReviewers,
    currentEvaluationId,
    uploadedReviewers,
    setUploadedReviewers,
    generateUniqueLink,
    clearFileInput,
  })

  return (
    <PageLayout title="Add Reviewers">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          My Projects
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Add Participant Form */}
        <div className="space-y-6">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
            <div className="px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Add a Reviewer</h3>
                <p className="text-sm text-gray-600">
                  Generate a unique evaluation link for each reviewer.
                </p>
              </div>

              <form onSubmit={handleGenerateLink} className="space-y-5">
                <div>
                  <label htmlFor="participant-name" className="block text-sm font-medium text-gray-900 mb-2">
                    Reviewer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="participant-name"
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                    placeholder="Reviewer Name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="participant-email" className="block text-sm font-medium text-gray-900 mb-2">
                    Email Address <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <input
                    id="participant-email"
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                    placeholder="name@company.com"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!reviewerName.trim() || isGenerating}
                    className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors ${
                      reviewerName.trim() && !isGenerating
                        ? "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isGenerating ? (
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
                        Generating Link...
                      </>
                    ) : (
                      "Add Reviewer"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
            <div className="px-6 py-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Upload Reviewers</h3>
                <p className="text-sm text-gray-600">
                  To add multiple reviewers at once, upload a CSV file that includes the headers: Name and Email.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Upload File <span className="text-gray-500 font-normal">(CSV or Excel)</span>
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Choose File
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedFileName || 'No file selected'}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleBulkAdd}
                  disabled={isUploading || uploadedReviewers.length === 0}
                  className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors ${
                    isUploading || uploadedReviewers.length === 0
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white"
                  }`}
                >
                  {isUploading ? (
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
                      Uploading...
                    </>
                  ) : (
                    "Add Reviewers"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* How It Works Instructions - moved under left column */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">How it works:</h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Enter the reviewer's name and optional contact information</li>
              <li>Click "Add Reviewer" to create a unique URL</li>
              <li>Share the generated link with the reviewer via email or Teams</li>
              <li>Track progress and view responses in the Reviewer Progress dashboard</li>
            </ol>
          </div>
        </div>

        {/* Right Column - Generated Reviewers */}
        <div className="space-y-6">
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
            <div className="px-6 py-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Evaluation Link</h3>
                  <button
                    onClick={handleExportCSV}
                    disabled={reviewers.length === 0}
                    className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors ${
                      reviewers.length > 0
                        ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                    }`}
                  >
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>

              {reviewers.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center mb-2">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">No reviewers yet</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1">Evaluation Link:</p>
                        <p className="text-xs text-gray-400 font-mono">Your link will appear here</p>
                      </div>
                      <button
                        disabled
                        className="ml-3 inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded-md text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
                      >
                        <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewers.map((reviewer) => (
                    <div
                      key={reviewer.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center mb-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">{reviewer.name}</h4>
                              {reviewer.email && (
                                <p className="text-sm text-gray-600 truncate">{reviewer.email}</p>
                              )}
                            </div>
                          </div>
                          {reviewer.notes && (
                            <p className="text-xs text-gray-500 line-clamp-2">{reviewer.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveReviewer(reviewer.id)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove reviewer"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 mb-1">Evaluation Link:</p>
                            <p className="text-xs text-gray-600 truncate font-mono">{reviewer.link}</p>
                          </div>
                          <button
                            onClick={() => handleCopyLink(reviewer.link, reviewer.id)}
                            className={`ml-3 inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded-md transition-colors ${
                              copiedLinkId === reviewer.id
                                ? "text-green-700 bg-green-50 border-green-300"
                                : "text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
                            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                          >
                            <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
                            {copiedLinkId === reviewer.id ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </PageLayout>
  )
}
