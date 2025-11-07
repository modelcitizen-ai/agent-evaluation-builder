"use client"

import { useRouter } from "next/navigation"
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import { useDataScientistDataInitialization } from "@/hooks/use-data-scientist-data-initialization"
import { useDataScientistOperations } from "@/hooks/use-data-scientist-operations"
import { useDataScientistUIHelpers } from "@/hooks/use-data-scientist-ui-helpers"

export default function DataScientistPage() {
  const router = useRouter()
  
  // Initialize data and state management
  const { evaluations, isLoading, error } = useDataScientistDataInitialization()
  
  // Business operations and navigation
  const {
    handleEditEvaluation,
    handleViewProgress,
    handleAssignReviewers,
    handleDeleteEvaluation,
    calculateUniqueSamples,
    getStatusBadgeClass,
    getStatusDisplayText
  } = useDataScientistOperations()
  
  // UI state and helpers
  const {
    openDropdown,
    toggleDropdown,
    closeDropdown,
    isDropdownOpen,
    getEvaluationStats,
    generateEvaluationDescription
  } = useDataScientistUIHelpers()

  // Page actions for header
  const actions = (
    <button
      onClick={() => router.push("/data-scientist/new")}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Create Project
    </button>
  )

  // Get evaluation statistics for display
  const stats = getEvaluationStats(evaluations)

  // Add a loading state to prevent flicker
  if (isLoading) {
    return (
      <PageLayout title="My Projects" actions={actions}>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  // Show error if one occurred
  if (error) {
    return (
      <PageLayout title="My Projects" actions={actions}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="My Projects" actions={actions}>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground text-sm font-medium">
                    {stats.draft}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Draft</dt>
                  <dd className="text-lg font-medium text-foreground">
                    {stats.draft} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground text-sm font-medium">
                    {stats.active}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Active</dt>
                  <dd className="text-lg font-medium text-foreground">
                    {stats.active} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground text-sm font-medium">
                    {stats.completed}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-muted-foreground truncate">Completed</dt>
                  <dd className="text-lg font-medium text-foreground">
                    {stats.completed} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-card shadow overflow-visible sm:rounded-md border border-border">
        <div className="px-4 py-5 sm:px-6 border-b border-border">
          <h3 className="text-lg leading-6 font-medium text-foreground">Recent Projects</h3>
        </div>
        <div className="bg-card shadow overflow-visible sm:rounded-md">
          <ul className="divide-y divide-border">
            {evaluations.length === 0 ? (
              <li className="py-4 px-6 text-center text-muted-foreground">No evaluations found. Create your first evaluation.</li>
            ) : (
              evaluations.map((evaluation) => {
                const uniqueSamples = calculateUniqueSamples(evaluation)
                const evaluationDescription = generateEvaluationDescription(evaluation, uniqueSamples)
                
                return (
                  <li key={evaluation.id} className={isDropdownOpen(evaluation.id) ? "relative z-50" : ""}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <div>
                            <button
                              onClick={() => handleEditEvaluation(evaluation.id)}
                              className="text-sm font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors duration-200 ease-in-out cursor-pointer text-left"
                            >
                              {evaluation.name}
                            </button>
                            <p className="text-sm text-gray-500">
                              {evaluationDescription}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span
                            className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(evaluation.status)}`}
                          >
                            {getStatusDisplayText(evaluation.status)}
                          </span>
                          <div className="relative z-10">
                            <button
                              onClick={() => toggleDropdown(evaluation.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 relative z-10"
                            >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                            {isDropdownOpen(evaluation.id) && (
                              <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg z-[99999] border border-border dropdown-menu">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      handleEditEvaluation(evaluation.id)
                                      closeDropdown()
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      router.push(`/reviewer/task/${evaluation.id}?from=data-scientist`)
                                      closeDropdown()
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Preview
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleViewProgress(evaluation.id)
                                      closeDropdown()
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    View Progress
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleAssignReviewers(evaluation.id)
                                      closeDropdown()
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    Add Reviewers
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteEvaluation(evaluation.id)
                                      closeDropdown()
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
