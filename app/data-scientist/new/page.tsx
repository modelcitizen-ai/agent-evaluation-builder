"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DocumentArrowUpIcon, BoltIcon, TableCellsIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import { detectFileTypeAndParse } from "@/lib/utils/filetype"
import { useDatasetAnalysis } from "@/lib/hooks/use-dataset-analysis"
import { transformAnalysisResult } from "@/lib/utils/analysis-transformers"
import { useGlobalLoading } from "@/components/GlobalLoadingOverlay"

export default function NewEvaluationPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"excel" | "api">("excel")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [processedData, setProcessedData] = useState<any[]>([])
  const [useAIAnalysis, setUseAIAnalysis] = useState(false)
  const [modelName, setModelName] = useState("")
  const [apiEndpoint, setApiEndpoint] = useState("")

  const { isLoading, setLoading } = useGlobalLoading()

  const handleFileSelection = (file: File) => {
    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".jsonl")
    ) {
      alert("Please upload an Excel (.xlsx), CSV, or JSONL file")
      return
    }
    
    // Clear any existing session storage when a new file is selected
    sessionStorage.removeItem("uploadedData")
    sessionStorage.removeItem("fileName") 
    sessionStorage.removeItem("aiAnalysisResult")
    sessionStorage.removeItem("useAIAnalysis")
    
    setSelectedFile(file)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
    return `${size} ${sizes[i]}`
  }

  const handleFileUpload = useCallback(async () => {
    if (!selectedFile) return
    try {
      setLoading(true)

      // Clear any existing session storage to ensure clean state
      sessionStorage.removeItem("uploadedData")
      sessionStorage.removeItem("fileName")
      sessionStorage.removeItem("aiAnalysisResult")
      sessionStorage.removeItem("useAIAnalysis")

      // Process the uploaded file
      const processedData = await processFile(selectedFile)

      // If AI analysis is enabled, do it here on the upload page
      if (useAIAnalysis) {
        try {
          const columns = Object.keys(processedData[0])
          const aiResult = await performAIAnalysis(processedData, columns)

          // Store both data and AI results
          sessionStorage.setItem("uploadedData", JSON.stringify(processedData))
          sessionStorage.setItem("aiAnalysisResult", JSON.stringify(aiResult))
          sessionStorage.setItem("fileName", selectedFile.name)
          sessionStorage.setItem("useAIAnalysis", JSON.stringify(true))
        } catch (error) {
          console.error("AI analysis failed, proceeding with fallback:", error)
          // Store data without AI results - preview page will use fallback
          sessionStorage.setItem("uploadedData", JSON.stringify(processedData))
          sessionStorage.setItem("fileName", selectedFile.name)
          sessionStorage.setItem("useAIAnalysis", JSON.stringify(false))
          // Clear any existing AI analysis result
          sessionStorage.removeItem("aiAnalysisResult")
        }
      } else {
        // Store data without AI analysis
        sessionStorage.setItem("uploadedData", JSON.stringify(processedData))
        sessionStorage.setItem("fileName", selectedFile.name)
        sessionStorage.setItem("useAIAnalysis", JSON.stringify(false))
        // Clear any existing AI analysis result
        sessionStorage.removeItem("aiAnalysisResult")
      }

      // Navigate to preview page - everything is ready
      // Don't set isProcessing to false here - let the navigation complete
      router.replace("/data-scientist/new/preview")
      // Add a short delay to ensure overlay hides after navigation
      setTimeout(() => setLoading(false), 600)
    } catch (error) {
      console.error("Error processing file:", error)
      alert("Error processing file. Please try again.")
      setLoading(false)
    }
    // Remove the finally block entirely
  }, [selectedFile, router, useAIAnalysis, setLoading])

  // Use the modular hook for AI analysis with error handling and fallback
  const { analyzeWithAPI } = useDatasetAnalysis()
  
  // Keep original function as a wrapper for compatibility
  const performAIAnalysis = async (data: any[], columns: string[]) => {
    try {
      // Pass the useAIAnalysis value inverted - true means use AI, false means use fallback
      return await analyzeWithAPI(data, columns, !useAIAnalysis)
    } catch (error) {
      console.error("AI analysis failed in wrapper:", error)
      // Will use hook's internal fallback, but we'll also log the failure
      return {
        success: false,
        error: "AI analysis failed, using fallback analysis"
      }
    }
  }

  // Flattens a deeply nested object for tabular display
  function flattenForComparison(obj: any, prefix = "", result: any = {}) {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      const value = obj[key];
      const flatKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flattenForComparison(value, flatKey, result);
      } else if (Array.isArray(value)) {
        // For arrays of objects, flatten each item with index
        if (value.length > 0 && typeof value[0] === "object") {
          value.forEach((item, index) => {
            flattenForComparison(item, `${flatKey}.${index}`, result);
          });
        } else {
          // For arrays of primitives, join them
          result[flatKey] = value.join(", ");
        }
      } else {
        result[flatKey] = value;
      }
    }
    return result;
  }





  // Replace processFile with the centralized filetype utility
  const processFile = async (file: File): Promise<any[]> => {
    const parsed = await detectFileTypeAndParse(file);
    if (!parsed.data || parsed.data.length === 0) {
      throw new Error("File must have at least a header row and one data row");
    }
    
    // If JSONL, flatten nested objects for tabular display
    if (parsed.fileType === "jsonl") {
      const flattened = parsed.data.map((row: any) => flattenForComparison(row));
      return flattened;
    }
    
    // For CSV/Excel files, return original data without modification
    return parsed.data;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  return (
    <PageLayout
      title="New Evaluation"
      actions={
        <button
          onClick={() => router.push("/data-scientist")}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="px-4 py-5 sm:p-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("excel")}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "excel"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <TableCellsIcon className="h-5 w-5 mr-2" />
                  Static Dataset Evaluation
                </div>
              </button>
              <button
                onClick={() => setActiveTab("api")}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "api"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <BoltIcon className="h-5 w-5 mr-2" />
                  Live Generation
                </div>
              </button>
            </nav>
          </div>

          {/* Excel Upload Tab */}
          {activeTab === "excel" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your dataset</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Use this mode to assess the quality of model- or human-written completions that have already been generated. It is suitable for comparing outputs from different models, versions, or subject matter experts using pre-collected data.
                </p>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors bg-white ${
                  dragActive ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900 block mb-2">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-sm text-gray-500 block">Excel (.xlsx) or CSV files up to 10MB</span>
                  </label>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.csv,.jsonl"
                    onChange={handleFileInput}
                  />
                </div>
              </div>

              {/* File Confirmation */}
              {selectedFile && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentArrowUpIcon className="h-6 w-6 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)} • Ready to upload
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* AI Analysis Toggle */}
                      <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                          <span className="text-sm text-gray-700 mr-3">Enable AI Analysis</span>
                          <button
                            type="button"
                            onClick={() => setUseAIAnalysis(!useAIAnalysis)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              useAIAnalysis ? "bg-blue-500" : "bg-gray-200"
                            }`}
                            role="switch"
                            aria-checked={useAIAnalysis}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                useAIAnalysis ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </label>
                      </div>

                      {/* Upload Button */}
                      <button
                        onClick={handleFileUpload}
                        disabled={isLoading}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                          isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      >
                        Upload File
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Analysis Information Card */}
              {selectedFile && useAIAnalysis && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      The system analyzes your data to suggest optimal evaluation settings. Do not include sensitive or
                      confidential information.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API Tab */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your dataset and API endpoint</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Use this mode for rapid model testing, prompt engineering, and evaluation of new or fine-tuned models. Upload your input dataset. Enter the model name and endpoint to generate completions in real time.
                </p>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors bg-white ${
                  dragActive ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div>
                  <label htmlFor="file-upload-api" className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900 block mb-2">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-sm text-gray-500 block">Excel (.xlsx) or CSV files up to 10MB</span>
                  </label>
                  <input
                    id="file-upload-api"
                    name="file-upload-api"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.csv,.jsonl"
                    onChange={handleFileInput}
                  />
                </div>
              </div>

              {/* File Confirmation */}
              {selectedFile && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DocumentArrowUpIcon className="h-6 w-6 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)} • Ready to upload
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* AI Analysis Toggle */}
                      <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                          <span className="text-sm text-gray-700 mr-3">Enable AI Analysis</span>
                          <button
                            type="button"
                            onClick={() => setUseAIAnalysis(!useAIAnalysis)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              useAIAnalysis ? "bg-blue-500" : "bg-gray-200"
                            }`}
                            role="switch"
                            aria-checked={useAIAnalysis}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                useAIAnalysis ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </label>
                      </div>

                      {/* Upload Button */}
                      <button
                        onClick={handleFileUpload}
                        disabled={isLoading}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                          isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                      >
                        Upload File
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Analysis Information Card */}
              {selectedFile && useAIAnalysis && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      The system analyzes your data to suggest optimal evaluation settings. Do not include sensitive or
                      confidential information.
                    </p>
                  </div>
                </div>
              )}

              {/* API Configuration Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="api-endpoint" className="block text-sm font-medium text-gray-700 mb-2">
                    API Endpoint (Coming Soon)
                  </label>
                  <input
                    type="url"
                    id="api-endpoint"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                    placeholder="https://api.example.com/v1/generate"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the full URL for the model's API endpoint. This will be used to generate completions during evaluation.
                  </p>
                </div>

                <div>
                  <label htmlFor="model-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name (Coming Soon)
                  </label>
                  <input
                    type="text"
                    id="model-name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                    placeholder="e.g., gpt4-finetuned-v1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
