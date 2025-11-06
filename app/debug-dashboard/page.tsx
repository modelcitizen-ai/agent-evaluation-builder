"use client"

import { useState } from "react"

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  const testCreateEvaluation = async () => {
    addLog("🔍 Testing evaluation creation flow...")
    
    try {
      // Step 1: Check current evaluations
      addLog("Step 1: Fetching current evaluations...")
      const response1 = await fetch('/api/evaluations')
      const result1 = await response1.json()
      addLog(`Current evaluations: ${result1.data?.length || 0}`)
      setEvaluations(result1.data || [])
      
      // Step 2: Create new evaluation
      addLog("Step 2: Creating new evaluation...")
      const testEval = {
        id: Date.now(),
        name: `Test Eval ${new Date().toLocaleTimeString()}`,
        status: 'draft',
        totalItems: 0,
        createdAt: new Date().toISOString(),
        criteria: [{ id: 1, name: 'Test Criteria', type: 'rating', scale: 5 }],
        instructions: 'Test evaluation',
        columnRoles: [],
        data: []
      }
      
      const response2 = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEval)
      })
      const result2 = await response2.json()
      addLog(`Create result: ${result2.success ? 'SUCCESS' : 'FAILED'}`)
      if (result2.success) {
        addLog(`Created evaluation ID: ${result2.data.id}`)
      }
      
      // Step 3: Immediately fetch again
      addLog("Step 3: Fetching evaluations immediately after creation...")
      const response3 = await fetch('/api/evaluations')
      const result3 = await response3.json()
      addLog(`Evaluations after create: ${result3.data?.length || 0}`)
      setEvaluations(result3.data || [])
      
      if (result3.data?.length > result1.data?.length) {
        addLog("✅ SUCCESS: New evaluation appears immediately!")
      } else {
        addLog("❌ ISSUE: New evaluation not visible immediately")
      }
      
    } catch (error) {
      addLog(`❌ ERROR: ${error}`)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setEvaluations([])
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">PostgreSQL Dashboard Debug Tool</h1>
      
      <div className="mb-6">
        <button 
          onClick={testCreateEvaluation}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-4 hover:bg-blue-600"
        >
          Test Evaluation Creation Flow
        </button>
        <button 
          onClick={clearLogs}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Logs
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-3">Debug Logs</h2>
          <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Click "Test Evaluation Creation Flow" to start debugging</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-sm font-mono">{log}</div>
              ))
            )}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-3">Current Evaluations</h2>
          <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto">
            {evaluations.length === 0 ? (
              <p className="text-gray-500">No evaluations found</p>
            ) : (
              evaluations.map((evaluation, index) => (
                <div key={index} className="mb-2 p-2 bg-white rounded border">
                  <div className="font-semibold">{evaluation.name}</div>
                  <div className="text-sm text-gray-600">ID: {evaluation.id}</div>
                  <div className="text-sm text-gray-600">Status: {evaluation.status}</div>
                  <div className="text-sm text-gray-600">Created: {evaluation.createdAt}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
