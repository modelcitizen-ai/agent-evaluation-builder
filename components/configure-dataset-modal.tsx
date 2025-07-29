"use client"

import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import TableCellRenderer from "./table-cell-renderer"

interface ColumnRole {
  id: string
  name: string
  suggestedRole: string
  confidence: number
  reason: string
  userRole: "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded" | "Input Data"
  displayName?: string
  labelVisible?: boolean
}

interface ConfigureDatasetModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedData: any[]
  dataColumns: string[]
  previewData: any[]
  columnRoles: ColumnRole[]
  randomizationEnabled: boolean
  onUpdateColumnRole: (
    columnId: string,
    newRole: "Input" | "Model Output" | "Reference" | "Metadata" | "Excluded"
  ) => void
  onUpdateColumnDisplayName: (columnId: string, displayName: string) => void
  onUpdateColumnVisibility: (columnId: string, visible: boolean) => void
  onUpdateRandomization: (enabled: boolean) => void
}

export default function ConfigureDatasetModal({
  isOpen,
  onClose,
  uploadedData,
  dataColumns,
  previewData,
  columnRoles,
  randomizationEnabled,
  onUpdateColumnRole,
  onUpdateColumnDisplayName,
  onUpdateColumnVisibility,
  onUpdateRandomization,
}: ConfigureDatasetModalProps) {
  if (!isOpen) return null

  const tableHeaders = uploadedData.length > 0 ? dataColumns : Object.keys(previewData[0] || {})
  const tableData = uploadedData.length > 0 ? uploadedData.slice(0, 5) : previewData

  const allowedRoles = ["Input", "Model Output", "Reference", "Metadata", "Excluded"]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2.5">Configure Dataset</h3>
                <p className="text-sm text-gray-600">
                  The system has preselected columns for evaluation. You may adjust selections and their UI-visible labels as needed.
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Data Preview Section */}
            <div className="mb-6">
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    {/* Dropdown Row */}
                    <tr className="bg-gray-50">
                      {tableHeaders.map((header) => {
                        const columnConfig = columnRoles.find((col) => col.name === header)
                        return (
                          <th key={header} className="px-6 py-3 text-left">
                            <div className="flex items-center">
                              <select
                                value={allowedRoles.includes(columnConfig?.userRole || "") ? columnConfig?.userRole : "Metadata"}
                                onChange={(e) =>
                                  onUpdateColumnRole(
                                    header,
                                    e.target.value as
                                      | "Input"
                                      | "Model Output"
                                      | "Reference"
                                      | "Metadata"
                                      | "Excluded"
                                  )
                                }
                                className="block w-48 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <option value="Input">Input (Prompt)</option>
                                <option value="Model Output">Output (Completion)</option>
                                <option value="Reference">Reference</option>
                                <option value="Metadata">Metadata</option>
                                <option value="Excluded">Excluded</option>
                              </select>
                              <div className="ml-1.5 relative">
                                <div className="group">
                                  <svg
                                    className="h-4 w-4 text-gray-400 cursor-help"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>

                                  {/* Tooltip */}
                                  <div
                                    className={`absolute top-full mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[100] ${
                                      header === tableHeaders[0]
                                        ? "left-0"
                                        : header === tableHeaders[tableHeaders.length - 1]
                                          ? "right-0"
                                          : "left-1/2 transform -translate-x-1/2"
                                    }`}
                                  >
                                    <div className="font-medium mb-1">
                                      {(() => {
                                        const role = columnConfig?.userRole || columnConfig?.suggestedRole || "Metadata";
                                        if (role === "Input" || role === "Input Data") return "Input (Prompt)";
                                        if (role === "Model Output") return "Output (Completion)";
                                        return role;
                                      })()}
                                    </div>
                                    <div className="text-gray-300 font-normal">
                                      {columnConfig?.userRole === "Excluded"
                                        ? `${columnConfig?.reason || "No analysis available for this column"}. This data may not be needed for the evaluation.`
                                        : columnConfig?.reason ||
                                          "No analysis available for this column"}
                                    </div>

                                    {/* Tooltip arrow pointing up - positioned based on tooltip alignment */}
                                    <div
                                      className={`absolute bottom-full border-4 border-transparent border-b-gray-900 ${
                                        header === tableHeaders[0]
                                          ? "left-4"
                                          : header === tableHeaders[tableHeaders.length - 1]
                                            ? "right-4"
                                            : "left-1/2 transform -translate-x-1/2"
                                      }`}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                    {/* UI Label Input Row */}
                    <tr className="bg-blue-50">
                      {tableHeaders.map((header) => {
                        const columnConfig = columnRoles.find((col) => col.name === header)
                        const isLabelVisible = columnConfig?.labelVisible !== false // default to true
                        return (
                          <th key={header} className="px-6 pt-3 pb-2 text-left">
                            <div className="flex items-center">
                              <input
                                type="text"
                                placeholder={isLabelVisible ? "UI-Visible Label" : "Label is off"}
                                value={columnConfig?.displayName || ""}
                                onChange={(e) => onUpdateColumnDisplayName(header, e.target.value)}
                                disabled={!isLabelVisible}
                                className={`block w-48 px-3 py-1.5 text-sm font-semibold rounded-md border border-gray-300 shadow-sm text-gray-700 bg-white placeholder-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  !isLabelVisible ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => onUpdateColumnVisibility(header, !isLabelVisible)}
                                className="ml-0.5 p-1 text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                                title={isLabelVisible ? "Hide label" : "Show label"}
                              >
                                {isLabelVisible ? (
                                  <EyeIcon className="h-4 w-4" />
                                ) : (
                                  <EyeSlashIcon className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                    {/* Column Name Row */}
                    <tr className="bg-blue-50">
                      {tableHeaders.map((header) => (
                        <th key={header} className="px-6 py-2 text-left text-sm font-semibold text-gray-900">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.entries(row).map(([key, value], cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 text-sm text-gray-900 align-top">
                            <TableCellRenderer content={value as string | number | boolean | null | undefined} preserveFormatting={false} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse sm:items-center">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              >
                Save
              </button>
              <button
                onClick={onClose}
                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
              >
                Cancel
              </button>
            </div>
            
            {/* Randomization Toggle */}
            <div className="flex items-center space-x-3 sm:mr-auto mt-3 sm:mt-0">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={randomizationEnabled}
                  onChange={(e) => onUpdateRandomization(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Randomize sample order</span>
              </label>
              <div className="text-xs text-gray-500">
                Present samples in random order to reduce bias
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
