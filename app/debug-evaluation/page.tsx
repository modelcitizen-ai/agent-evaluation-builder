"use client"

import { useState, useEffect } from "react"

export default function DebugEvaluationPage() {
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem("evaluations")
    if (stored) {
      setEvaluations(JSON.parse(stored))
    }
  }, [])

  const clearEvaluations = () => {
    localStorage.removeItem("evaluations")
    setEvaluations([])
    setSelectedEvaluation(null)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Evaluations</h1>
      
      <div className="mb-4">
        <button
          onClick={clearEvaluations}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear All Evaluations
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evaluation List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Stored Evaluations</h2>
          <div className="space-y-2">
            {evaluations.map((evaluation, index) => (
              <div
                key={evaluation.id}
                className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedEvaluation(evaluation)}
              >
                <div className="font-medium">{evaluation.name}</div>
                <div className="text-sm text-gray-600">ID: {evaluation.id}</div>
                <div className="text-sm text-gray-600">
                  Data rows: {evaluation.data?.length || 0}
                </div>
                <div className="text-sm text-gray-600">
                  Column roles: {evaluation.columnRoles?.length || 0}
                </div>
              </div>
            ))}
            {evaluations.length === 0 && (
              <div className="text-gray-500">No evaluations found</div>
            )}
          </div>
        </div>

        {/* Evaluation Details */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Evaluation Details</h2>
          {selectedEvaluation ? (
            <div className="border rounded p-4">
              <h3 className="font-medium mb-3">{selectedEvaluation.name}</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Basic Info:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify({
                      id: selectedEvaluation.id,
                      name: selectedEvaluation.name,
                      status: selectedEvaluation.status,
                      createdAt: selectedEvaluation.createdAt,
                      totalItems: selectedEvaluation.totalItems
                    }, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium">Column Roles:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedEvaluation.columnRoles, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium">Sample Data (first 2 rows):</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedEvaluation.data?.slice(0, 2), null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium">Criteria:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(selectedEvaluation.criteria, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium">Instructions:</h4>
                  <div className="text-sm bg-gray-100 p-2 rounded">
                    {selectedEvaluation.instructions || "(No instructions)"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Select an evaluation to view details</div>
          )}
        </div>
      </div>
    </div>
  )
}
