"use client"
import React, { createContext, useContext, useState, ReactNode } from "react"

// Context for global loading state
const GlobalLoadingContext = createContext<{
  isLoading: boolean
  setLoading: (loading: boolean) => void
}>({ isLoading: false, setLoading: () => {} })

export function useGlobalLoading() {
  return useContext(GlobalLoadingContext)
}

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setLoading] = useState(false)
  return (
    <GlobalLoadingContext.Provider value={{ isLoading, setLoading }}>
      {children}
      <GlobalLoadingOverlay isLoading={isLoading} />
    </GlobalLoadingContext.Provider>
  )
}

export function GlobalLoadingOverlay({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null
  return (
    <div className="fixed inset-0 bg-white bg-opacity-100 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300">
      <div className="flex flex-col items-center">
        <div className="mb-8">
          <div className="relative">
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center relative animate-bounce">
              <div className="h-6 w-6 bg-white rounded-full animate-pulse"></div>
              <div className="absolute inset-0 animate-spin">
                <div className="absolute top-1 right-1 h-3 w-3 bg-yellow-300 rounded-full animate-ping"></div>
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}>
                <div className="absolute bottom-1 left-1 h-2 w-2 bg-pink-300 rounded-full animate-pulse"></div>
              </div>
              <div className="absolute -top-2 -left-2 h-1.5 w-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute -bottom-2 -right-2 h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping opacity-20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-200 animate-ping opacity-30" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interpreting your Data...</h3>
          <p className="text-sm text-gray-600">This may take a few moments</p>
          <div className="flex justify-center mt-4 space-x-1">
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
