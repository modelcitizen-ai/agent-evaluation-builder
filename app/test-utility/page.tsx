"use client"

import { useState } from "react"
import PageLayout from "@/components/layout/page-layout"

export default function TestUtilityPage() {
  const [evaluationId, setEvaluationId] = useState("9876543210")
  const [responseKey, setResponseKey] = useState("criterion-1")
  const [responseValue, setResponseValue] = useState("Test response")
  const [message, setMessage] = useState("")

  const  createTestResponse = () => {
    try {
      const evalId = Number(evaluationId)
      const storageKey = `evaluation_${evalId}_responses`
      
      // Create a response object that matches the structure used in the app
      // Create a more realistic response with actual content for criterion-1
      const responseObj = {
        1: { [responseKey]: responseValue }
      }
      
      localStorage.setItem(storageKey, JSON.stringify(responseObj))
      setMessage(`Successfully created test response for evaluation ${evalId}`)
      
      // Log current localStorage state
      console.log('Current localStorage contents:')
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) console.log(`${key}: ${localStorage.getItem(key)}`)
      }
      
      // Create a direct link to reviewer page
      const reviewerLink = document.createElement('a')
      reviewerLink.href = '/reviewer'
      reviewerLink.textContent = 'Go to Reviewer Page'
      reviewerLink.className = 'text-blue-600 hover:underline mt-2 block'
      
      // Find the message div and append the link
      const messageDiv = document.querySelector('[data-message-container]')
      if (messageDiv) {
        messageDiv.appendChild(reviewerLink)
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
      console.error('Error creating test response:', error)
    }
  }

  const clearStorage = () => {
    try {
      const evalId = Number(evaluationId)
      const storageKey = `evaluation_${evalId}_responses`
      
      localStorage.removeItem(storageKey)
      setMessage(`Successfully removed test response for evaluation ${evalId}`)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
      console.error('Error clearing test response:', error)
    }
  }

  return (
    <PageLayout title="Test Utility">
      <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Create Test Response</h2>
        
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Key
            </label>
            <input
              type="text"
              value={responseKey}
              onChange={(e) => setResponseKey(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Response Value
            </label>
            <input
              type="text"
              value={responseValue}
              onChange={(e) => setResponseValue(e.target.value)}
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
              onClick={clearStorage}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear Test Response
            </button>
          </div>
          
          {message && (
            <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-md">
              {message}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Instructions</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
          <li>Enter the evaluation ID for which you want to create a test response (default is 9876543210)</li>
          <li>Click "Create Test Response" to add a fake response to localStorage</li>
          <li>Navigate to the <a href="/reviewer" className="text-indigo-600 hover:text-indigo-800">Reviewer page</a> to see if the "Continue" button appears</li>
          <li>Use <a href="/debug-localstorage" className="text-indigo-600 hover:text-indigo-800">Debug localStorage</a> to inspect all stored values</li>
          <li>Click "Clear Test Response" to remove the test data</li>
        </ol>
      </div>
    </PageLayout>
  )
}
