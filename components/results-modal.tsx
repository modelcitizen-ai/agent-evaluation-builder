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
      // If field contains comma, quote, newline, or carriage return, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    // Create headers
    const headers = [
      "Item ID",
      "Reviewer",
      "Submitted At",
      "Time Spent (s)",
      ...resultsDataset.columns.original,
      ...resultsDataset.columns.responses,
    ]

    // Create rows with proper CSV escaping
    const rows = filteredResults.map((result) => [
      escapeCSVField(result.itemId),
      escapeCSVField(result.reviewerName),
      escapeCSVField(result.submittedAt),
      escapeCSVField(result.timeSpent.toString()),
      ...resultsDataset.columns.original.map((col) => escapeCSVField(result.originalData[col] || "")),
      ...resultsDataset.columns.responses.map((col) => escapeCSVField(result.responses[col] || "")),
    ])

    // Combine headers and rows with proper CSV formatting
    const csvContent = [
      headers.map(escapeCSVField).join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                  Evaluation Results
                </h3>            {/* Filters and Export */}
            <div className="flex justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterReviewer}
                  onChange={(e) => setFilterReviewer(e.target.value)}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${
                  resultsDataset?.results.length
                    ? "text-gray-700 bg-white hover:bg-gray-50"
                    : "text-gray-400 bg-gray-100 cursor-not-allowed"
                }`}
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>

            {/* Results Table */}
            <div className="mb-6">
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[32rem]">
              {resultsDataset?.results.length ? (
                <table className="min-w-full divide-y divide-gray-200">
<thead className="bg-gray-50">
  <tr>
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom cursor-pointer hover:bg-gray-100 min-w-[12rem]"
      onClick={() => handleSort("itemId")}
    >
      Item ID
      {sortColumn === "itemId" && <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>}
    </th>
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom cursor-pointer hover:bg-gray-100 min-w-[12rem]"
      onClick={() => handleSort("reviewerName")}
    >
      Reviewer
      {sortColumn === "reviewerName" && (
        <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom cursor-pointer hover:bg-gray-100 min-w-[12rem]"
      onClick={() => handleSort("submittedAt")}
    >
      Submitted
      {sortColumn === "submittedAt" && (
        <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom cursor-pointer hover:bg-gray-100 min-w-[12rem]"
      onClick={() => handleSort("timeSpent")}
    >
      Time (s)
      {sortColumn === "timeSpent" && (
        <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
      )}
    </th>

    {/* Get columnRoles from the best available source */}
    {(() => {
      const columnRoles =
        resultsDataset.columnRoles ||
        resultsDataset.evaluation?.columnRoles ||
        {};

      return (
        <>
          {/* Original Data Columns */}
          {resultsDataset.columns.original.map((column) => {
            const displayName = columnRoles[column]?.displayName || column;
            return (
              <th
                key={column}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom cursor-pointer hover:bg-gray-100 min-w-[12rem] break-words"
                onClick={() => handleSort(column)}
              >
                {displayName}
                {sortColumn === column && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            );
          })}

          {/* Response Columns */}
          {resultsDataset.columns.responses.map((column) => {
            const displayName = columnRoles[column]?.displayName || column;
            return (
              <th
                key={column}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-bottom cursor-pointer hover:bg-gray-100 bg-indigo-50 min-w-[12rem] break-words"
                onClick={() => handleSort(column)}
              >
                {displayName}
                {sortColumn === column && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            );
          })}
        </>
      );
    })()}
  </tr>
</thead>
                  <tbody className="bg-white divide-y divide-gray-200">
  {filteredResults.map((result, index) => (
    <tr key={`${result.reviewerId}-${result.itemId}-${index}`} className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm text-gray-900 align-top">
        <TableCellRenderer content={result.itemId} preserveFormatting={false} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 align-top">
        <TableCellRenderer content={result.reviewerName} preserveFormatting={false} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 align-top">
        <TableCellRenderer content={new Date(result.submittedAt).toLocaleString()} preserveFormatting={false} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 align-top">
        <TableCellRenderer content={result.timeSpent.toFixed(1)} preserveFormatting={false} />
      </td>

      {/* Original Data Values */}
      {resultsDataset.columns.original.map((column) => {
        const value = result.originalData[column];
        const isParagraph = typeof value === "string" && value.length > 120;
        return (
          <td
            key={column}
            className={`px-6 py-4 text-sm text-gray-900 align-top whitespace-normal break-words${isParagraph ? " min-w-[24rem]" : ""}`}
          >
            <TableCellRenderer content={value} preserveFormatting={false} />
          </td>
        );
      })}

      {/* Response Values */}
      {resultsDataset.columns.responses.map((column) => {
        const value = result.responses[column] || null;
        const isParagraph = typeof value === "string" && value.length > 120;
        return (
          <td
            key={column}
            className={`px-6 py-4 text-sm text-gray-900 align-top bg-indigo-50 whitespace-normal break-words${isParagraph ? " min-w-[24rem]" : ""}`}
          >
            <TableCellRenderer content={value} preserveFormatting={false} />
          </td>
        );
      })}
    </tr>
  ))}
</tbody>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-gray-500">
                    No results collected yet. Results will appear here as reviewers complete evaluations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}