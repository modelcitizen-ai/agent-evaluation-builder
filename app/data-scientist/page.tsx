"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useLayoutEffect } from "react"
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import { getEvaluations, createEvaluation, deleteEvaluation } from "@/lib/client-db"

interface Evaluation {
  id: number
  name: string
  status: string
  totalItems: number
  createdAt: string
  completedAt?: string
  criteria: any[]
  instructions?: string
  columnRoles?: any[]
  data?: any[]
}

export default function DataScientistPage() {
  const router = useRouter()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useLayoutEffect(() => {
    // Define function to load data
    const loadData = async () => {
      console.log('Starting to load data in data-scientist page');
      try {
        // Load evaluations from localStorage
        console.log('Loading evaluations from localStorage');
        const dbEvaluations = await getEvaluations();
        console.log('Loaded evaluations:', dbEvaluations);
        
        // Check completion status for each active evaluation
        let hasUpdates = false;
        for (const evaluation of dbEvaluations) {
          if (evaluation.status === "active") {
            const wasUpdated = await updateEvaluationStatus(evaluation.id);
            if (wasUpdated) {
              hasUpdates = true;
            }
          }
        }
        
        // Force a comprehensive completion check on page load
        console.log('[loadData] Running comprehensive completion check on page load');
        const forceCheckUpdates = await forceCheckAllEvaluationCompletions();
        if (forceCheckUpdates > 0) {
          hasUpdates = true;
          console.log(`[loadData] Comprehensive check updated ${forceCheckUpdates} evaluation(s)`);
        }
        
        // Reload evaluations to get the updated status if any were updated
        const updatedEvaluations = hasUpdates 
          ? await getEvaluations()
          : dbEvaluations;
        
        // Set evaluations with updated status
        console.log('Setting evaluations from database with updated status');
        setEvaluations(updatedEvaluations);
      } catch (err) {
        console.error("Error loading evaluations:", err);
        console.error("Error details:", JSON.stringify(err, null, 2));
        setError("Failed to load evaluations. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Set up periodic checking for completion status (every 3 seconds)
    const intervalId = setInterval(async () => {
      try {
        // Only check if page is visible
        if (document.visibilityState === "visible") {
          console.log('[periodic check] Checking evaluation completion status');
          
          // Run comprehensive check instead of just active evaluations
          const comprehensiveUpdates = await forceCheckAllEvaluationCompletions();
          
          // If any updates were made, refresh the evaluations list
          if (comprehensiveUpdates > 0) {
            console.log('[periodic check] Updates detected, refreshing evaluations list');
            const refreshedEvaluations = await getEvaluations();
            setEvaluations(refreshedEvaluations);
          }
        }
      } catch (error) {
        console.error('[periodic check] Error checking evaluation status:', error);
      }
    }, 3000); // Check every 3 seconds
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [router]);

  const actions = (
    <div className="flex space-x-3">
      <button
        onClick={() => router.push("/data-scientist/new")}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        New Evaluation
      </button>
    </div>
  );

  const handleEditEvaluation = (evaluationId: number) => {
    router.push(`/data-scientist/edit/${evaluationId}`);
  };

  const handleViewProgress = (evaluationId: number) => {
    router.push(`/data-scientist/evaluation/${evaluationId}/progress`);
  };

  const handleDeleteEvaluation = async (evaluationId: number) => {
    if (confirm("Are you sure you want to delete this evaluation? This action cannot be undone.")) {
      try {
        const success = await deleteEvaluation(evaluationId);
        
        if (success) {
          const updatedEvaluations = evaluations.filter((evaluation) => evaluation.id !== evaluationId);
          setEvaluations(updatedEvaluations);
        } else {
          alert("Failed to delete evaluation. Please try again.");
        }
      } catch (err) {
        console.error("Error deleting evaluation:", err);
        alert("An error occurred while deleting the evaluation.");
      }
    }
  };

  const handleAssignReviewers = (evaluationId: number) => {
    router.push(`/data-scientist/new/assign-reviewers?evaluationId=${evaluationId}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown !== null) {
        // Check if the click is inside a dropdown menu
        const target = event.target as Node;
        const dropdowns = document.querySelectorAll(".dropdown-menu");
        let isClickInsideDropdown = false;

        dropdowns.forEach((dropdown) => {
          if (dropdown.contains(target)) {
            isClickInsideDropdown = true;
          }
        });

        if (!isClickInsideDropdown) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openDropdown]);

  // Add event listener for evaluation completion
  useEffect(() => {
    const handleEvaluationCompleted = async (event: any) => {
      try {
        const { evaluationId } = event.detail;
        console.log(`[evaluationCompleted] Received completion event for evaluation ${evaluationId}`);
        
        // Check if the evaluation status needs to be updated
        const wasUpdated = await updateEvaluationStatus(evaluationId);
        
        if (wasUpdated) {
          console.log(`[evaluationCompleted] Evaluation ${evaluationId} status was updated, refreshing list`);
          const refreshedEvaluations = await getEvaluations();
          setEvaluations(refreshedEvaluations);
        }
      } catch (error) {
        console.error('[evaluationCompleted] Error handling completion event:', error);
      }
    };
    
    // Add event listener
    window.addEventListener('evaluationCompleted', handleEvaluationCompleted);
    
    // Clean up
    return () => {
      window.removeEventListener('evaluationCompleted', handleEvaluationCompleted);
    };
  }, []);

  // Force check all evaluations for completion (comprehensive check)
  const forceCheckAllEvaluationCompletions = async () => {
    try {
      console.log('[forceCheckAllEvaluationCompletions] Starting comprehensive completion check');
      const allEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]");
      const allReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]");
      
      let updatedCount = 0;
      let hasReviewerUpdates = false;
      
      for (const evaluation of allEvaluations) {
        // Check all evaluations, not just active ones
        if (evaluation.status !== "completed") {
          const assignedReviewers = allReviewers.filter(
            (reviewer: any) => reviewer.evaluationId === evaluation.id.toString() || reviewer.evaluationId === evaluation.id
          );
          
          if (assignedReviewers.length > 0) {
            // Check completion using individual reviewer status only (fixed bug where global completions affected all reviewers)
            const allCompleted = assignedReviewers.every((reviewer: any) => {
              // Individual reviewer is completed if they have completed all tasks OR are explicitly marked completed
              const completedByStatus = reviewer.status === "completed";
              const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0;
              
              const isComplete = completedByStatus || completedByCount;
              
              // Log detailed checking for debugging
              console.log(`[forceCheckAllEvaluationCompletions] Reviewer ${reviewer.name} for eval ${evaluation.id}:`, {
                status: reviewer.status,
                completedByStatus,
                completed: reviewer.completed,
                total: reviewer.total,
                completedByCount,
                isComplete
              });
              
              // Update reviewer status if they completed all tasks but status hasn't been updated
              if (completedByCount && reviewer.status !== "completed") {
                reviewer.status = "completed";
                hasReviewerUpdates = true;
                console.log(`[forceCheckAllEvaluationCompletions] Updated reviewer ${reviewer.name} to completed status (completed all tasks)`);
              }
              
              return isComplete;
            });
            
            if (allCompleted) {
              console.log(`[forceCheckAllEvaluationCompletions] Found completed evaluation: ${evaluation.name} (${evaluation.id})`);
              const wasUpdated = await updateEvaluationStatus(evaluation.id);
              if (wasUpdated) {
                updatedCount++;
              }
            }
          }
        }
      }
      
      // Save reviewer updates if any were made
      if (hasReviewerUpdates) {
        localStorage.setItem("evaluationReviewers", JSON.stringify(allReviewers));
        console.log(`[forceCheckAllEvaluationCompletions] Saved reviewer status updates`);
      }
      
      console.log(`[forceCheckAllEvaluationCompletions] Updated ${updatedCount} evaluation(s)`);
      return updatedCount;
    } catch (error) {
      console.error('[forceCheckAllEvaluationCompletions] Error during comprehensive check:', error);
      return 0;
    }
  }

  // Check if all assigned reviewers have completed an evaluation
  const checkIfEvaluationIsComplete = (evaluationId: number) => {
    try {
      // Get the evaluation reviewers for this evaluation
      const evaluationReviewers = JSON.parse(localStorage.getItem("evaluationReviewers") || "[]")
      const evaluationAssignedReviewers = evaluationReviewers.filter(
        (reviewer: any) => reviewer.evaluationId === evaluationId.toString() || reviewer.evaluationId === evaluationId
      )
      
      // If there are no assigned reviewers, evaluation is not complete
      if (evaluationAssignedReviewers.length === 0) {
        console.log(`[checkIfEvaluationIsComplete] No assigned reviewers found for evaluation ${evaluationId}`);
        return false
      }
      
      // Check if all assigned reviewers have completed their evaluations (individual status only)
      const allCompleted = evaluationAssignedReviewers.every((reviewer: any) => {
        // Individual reviewer is completed if they have completed all tasks OR are explicitly marked completed
        const completedByStatus = reviewer.status === "completed";
        const completedByCount = reviewer.completed === reviewer.total && reviewer.total > 0;
        
        const isComplete = completedByStatus || completedByCount;
        
        console.log(`[checkIfEvaluationIsComplete] Reviewer ${reviewer.name} for eval ${evaluationId}:`, {
          status: reviewer.status,
          completedByStatus,
          completed: reviewer.completed,
          total: reviewer.total, 
          completedByCount,
          isComplete
        });
        
        return isComplete;
      });
      
      // Log detailed completion information for debugging
      console.log(`[checkIfEvaluationIsComplete] Evaluation ${evaluationId}: ${allCompleted ? 'Complete' : 'Incomplete'}. 
        ${evaluationAssignedReviewers.length} reviewers, 
        ${evaluationAssignedReviewers.filter((r: any) => r.status === "completed").length} completed by status,
        ${evaluationAssignedReviewers.filter((r: any) => r.completed === r.total && r.total > 0).length} completed by count`)
      
      return allCompleted
    } catch (error) {
      console.error(`[checkIfEvaluationIsComplete] Error checking evaluation ${evaluationId} completion:`, error)
      return false
    }
  }

  // Update the evaluation status in localStorage if all reviewers have completed it
  const updateEvaluationStatus = async (evaluationId: number) => {
    try {
      // Get the evaluation from localStorage
      const evaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      const evaluationIndex = evaluations.findIndex((e: any) => e.id === evaluationId)
      
      if (evaluationIndex === -1) {
        console.error(`[updateEvaluationStatus] Evaluation ${evaluationId} not found`)
        return false
      }
      
      // Check if all reviewers have completed this evaluation
      const isComplete = checkIfEvaluationIsComplete(evaluationId)
      
      // If all reviewers have completed and the evaluation is not already marked as completed
      if (isComplete && evaluations[evaluationIndex].status !== "completed") {
        // Update the evaluation status and set completion date
        evaluations[evaluationIndex].status = "completed"
        evaluations[evaluationIndex].completedAt = new Date().toISOString()
        
        // Save back to localStorage
        localStorage.setItem("evaluations", JSON.stringify(evaluations))
        console.log(`[updateEvaluationStatus] Updated evaluation ${evaluationId} status to completed`)
        
        // Return true to indicate an update was made
        return true
      }
      
      // No update was made
      return false
    } catch (error) {
      console.error(`[updateEvaluationStatus] Error updating evaluation ${evaluationId} status:`, error)
      return false
    }
  }

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
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {evaluations.filter((e) => e.status === "draft").length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {evaluations.filter((e) => e.status === "draft").length} total
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
                    {evaluations.filter((e) => e.status === "active").length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {evaluations.filter((e) => e.status === "active").length} total
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
                    {evaluations.filter((e) => e.status === "completed").length}
                  </span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {evaluations.filter((e) => e.status === "completed").length} total
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white shadow overflow-visible sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Projects</h3>
        </div>
        <div className="bg-white shadow overflow-visible sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {evaluations.length === 0 ? (
              <li className="py-4 px-6 text-center text-gray-500">No evaluations found. Create your first evaluation.</li>
            ) : (
              evaluations.map((evaluation) => (
                <li key={evaluation.id} className={openDropdown === evaluation.id ? "relative z-50" : ""}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
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
                            {(() => {
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
                                  .map(row => String(row[idColumn] || '').trim())
                                  .filter(id => id !== '' && id !== 'null' && id !== 'undefined')
                              );
                              return uniqueIds.size || evaluation.totalItems;
                            })()} Samples • {evaluation.totalItems} Questions • {evaluation.status === "completed" ? "Completed" : "Created"}{" "}
                            {new Date(evaluation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span
                          className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium ${
                            evaluation.status === "draft"
                              ? "bg-gray-100 text-gray-800"
                              : evaluation.status === "active"
                                ? "bg-green-100 text-green-800"
                                : evaluation.status === "completed"
                                  ? "bg-blue-100 text-gray-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {evaluation.status === "draft"
                            ? "Draft"
                            : evaluation.status === "active"
                              ? "Active"
                              : evaluation.status === "completed"
                                ? "Completed"
                                : evaluation.status}
                        </span>
                        <div className="relative z-10">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === evaluation.id ? null : evaluation.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 relative z-10"
                          >
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </button>
                          {openDropdown === evaluation.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-[99999] border border-gray-200 dropdown-menu">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleEditEvaluation(evaluation.id)
                                    setOpenDropdown(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    router.push(`/reviewer/task/${evaluation.id}?from=data-scientist`)
                                    setOpenDropdown(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Preview
                                </button>
                                <button
                                  onClick={() => {
                                    handleViewProgress(evaluation.id)
                                    setOpenDropdown(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  View Progress
                                </button>
                                <button
                                  onClick={() => {
                                    handleAssignReviewers(evaluation.id)
                                    setOpenDropdown(null)
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Add Reviewers
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteEvaluation(evaluation.id)
                                    setOpenDropdown(null)
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
              ))
            )}
          </ul>
        </div>
      </div>
    </PageLayout>
  );
}
