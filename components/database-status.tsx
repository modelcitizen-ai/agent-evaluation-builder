"use client"

import { useState } from 'react'
import { useDatabase } from './database-provider'

export default function DatabaseStatus() {
  const { dbReady, dbError, dbDetails } = useDatabase()
  const [showDetails, setShowDetails] = useState<boolean>(false)
  
  return (
    <div className="rounded-lg border bg-card p-2 text-sm">
      <div className="flex items-center justify-center gap-2">
        <span className="text-gray-700">Database Status</span>
        <span className={`font-medium text-xs px-2 py-1 rounded-full ${dbReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {dbReady ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {dbError && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-1 rounded text-center">
          {dbError}
        </div>
      )}
      
      {dbDetails && (
        <div className="text-center">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>
      )}
      
      {showDetails && dbDetails && (
        <div className="mt-1 text-xs text-gray-600 text-center">
          <div>Environment: {dbDetails.environment}</div>
          {dbDetails.evaluationCount !== undefined && (
            <div>Evaluations: {dbDetails.evaluationCount}</div>
          )}
        </div>
      )}
    </div>
  )
}