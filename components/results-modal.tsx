"use client"

import { useState, useMemo } from "react"
import { XMarkIcon, ArrowDownTrayIcon, FunnelIcon } from "@heroicons/react/24/outline"
import TableCellRenderer from "./table-cell-renderer"
import type { ResultsDataset } from "@/lib/results-dataset"

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  resultsDataset: ResultsDataset | null
}

export default function ResultsModal({ isOpen, onClose, resultsDataset }: ResultsModalProps) {
  const [filterReviewer, setFilterReviewer] = useState<string>("all")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Extract unique reviewers for filter dropdown
  const reviewers = useMemo(() => {
    if (!resultsDataset?.results) return []
    
    const reviewerSet = new Set<string>()
    resultsDataset.results.forEach((result) => {
      reviewerSet.add(result.reviewerName)
    })
    return Array.from(reviewerSet)
  }, [resultsDataset?.results])

  // Apply filters and sorting to results
  const filteredResults = useMemo(() => {
    if (!resultsDataset?.results) return []

    let filtered = [...resultsDataset.results]

    // Apply reviewer filter
    if (filterReviewer !== "all") {
      filtered = filtered.filter((result) => result.reviewerName === filterReviewer)
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let valueA, valueB

        // Handle special columns
        if (sortColumn === "reviewerName") {
          valueA = a.reviewerName
          valueB = b.reviewerName
        } else if (sortColumn === "submittedAt") {
          valueA = new Date(a.submittedAt).getTime()
          valueB = new Date(b.submittedAt).getTime()
        } else if (sortColumn === "timeSpent") {
          valueA = a.timeSpent
          valueB = b.timeSpent
        } else if (resultsDataset.columns.responses.includes(sortColumn)) {
          // Response column
          valueA = a.responses[sortColumn] || ""
          valueB = b.responses[sortColumn] || ""
        } else {
          // Original data column
          valueA = a.originalData[sortColumn]
          valueB = b.originalData[sortColumn]
        }

        // Compare values
        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [resultsDataset, filterReviewer, sortColumn, sortDirection])

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if already sorting by this column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Set new sort column and default to ascending
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Export results as CSV
  const handleExport = () => {
    if (!resultsDataset) return

    // CSV escaping function
    const escapeCSVField = (field: any): string => {
      if (field == null) return ""
      const str = String(field)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Prepare headers
    const headers = [
      "Item ID",
      "Reviewer", 
      "Submitted At",
      "Time (s)",
      ...resultsDataset.columns.original,
      ...resultsDataset.columns.responses
    ]

    // Prepare data rows
    const rows = filteredResults.map(result => [
      result.itemId,
      result.reviewerName,
      new Date(result.submittedAt).toLocaleString(),
      result.timeSpent.toFixed(1),
      ...resultsDataset.columns.original.map(col => result.originalData[col] ?? ""),
      ...resultsDataset.columns.responses.map(col => result.responses[col] ?? "")
    ])

    // Generate CSV content
    const csvContent = [
      headers.map(escapeCSVField).join(","),
      ...rows.map(row => row.map(escapeCSVField).join(","))
    ].join("\n")

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `${resultsDataset.evaluationName}_results.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full border">
          <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-foreground mb-4" id="modal-title">
                  Evaluation Results
                </h3>
                {/* Filters and Export */}
                <div className="flex justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-muted-foreground" />
                    <select
                      value={filterReviewer}
                      onChange={(e) => setFilterReviewer(e.target.value)}
                      className="border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
                    >
                      <option value="all">All Reviewers</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer} value={reviewer}>
                          {reviewer}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={!resultsDataset?.results.length}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      resultsDataset?.results.length
                        ? "text-foreground bg-background hover:bg-muted border"
                        : "text-muted-foreground bg-muted cursor-not-allowed border"
                    }`}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                </div>

                {/* Results Table */}
                <div className="mb-6">
                  <div className="border border-border rounded-lg overflow-auto max-h-[32rem]">
                    {resultsDataset?.results.length ? (
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                          <tr>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider align-bottom cursor-pointer hover:bg-muted/30 min-w-[12rem]"
                              onClick={() => handleSort("itemId")}
                            >
                              Item ID
                              {sortColumn === "itemId" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider align-bottom cursor-pointer hover:bg-muted/30 min-w-[12rem]"
                              onClick={() => handleSort("reviewerName")}
                            >
                              Reviewer
                              {sortColumn === "reviewerName" && (
                                <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider align-bottom cursor-pointer hover:bg-muted/30 min-w-[12rem]"
                              onClick={() => handleSort("submittedAt")}
                            >
                              Submitted
                              {sortColumn === "submittedAt" && (
                                <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider align-bottom cursor-pointer hover:bg-muted/30 min-w-[12rem]"
                              onClick={() => handleSort("timeSpent")}
                            >
                              Time (s)
                              {sortColumn === "timeSpent" && (
                                <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </th>

                            {/* Dynamic columns */}
                            {resultsDataset && (() => {
                              const columnRoles =
                                (resultsDataset as any).columnRoles ||
                                (resultsDataset as any).evaluation?.columnRoles ||
                                {}

                              return (
                                <>
                                  {/* Original Data Columns */}
                                  {resultsDataset.columns.original.map((column) => {
                                    const displayName = columnRoles[column]?.displayName || column
                                    return (
                                      <th
                                        key={column}
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider align-bottom cursor-pointer hover:bg-muted/30 min-w-[12rem] break-words"
                                        onClick={() => handleSort(column)}
                                      >
                                        {displayName}
                                        {sortColumn === column && (
                                          <span className="ml-1">
                                            {sortDirection === "asc" ? "↑" : "↓"}
                                          </span>
                                        )}
                                      </th>
                                    )
                                  })}

                                  {/* Response Columns */}
                                  {resultsDataset.columns.responses.map((column) => {
                                    const displayName = columnRoles[column]?.displayName || column
                                    return (
                                      <th
                                        key={column}
                                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider align-bottom cursor-pointer hover:bg-muted/30 bg-primary/10 min-w-[12rem] break-words"
                                        onClick={() => handleSort(column)}
                                      >
                                        {displayName}
                                        {sortColumn === column && (
                                          <span className="ml-1">
                                            {sortDirection === "asc" ? "↑" : "↓"}
                                          </span>
                                        )}
                                      </th>
                                    )
                                  })}
                                </>
                              )
                            })()}
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {filteredResults.map((result, index) => (
                            <tr key={`${result.reviewerId}-${result.itemId}-${index}`} className="hover:bg-muted/50">
                              <td className="px-6 py-4 text-sm text-foreground align-top">
                                <TableCellRenderer content={result.itemId} preserveFormatting={false} />
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground align-top">
                                <TableCellRenderer content={result.reviewerName} preserveFormatting={false} />
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground align-top">
                                <TableCellRenderer content={new Date(result.submittedAt).toLocaleString()} preserveFormatting={false} />
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground align-top">
                                <TableCellRenderer content={result.timeSpent.toFixed(1)} preserveFormatting={false} />
                              </td>

                              {/* Original Data Values */}
                              {resultsDataset.columns.original.map((column) => {
                                const value = result.originalData[column]
                                const isParagraph = typeof value === "string" && value.length > 120
                                return (
                                  <td
                                    key={column}
                                    className={`px-6 py-4 text-sm text-foreground align-top whitespace-normal break-words${isParagraph ? " min-w-[24rem]" : ""}`}
                                  >
                                    <TableCellRenderer content={value} preserveFormatting={false} />
                                  </td>
                                )
                              })}

                              {/* Response Values */}
                              {resultsDataset.columns.responses.map((column) => {
                                const value = result.responses[column] || null
                                const isParagraph = typeof value === "string" && value.length > 120
                                return (
                                  <td
                                    key={column}
                                    className={`px-6 py-4 text-sm text-foreground align-top bg-primary/10 whitespace-normal break-words${isParagraph ? " min-w-[24rem]" : ""}`}
                                  >
                                    <TableCellRenderer content={value} preserveFormatting={false} />
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-muted-foreground">
                          No results collected yet. Results will appear here as reviewers complete evaluations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}