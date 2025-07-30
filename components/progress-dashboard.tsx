"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import ResultsModal from "./results-modal"
import { getResultsDataset } from "@/lib/client-db"
import { getEvaluations, updateEvaluation } from "@/lib/client-db"
import { getReviewers, updateReviewer } from "@/lib/client-db"

// Helper function to format time in a human-readable way
const formatTime = (minutes: number): string => {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s`
  } else if (minutes < 60) {
    const wholeMins = Math.floor(minutes)
    const remainingSeconds = Math.round((minutes - wholeMins) * 60)
    if (remainingSeconds === 0) {
      return `${wholeMins}m`
    } else {
      return `${wholeMins}m ${remainingSeconds}s`
    }
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMins = Math.round(minutes % 60)
    if (remainingMins === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${remainingMins}m`
    }
  }
}

interface Reviewer {
  id: number
  name: string
  email: string
  evaluationId: string
  status: "active" | "completed" | "incomplete"
  completed: number
  total: number
  avgTime: string
}

interface ProgressDashboardProps {
  onBack?: () => void
  evaluationId?: number
}

export default function ProgressDashboard({ onBack, evaluationId }: ProgressDashboardProps) {
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false)
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Force check completion status function (similar to data scientist page)
  const forceCheckAllEvaluationCompletions = async () => {
    try {
      setIsUpdating(true);
      console.log('[ProgressDashboard] Starting force completion check');
      const allEvaluations = await getEvaluations();
      const allReviewers = await getReviewers();
      
      let updatedCount = 0;
      let hasReviewerUpdates = false;
      
      for (const evaluation of allEvaluations) {
        // Only check our specific evaluation if evaluationId is provided
        if (evaluationId && evaluation.id !== evaluationId) continue;
        
        const assignedReviewers = allReviewers.filter(
          (reviewer: any) => reviewer.evaluationId === evaluation.id.toString() || reviewer.evaluationId === evaluation.id
        );
        
        if (assignedReviewers.length > 0) {
          // Update reviewer status if they completed all tasks but status hasn't been updated
          for (const reviewer of assignedReviewers) {
            const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0;
            if (completedByCount && reviewer.status !== "completed") {
              await updateReviewer(reviewer.id, { status: "completed" });
              hasReviewerUpdates = true;
              console.log(`[ProgressDashboard] Updated reviewer ${reviewer.name} to completed status`);
            }
          }
          
          // Check and update individual reviewer statuses based on their individual completion
          const allCompleted = assignedReviewers.every((reviewer: any) => {
            const completedByStatus = reviewer.status === "completed";
            const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0;
            
            // Individual reviewer is completed if they have completed all tasks OR are explicitly marked completed
            const isComplete = completedByStatus || completedByCount;
            
            return isComplete;
          });
          
          // Only update evaluation status if it's not already completed and all reviewers are done
          if (allCompleted && evaluation.status !== "completed") {
            await updateEvaluation(evaluation.id, { 
              status: "completed",
              completedAt: new Date().toISOString()
            });
            updatedCount++;
            console.log(`[ProgressDashboard] Marked evaluation ${evaluation.name} as completed`);
          }
        }
      }
      
      // Always reload reviewers data to ensure latest state
      const filteredReviewers: Reviewer[] = await getReviewers(evaluationId ? parseInt(evaluationId.toString()) : undefined);
      setReviewers(filteredReviewers)
      
      // Also refresh results dataset if we have an evaluationId
      if (evaluationId) {
        try {
          const dataset = await getResultsDataset(evaluationId)
          setResultsDataset(dataset)
          console.log(`[ProgressDashboard] Refreshed results dataset - found ${dataset?.results?.length || 0} results`);
        } catch (error) {
          console.error('[ProgressDashboard] Error refreshing results dataset:', error)
        }
      }
      
      if (updatedCount > 0 || hasReviewerUpdates) {
        console.log(`[ProgressDashboard] Refreshed reviewer data after ${updatedCount} evaluation updates and reviewer status updates`);
      } else {
        console.log(`[ProgressDashboard] Refreshed reviewer data - no changes needed`);
      }
      
      return updatedCount;
    } catch (error) {
      console.error('[ProgressDashboard] Error during force completion check:', error);
      return 0;
    } finally {
      setIsUpdating(false);
    }
  }

  // Load reviewers from database and setup update listener
  useEffect(() => {
    const loadReviewers = async () => {
      try {
        const filteredReviewers: Reviewer[] = await getReviewers(evaluationId ? parseInt(evaluationId.toString()) : undefined);
        // No need to recalculate completed count since it's now accurately tracked
        setReviewers(filteredReviewers)
      } catch (error) {
        console.error("Error loading reviewers:", error)
      }
    }

    // Initial load
    loadReviewers()

    // Run force completion check on initial load
    forceCheckAllEvaluationCompletions()

    // Listen for custom events (from same tab) - keeping these for real-time updates
    const handleCustomUpdate = () => {
      loadReviewers()
      // Also run force completion check when events are received
      forceCheckAllEvaluationCompletions()
    }

    window.addEventListener("evaluationCompleted", handleCustomUpdate)
    window.addEventListener("reviewerStatusUpdated", handleCustomUpdate)
    window.addEventListener("reviewerProgressUpdated", handleCustomUpdate)
    
    // Listen for visibility changes to immediately update when user returns to page
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log('[ProgressDashboard] Page became visible - immediate update');
        forceCheckAllEvaluationCompletions();
      }
    }
    
    // Listen for focus events to update when user switches back to tab
    const handleFocus = () => {
      console.log('[ProgressDashboard] Window focused - immediate update');
      forceCheckAllEvaluationCompletions();
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Set up periodic checking for completion status (every 5 seconds for balance of real-time and performance)
    const intervalId = setInterval(async () => {
      try {
        // Only check if page is visible
        if (document.visibilityState === "visible") {
          console.log('[ProgressDashboard] Periodic check');
          const updates = await forceCheckAllEvaluationCompletions();
          if (updates > 0) {
            console.log(`[ProgressDashboard] Periodic check updated ${updates} evaluation(s)`);
          }
        }
      } catch (error) {
        console.error('[ProgressDashboard] Error in periodic check:', error);
      }
    }, 5000); // Check every 5 seconds for balance of real-time updates and performance

    // Cleanup listeners
    return () => {
      window.removeEventListener("evaluationCompleted", handleCustomUpdate)
      window.removeEventListener("reviewerStatusUpdated", handleCustomUpdate)
      window.removeEventListener("reviewerProgressUpdated", handleCustomUpdate)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      clearInterval(intervalId)
    }
  }, [evaluationId])

  // Results dataset state
  const [resultsDataset, setResultsDataset] = useState<any>(null)

  // Load results dataset when evaluationId changes
  useEffect(() => {
    if (!evaluationId) {
      setResultsDataset(null)
      return
    }

    const loadResultsDataset = async () => {
      try {
        const dataset = await getResultsDataset(evaluationId)
        setResultsDataset(dataset)
      } catch (error) {
        console.error('Error loading results dataset:', error)
        setResultsDataset(null)
      }
    }

    loadResultsDataset()
  }, [evaluationId])

  // Get results dataset for this evaluation
  // const resultsDataset = evaluationId ? getResultsDataset(evaluationId) : null

  // Function to calculate actual completed count from results dataset
  const getActualCompletedCount = useCallback((reviewerId: string | number) => {
    if (!resultsDataset || !resultsDataset.results) return 0
    
    return resultsDataset.results.filter((result: any) => 
      result.reviewerId === reviewerId || result.reviewerId === String(reviewerId)
    ).length
  }, [resultsDataset])

  // Function to determine accurate reviewer status
  const getReviewerStatus = useCallback((reviewer: Reviewer) => {
    // Get actual completed count from results dataset
    const actualCompleted = getActualCompletedCount(reviewer.id)
    
    // Check if reviewer has completed all their tasks (using actual count)
    if (actualCompleted === reviewer.total && reviewer.total > 0) {
      return "completed"
    }
    // Check if reviewer status is explicitly completed (most reliable)
    if (reviewer.status === "completed") {
      return "completed"
    }
    // Check if reviewer is incomplete (keep existing incomplete logic)
    if (reviewer.status === "incomplete") {
      return "incomplete"
    }
    // Default to active if they have tasks to complete or are in progress
    return "active"
  }, [getActualCompletedCount])

  // Memoized calculations that update when reviewers change
  const { completionRate, totalCompleted, totalTasks, avgTimeToCompleteEvaluation } = useMemo(() => {
    // Calculate completion rate based on reviewers who finished entire evaluation
    const completedReviewers = reviewers.filter(r => getReviewerStatus(r) === "completed").length;
    const rate = reviewers.length > 0 ? Math.round((completedReviewers / reviewers.length) * 100) : 0;
    
    // Calculate total questions completed across all reviewers (using actual counts from results dataset)
    const completed = reviewers.reduce((sum: number, r: Reviewer) => {
      return sum + getActualCompletedCount(r.id)
    }, 0);
    const tasks = reviewers.reduce((sum: number, r: Reviewer) => sum + r.total, 0);
    
    // Calculate average time to complete entire evaluation (in minutes)
    const completedReviewersWithTime = reviewers.filter(r => {
      const isCompleted = getReviewerStatus(r) === "completed";
      const hasTimeData = parseFloat(r.avgTime) > 0;
      return isCompleted && hasTimeData;
    });
    
    // Calculate average time to complete entire evaluation (in minutes) across all completed reviewers
    const avgTimeToCompleteEvaluation = completedReviewersWithTime.length > 0
      ? completedReviewersWithTime.reduce((sum, r) => {
          const avgTimePerQuestion = parseFloat(r.avgTime) || 0; // seconds per question
          const totalTimeForEvaluation = avgTimePerQuestion * r.total; // total seconds for evaluation
          return sum + (totalTimeForEvaluation / 60); // convert to minutes
        }, 0) / completedReviewersWithTime.length
      : 0;
    
    return {
      completionRate: rate,
      totalCompleted: completed,
      totalTasks: tasks,
      avgTimeToCompleteEvaluation: avgTimeToCompleteEvaluation
    };
  }, [reviewers, getReviewerStatus, getActualCompletedCount]);

  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-gray-800"
      case "incomplete":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter reviewers based on selected filter with accurate status
  const filteredReviewers = reviewers.filter((reviewer) => {
    const actualStatus = getReviewerStatus(reviewer)
    if (selectedFilter === "all") return true
    return actualStatus === selectedFilter
  })

  // Add Back button at the top of the component, before the Overview Metrics
  return (
    <>
      {/* Back Button */}
      {onBack && (
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
      )}

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {reviewers.length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Reviewers</dt>
                  <dd className="text-lg font-medium text-gray-900">{reviewers.length} total</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {reviewers.filter((r: Reviewer) => getReviewerStatus(r) !== "completed").length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Incomplete Reviewers</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {reviewers.filter((r: Reviewer) => getReviewerStatus(r) !== "completed").length} of {reviewers.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{completionRate}%</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {completionRate}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {avgTimeToCompleteEvaluation > 0 ? avgTimeToCompleteEvaluation.toFixed(0) : "---"}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Completion Time</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {avgTimeToCompleteEvaluation > 0 ? formatTime(avgTimeToCompleteEvaluation) : "---"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviewers Table */}
      <div className="bg-white shadow overflow-visible sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Reviewer Progress</h3>
              {isUpdating && (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-600">Updating...</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <option value="all">All Reviewers</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>

              {/* Refresh Status Button */}
              <button
                onClick={async () => {
                  console.log('[ProgressDashboard] 🔄 Manual refresh triggered');
                  
                  // Run force completion check
                  const updates = await forceCheckAllEvaluationCompletions();
                  console.log(`[ProgressDashboard] Manual refresh completed - ${updates} evaluation(s) updated`);
                  
                  // Force reload reviewers data from localStorage
                  const storedReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
                  const filteredReviewers: Reviewer[] = storedReviewers.filter(
                    (reviewer: any) => !evaluationId || reviewer.evaluationId === evaluationId.toString(),
                  )
                  
                  // Update React state to trigger re-render
                  setReviewers(filteredReviewers)
                  console.log(`[ProgressDashboard] ✅ Forced reload of ${filteredReviewers.length} reviewer(s) from localStorage`);
                  
                  // Log each reviewer's current status for debugging
                  filteredReviewers.forEach(reviewer => {
                    const actualCompleted = getActualCompletedCount(reviewer.id)
                    const actualStatus = actualCompleted === reviewer.total && reviewer.total > 0 ? 'completed' : 
                                       reviewer.status === 'completed' ? 'completed' :
                                       reviewer.status === 'incomplete' ? 'incomplete' : 'active';
                    console.log(`[ProgressDashboard] Reviewer ${reviewer.name}: ${actualCompleted}/${reviewer.total} (localStorage: ${reviewer.completed}) - Status: ${reviewer.status} -> Display: ${actualStatus}`);
                  });
                  
                  // Provide user feedback
                  console.log(`[ProgressDashboard] ✅ Refresh complete - check the status column for any updates`);
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                🔄 Refresh Status
              </button>

              {/* View Results Button */}
              <button
                onClick={() => setIsResultsModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                View Results
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-visible">
          {reviewers.length === 0 ? (
            <div className="py-4 px-6 text-center text-gray-500">
              No reviewers assigned to this evaluation. Add reviewers to track progress.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                    Reviewer
                  </th>
                  <th className="pl-4 pr-8 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Progress
                  </th>
                  <th className="pl-12 pr-8 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6 whitespace-nowrap">Avg Response Time</th>
                  <th className="px-8 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReviewers.map((reviewer: Reviewer) => {
                  const actualStatus = getReviewerStatus(reviewer)
                  return (
                    <tr key={reviewer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap w-1/2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{reviewer.name}</div>
                          <div className="text-sm text-gray-500">{reviewer.email}</div>
                        </div>
                      </td>
                      <td className="pl-4 pr-8 py-4 whitespace-nowrap text-center w-1/6">
                        <div className="flex items-center justify-center space-x-3">
                          <span className="text-sm text-gray-900 min-w-[2rem]">
                            {getActualCompletedCount(reviewer.id)}/{reviewer.total}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-in-out" 
                              style={{ 
                                width: `${reviewer.total > 0 ? Math.round((getActualCompletedCount(reviewer.id) / reviewer.total) * 100) : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="pl-12 pr-8 py-4 whitespace-nowrap text-center text-sm text-gray-900 w-1/6">
                        {reviewer.avgTime ? formatTime(parseFloat(reviewer.avgTime) / 60) : "---"}
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap text-right w-1/6">
                        <span
                          className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium ${getStatusColor(actualStatus)}`}
                        >
                          {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Results Modal */}
      <ResultsModal
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        resultsDataset={resultsDataset}
      />
    </>
  )
}
