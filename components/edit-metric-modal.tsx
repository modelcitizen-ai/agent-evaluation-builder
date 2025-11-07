"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"

interface Metric {
  id: number
  name: string
  type: string
  options: string[]
  required: boolean
  likertLabels?: { low: string; high: string }
}

interface EditMetricModalProps {
  metric: Metric | null
  metrics?: Metric[]
  isOpen: boolean
  onClose: () => void
  onSave: (updatedMetric: Metric) => void
}

export default function EditMetricModal({ metric, metrics, isOpen, onClose, onSave }: EditMetricModalProps) {
  const [editedMetric, setEditedMetric] = useState<Metric | null>(null)

  useEffect(() => {
    if (metric) {
      // Check if this is a new metric (not in the existing metrics list)
      const isNewMetric = !metrics?.some((m) => m.id === metric.id)
      
      if (isNewMetric && metric.name === "") {
        // For new metrics with empty name, set "New Question" as default
        setEditedMetric({ ...metric, name: "New Question" })
      } else {
        // For existing metrics or new metrics with existing names, keep as is
        setEditedMetric({ ...metric })
      }
    }
  }, [metric, metrics])

  if (!isOpen || !editedMetric) return null

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedMetric({ ...editedMetric, name: e.target.value })
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value
    let newOptions: string[] = []
    let newLikertLabels: { low: string; high: string } | undefined

    // Set default options based on type
    switch (newType) {
      case "yes-no":
        newOptions = ["Yes", "No"]
        break
      case "likert-scale":
        newOptions = ["1", "2", "3", "4", "5"]
        newLikertLabels = editedMetric.likertLabels || { low: "Low", high: "High" }
        break
      case "custom-list":
        newOptions = ["Good", "Fair", "Poor"]
        break
      case "text-input":
        newOptions = []
        break
    }

    setEditedMetric({ ...editedMetric, type: newType, options: newOptions, likertLabels: newLikertLabels })
  }

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedMetric({ ...editedMetric, required: e.target.checked })
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...editedMetric.options]
    newOptions[index] = value
    setEditedMetric({ ...editedMetric, options: newOptions })
  }

  const handleLikertLabelChange = (type: "low" | "high", value: string) => {
    const currentLabels = editedMetric.likertLabels || { low: "", high: "" }
    const newLikertLabels = { ...currentLabels, [type]: value }
    setEditedMetric({ ...editedMetric, likertLabels: newLikertLabels })
  }

  const handleAddOption = () => {
    setEditedMetric({
      ...editedMetric,
      options: [...editedMetric.options, "New Option"],
    })
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = [...editedMetric.options]
    newOptions.splice(index, 1)
    setEditedMetric({ ...editedMetric, options: newOptions })
  }

  const handleSave = () => {
    // If name is empty or just whitespace, use "New Question" as default
    const finalMetric = {
      ...editedMetric,
      name: editedMetric.name.trim() || "New Question"
    }
    onSave(finalMetric)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-border">
          <div className="bg-card px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-foreground">
                {metric && metrics?.some((m) => m.id === metric.id) ? "Edit Question" : "Add a Question"}
              </h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Question</label>
                <input
                  type="text"
                  value={editedMetric.name}
                  onChange={handleNameChange}
                  className="block w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Add a Question"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Response Type</label>
                <div className="relative">
                  <select
                    value={editedMetric.type}
                    onChange={handleTypeChange}
                    className="block w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  >
                    <option value="yes-no">Yes/No</option>
                    <option value="likert-scale">Likert Scale</option>
                    <option value="custom-list">Custom List</option>
                    <option value="text-input">Text Input</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Likert Scale Labels */}
              {editedMetric.type === "likert-scale" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Scale Labels</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Low End</label>
                      <input
                        type="text"
                        value={editedMetric.likertLabels?.low || ""}
                        onChange={(e) => handleLikertLabelChange("low", e.target.value)}
                        className="block w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Low"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">High End</label>
                      <input
                        type="text"
                        value={editedMetric.likertLabels?.high || ""}
                        onChange={(e) => handleLikertLabelChange("high", e.target.value)}
                        className="block w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="High"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Options for custom list types */}
              {editedMetric.type === "custom-list" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">Options</label>
                  <div className="space-y-3">
                    {editedMetric.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder={`Option ${index + 1}`}
                        />
                        <button
                          onClick={() => handleRemoveOption(index)}
                          className="flex-shrink-0 w-8 h-8 border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddOption}
                      className="w-8 h-8 border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                    >
                      <PlusIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="metric-required"
                  checked={editedMetric.required}
                  onChange={handleRequiredChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-border rounded bg-background"
                />
                <label htmlFor="metric-required" className="ml-3 block text-sm text-foreground">
                  Required
                </label>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 px-6 py-4 sm:flex sm:flex-row-reverse border-t border-border">
            <Button
              type="button"
              onClick={handleSave}
              variant="default"
              className="w-full sm:ml-3 sm:w-auto"
            >
              Save
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
