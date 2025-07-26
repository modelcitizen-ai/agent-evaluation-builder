"use client"

import { useState, useEffect } from 'react'
import PageLayout from '@/components/layout/page-layout'

export default function LocalStorageDebugPage() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [message, setMessage] = useState<string>('Checking localStorage...')
  const [allItems, setAllItems] = useState<{key: string, value: string}[]>([])
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  // Function to clear all localStorage
  const clearAllStorage = () => {
    try {
      localStorage.clear()
      setMessage('localStorage successfully cleared!')
      setAllItems([])
      loadStorageItems() // Refresh the list
    } catch (error) {
      setMessage(`Error clearing localStorage: ${error instanceof Error ? error.message : String(error)}`)
      setStatus('error')
      setErrorDetails(JSON.stringify(error, null, 2))
    }
  }
  
  // Function to add test item
  const addTestItem = () => {
    try {
      const testKey = `test-item-${Date.now()}`
      localStorage.setItem(testKey, `Test value created at ${new Date().toISOString()}`)
      setMessage(`Test item added with key: ${testKey}`)
      loadStorageItems() // Refresh the list
    } catch (error) {
      setMessage(`Error adding test item: ${error instanceof Error ? error.message : String(error)}`)
      setStatus('error')
      setErrorDetails(JSON.stringify(error, null, 2))
    }
  }
  
  // Load all localStorage items
  const loadStorageItems = () => {
    try {
      const items = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key) || ''
          items.push({key, value})
        }
      }
      setAllItems(items)
      setStatus('success')
    } catch (error) {
      setMessage(`Error reading localStorage: ${error instanceof Error ? error.message : String(error)}`)
      setStatus('error')
      setErrorDetails(JSON.stringify(error, null, 2))
    }
  }
  
  // Load debug info from API
  const loadDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug/localstorage')
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error('Error fetching debug info:', error)
    }
  }
  
  // Initialize on component mount
  useEffect(() => {
    try {
      // Test localStorage access
      localStorage.setItem('test-access', 'ok')
      const testValue = localStorage.getItem('test-access')
      localStorage.removeItem('test-access')
      
      if (testValue === 'ok') {
        setMessage('localStorage is available and working correctly')
        setStatus('success')
        loadStorageItems()
      } else {
        setMessage('localStorage test failed - unexpected value returned')
        setStatus('error')
      }
    } catch (error) {
      setMessage(`Error accessing localStorage: ${error instanceof Error ? error.message : String(error)}`)
      setStatus('error')
      setErrorDetails(JSON.stringify(error, null, 2))
    }
    
    loadDebugInfo()
  }, [])
  
  return (
    <PageLayout title="localStorage Debugger">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">localStorage Status</h2>
          
          <div className={`p-4 mb-4 rounded-md ${
            status === 'checking' ? 'bg-blue-50 text-blue-700' : 
            status === 'success' ? 'bg-green-50 text-green-700' : 
            'bg-red-50 text-red-700'
          }`}>
            <p className="font-medium">{message}</p>
          </div>
          
          {errorDetails && (
            <div className="bg-gray-50 p-4 rounded-md mb-4 overflow-x-auto">
              <h3 className="text-sm font-medium mb-2">Error Details:</h3>
              <pre className="text-xs">{errorDetails}</pre>
            </div>
          )}
          
          <div className="flex space-x-4">
            <button 
              onClick={clearAllStorage}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Clear All localStorage
            </button>
            
            <button 
              onClick={addTestItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Test Item
            </button>
            
            <button 
              onClick={loadStorageItems}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Refresh List
            </button>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">localStorage Contents ({allItems.length} items)</h2>
          
          {allItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.key}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {item.value.length > 100 ? `${item.value.substring(0, 100)}...` : item.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button 
                          onClick={() => {
                            try {
                              localStorage.removeItem(item.key)
                              setMessage(`Removed item: ${item.key}`)
                              loadStorageItems()
                            } catch (error) {
                              setMessage(`Error removing item: ${error instanceof Error ? error.message : String(error)}`)
                              setErrorDetails(JSON.stringify(error, null, 2))
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No items in localStorage</p>
          )}
        </div>
        
        {debugInfo && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
              <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
