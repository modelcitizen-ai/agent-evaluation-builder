"use client";

import React, { useEffect, useState } from 'react';

interface DiagnosticInfo {
  initialized: boolean;
  error: string | null;
  isClient: boolean;
  hasLocalStorage: boolean;
  canWrite: boolean;
  canRead: boolean;
  environment: string | undefined;
  isAzure: boolean;
  localStorage: Record<string, string | null> | null;
  memoryStorage: {
    canWrite?: boolean;
    canRead?: boolean;
    status?: string;
    error?: string;
  } | null;
  pageLoadTime: string;
}

export default function LocalStorageDiagnosticPage() {
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
    initialized: false,
    error: null,
    isClient: false,
    hasLocalStorage: false,
    canWrite: false,
    canRead: false,
    environment: process.env.NODE_ENV,
    isAzure: process.env.RUNNING_IN_AZURE === 'true',
    localStorage: null,
    memoryStorage: null,
    pageLoadTime: new Date().toISOString()
  });

  // In-memory storage test - separate from localStorage-adapter.ts
  // but helps us diagnose if in-memory fallback would work
  const [memoryStorageTest, setMemoryStorageTest] = useState<Record<string, string>>({});

  useEffect(() => {
    // Basic tests that run immediately
    const isClient = typeof window !== 'undefined';
    const hasLocalStorage = isClient && 'localStorage' in window;
    
    // Update with initial checks
    setDiagnosticInfo((prev: DiagnosticInfo) => ({
      ...prev,
      initialized: true,
      isClient,
      hasLocalStorage,
    }));

    // Run diagnostics on client side
    const runDiagnostics = async () => {
      try {
        if (!isClient) {
          throw new Error('Not running in client environment');
        }

        // Try writing and reading localStorage
        let canWrite = false;
        let canRead = false;
        
        try {
          // Test localStorage functionality
          const testKey = '__localStorage_diagnostic_test__';
          localStorage.setItem(testKey, 'test-value');
          const testValue = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          
          canWrite = true;
          canRead = testValue === 'test-value';
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          setDiagnosticInfo((prev: DiagnosticInfo) => ({
            ...prev,
            error: `localStorage operation failed: ${errorMessage}`
          }));
        }

        // Test in-memory storage as fallback
        try {
          const testKey = 'test';
          memoryStorageTest[testKey] = 'memory-test';
          const testValue = memoryStorageTest[testKey];
          delete memoryStorageTest[testKey];
          
          setDiagnosticInfo((prev: DiagnosticInfo) => ({
            ...prev,
            memoryStorage: {
              canWrite: true,
              canRead: testValue === 'memory-test',
              status: testValue === 'memory-test' ? 'working' : 'failed'
            }
          }));
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          setDiagnosticInfo((prev: DiagnosticInfo) => ({
            ...prev,
            memoryStorage: {
              error: `Memory storage test failed: ${errorMessage}`
            }
          }));
        }

        // Attempt to list existing localStorage keys
        const storageSnapshot: Record<string, string | null> = {};
        if (canRead) {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                storageSnapshot[key] = localStorage.getItem(key);
              }
            }
          } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            setDiagnosticInfo((prev: DiagnosticInfo) => ({
              ...prev,
              error: `Error reading localStorage content: ${errorMessage}`
            }));
          }
        }

        // Update state with full diagnostics
        setDiagnosticInfo((prev: DiagnosticInfo) => ({
          ...prev,
          canWrite,
          canRead,
          localStorage: storageSnapshot
        }));
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setDiagnosticInfo((prev: DiagnosticInfo) => ({
          ...prev, 
          error: errorMessage
        }));
      }
    };

    // Delay the full diagnostics slightly to ensure page is fully rendered
    setTimeout(() => {
      runDiagnostics();
    }, 500);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">localStorage Diagnostic Tool</h1>
      
      {!diagnosticInfo.initialized ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2">Basic Environment</h2>
              <ul className="space-y-1">
                <li>
                  <span className="font-medium">Page load time:</span> 
                  <span className="ml-2">{diagnosticInfo.pageLoadTime}</span>
                </li>
                <li>
                  <span className="font-medium">Client-side rendering:</span> 
                  <span className={diagnosticInfo.isClient ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {diagnosticInfo.isClient ? "Yes" : "No"}
                  </span>
                </li>
                <li>
                  <span className="font-medium">Environment:</span> 
                  <span className="ml-2">{diagnosticInfo.environment}</span>
                </li>
                <li>
                  <span className="font-medium">Running in Azure:</span> 
                  <span className="ml-2">{diagnosticInfo.isAzure ? "Yes" : "No"}</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2">localStorage Status</h2>
              <ul className="space-y-1">
                <li>
                  <span className="font-medium">localStorage available:</span> 
                  <span className={diagnosticInfo.hasLocalStorage ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {diagnosticInfo.hasLocalStorage ? "Yes" : "No"}
                  </span>
                </li>
                <li>
                  <span className="font-medium">Can write to localStorage:</span> 
                  <span className={diagnosticInfo.canWrite ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {diagnosticInfo.canWrite ? "Yes" : "No"}
                  </span>
                </li>
                <li>
                  <span className="font-medium">Can read from localStorage:</span> 
                  <span className={diagnosticInfo.canRead ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                    {diagnosticInfo.canRead ? "Yes" : "No"}
                  </span>
                </li>
                <li>
                  <span className="font-medium">In-memory fallback viable:</span> 
                  <span className={diagnosticInfo.memoryStorage?.status === 'working' ? "text-green-600 ml-2" : "text-amber-600 ml-2"}>
                    {diagnosticInfo.memoryStorage?.status === 'working' ? "Yes" : "Unknown"}
                  </span>
                </li>
              </ul>
            </div>
          </div>
          
          {diagnosticInfo.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              <h2 className="font-semibold mb-2">Error Detected</h2>
              <p>{diagnosticInfo.error}</p>
            </div>
          )}
          
          {diagnosticInfo.localStorage && Object.keys(diagnosticInfo.localStorage).length > 0 && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2">localStorage Content</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Key</th>
                      <th className="px-4 py-2 text-left">Value Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(diagnosticInfo.localStorage).map(([key, value]) => (
                      <tr key={key} className="border-t">
                        <td className="px-4 py-2 font-mono text-sm">{key}</td>
                        <td className="px-4 py-2 font-mono text-sm">
                          {typeof value === 'string' 
                            ? value.length > 50 
                              ? `${value.substring(0, 50)}...` 
                              : value
                            : JSON.stringify(value)
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Run Diagnostics Again
            </button>
            
            <button 
              onClick={() => {
                if (typeof localStorage !== 'undefined') {
                  try {
                    localStorage.clear();
                    window.location.reload();
                  } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    alert(`Error clearing localStorage: ${errorMessage}`);
                  }
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Clear localStorage & Reload
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
