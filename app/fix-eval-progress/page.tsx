"use client"

import { useState, useEffect } from "react"
import PageLayout from "@/components/layout/page-layout"

export default function FixEvalProgressPage() {
  const [message, setMessage] = useState("")
  const [storageItems, setStorageItems] = useState<Record<string, string>>({})
  const [evaluationId, setEvaluationId] = useState("9876543210")
  
  // Load localStorage items on mount
  useEffect(() => {
    refreshStorageItems()
  }, [])
  
  const refreshStorageItems = () => {
    const items: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try {
          const value = localStorage.getItem(key) || ""
          items[key] = value
        } catch (error) {
          console.error(`Error reading localStorage item ${key}:`, error)
        }
      }
    }
    setStorageItems(items)
  }
  
  const createTestResponse = () => {
    try {
      const evalId = evaluationId
      const storageKey = `evaluation_${evalId}_responses`
      
      // Create a response object with non-empty data for the first item
      const responseObj = {
        1: { "criterion-1": "Very Good", "criterion-2": "Yes" }
      }
      
      localStorage.setItem(storageKey, JSON.stringify(responseObj))
      setMessage(`Successfully created test response for evaluation ${evalId}`)
      refreshStorageItems()
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }
  
  const clearTestResponse = () => {
    try {
      const evalId = evaluationId
      const storageKey = `evaluation_${evalId}_responses`
      
      localStorage.removeItem(storageKey)
      setMessage(`Successfully removed test response for evaluation ${evalId}`)
      refreshStorageItems()
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }
  
  const clearAllStorage = () => {
    try {
      localStorage.clear()
      setMessage("Successfully cleared all localStorage items")
      refreshStorageItems()
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <PageLayout title="Fix Evaluation Progress">
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create Test Data</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Evaluation ID
              </label>
              <input
                type="text"
                value={evaluationId}
                onChange={(e) => setEvaluationId(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={createTestResponse}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Test Response
              </button>
              
              <button
                onClick={clearTestResponse}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Clear Test Response
              </button>
              
              <button
                onClick={clearAllStorage}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Clear All Storage
              </button>
            </div>
            
            {message && (
              <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-md" data-message-container>
                {message}
              </div>
            )}
            
            <div className="mt-4">
              <a href="/reviewer" className="text-indigo-600 hover:text-indigo-800 block mb-2">Go to Reviewer Page</a>
              <button
                onClick={refreshStorageItems}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Refresh Storage Items
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current localStorage Items</h2>
          
          <div className="overflow-y-auto max-h-96 text-xs">
            {Object.keys(storageItems).length > 0 ? (
              <ul className="space-y-2">
                {Object.entries(storageItems).map(([key, value]) => (
                  <li key={key} className="border-b border-gray-200 pb-2 mb-2">
                    <div className="font-bold text-indigo-700">{key}</div>
                    <div className="mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded">{value}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No items in localStorage</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">How to Debug Evaluation Progress</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
          <li>Use this tool to create a test response for the sample evaluation (ID: 9876543210)</li>
          <li>Visit the <a href="/reviewer" className="text-indigo-600 hover:text-indigo-800">Reviewer page</a> to see if the "Continue" button appears</li>
          <li>If the "Continue" button doesn't appear, check the localStorage items on this page</li>
          <li>The localStorage key should be in the format: <code className="bg-gray-100 px-1">evaluation_EVALUATION_ID_responses</code></li>
          <li>The button should change from "Start Review" to "Continue" when there's valid data saved</li>
          <li>You can click "Clear Test Response" to remove the test data and switch back to "Start Review"</li>
        </ol>
      </div>
    </PageLayout>
  )
}
