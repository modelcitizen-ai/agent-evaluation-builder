"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

// Define the database context
interface DatabaseContextType {
  dbReady: boolean
  dbError: string | null
  dbDetails: any | null
}

const DatabaseContext = createContext<DatabaseContextType>({
  dbReady: false,
  dbError: null,
  dbDetails: null
})

// Custom hook to use the database context
export function useDatabase() {
  return useContext(DatabaseContext)
}

// Database provider component
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [dbState, setDbState] = useState<DatabaseContextType>({
    dbReady: true, // Start as ready to avoid hydration mismatch
    dbError: null,
    dbDetails: null
  })
  const [isHydrated, setIsHydrated] = useState(false)
  const [initAttempts, setInitAttempts] = useState(0)

  /*
  useEffect(() => {
    // Mark as hydrated after first render
    setIsHydrated(true)
    
    const initDb = async () => {
      console.log(`[DB_PROVIDER] Attempting initialization. Attempt: ${initAttempts + 1}`);
      try {
        console.log('[DB_PROVIDER] Verifying browser environment...');
        // Verify we're running in the browser
        if (typeof window === 'undefined') {
          throw new Error('Running in server environment, skipping localStorage check');
        }
        console.log('[DB_PROVIDER] Browser environment verified.');

        // Check if running in Azure for diagnostic purposes
        const isAzure = process.env.RUNNING_IN_AZURE === 'true';
        console.log(`[DB_PROVIDER] Environment check: Running in Azure: ${isAzure ? 'Yes' : 'No'}`);
        
        console.log('[DB_PROVIDER] Checking for window.localStorage...');
        // Ensure localStorage is available and working
        if (window.localStorage) {
          console.log('[DB_PROVIDER] window.localStorage found. Testing functionality...');
          try {
            // Test localStorage functionality
            const testKey = '__localStorage_test__';
            localStorage.setItem(testKey, 'test');
            const testValue = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (testValue === 'test') {
              console.log('[DB_PROVIDER] localStorage test successful.');
              setDbState({
                dbReady: true,
                dbError: null,
                dbDetails: {
                  type: 'localStorage',
                  status: 'ready',
                  environment: 'client-side'
                }
              });
              console.log('localStorage test successful - database ready');
            } else {
              throw new Error('localStorage test failed - could not read test value');
            }
          } catch (localStorageError: any) {
            console.error('[DB_PROVIDER] localStorage functionality test failed:', localStorageError);
            // If in Azure and we have multiple attempts, proceed anyway as a fallback
            if (isAzure && initAttempts > 1) {
              console.warn('[DB_PROVIDER] Using fallback mode for Azure environment after failed localStorage test.');
              setDbState({
                dbReady: true,
                dbError: null,
                dbDetails: {
                  type: 'localStorage',
                  status: 'fallback',
                  environment: 'client-side-azure'
                }
              });
            } else {
              throw new Error(`localStorage not functional: ${localStorageError.message}`);
            }
          }
        } else {
          throw new Error('localStorage is not available - window.localStorage is undefined');
        }
      } catch (error: any) {
        console.error(`[DB_PROVIDER] Main initialization catch block. Error:`, error);
        
        // If this is the first attempt, try once more after a delay
        if (initAttempts < 2) {
          console.log(`[DB_PROVIDER] Retrying database initialization (attempt ${initAttempts + 1})`);
          setTimeout(() => {
            setInitAttempts(prev => prev + 1);
          }, 1000);
        } else {
          console.error('[DB_PROVIDER] Max initialization attempts reached. Setting error state.');
          setDbState({
            dbReady: false,
            dbError: error?.message || 'Failed to initialize localStorage',
            dbDetails: null
          });
        }
      }
    }
    
    // Initialize immediately on client side
    console.log('[DB_PROVIDER] Calling initDb().');
    initDb()
  }, [initAttempts])

  // After 3 seconds, force proceed even if there's an error to prevent getting stuck
  useEffect(() => {
    if (!dbState.dbReady && dbState.dbError) {
      console.log('[DB_PROVIDER] Starting 3-second force-proceed timer.');
      const forceTimer = setTimeout(() => {
        console.log('[DB_PROVIDER] Force proceeding after timeout despite localStorage error.');
        setDbState(prev => ({
          ...prev,
          dbReady: true,
          dbError: prev.dbError ? `${prev.dbError} (proceeding anyway)` : null,
          dbDetails: {
            type: 'localStorage',
            status: 'force-proceed',
            environment: 'fallback'
          }
        }));
      }, 3000);
      
      return () => {
        console.log('[DB_PROVIDER] Clearing force-proceed timer.');
        clearTimeout(forceTimer);
      }
    }
  }, [dbState.dbReady, dbState.dbError]);
  */
  
  // Only show loading state during SSR/hydration to prevent flash
  if (!isHydrated) {
    return (
      <DatabaseContext.Provider value={dbState}>
        {children}
      </DatabaseContext.Provider>
    )
  }
  
  // Show error state if database initialization failed
  if (!dbState.dbReady && dbState.dbError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Database Error</h2>
          <p className="mb-6">{dbState.dbError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <DatabaseContext.Provider value={dbState}>
      {children}
    </DatabaseContext.Provider>
  )
}
