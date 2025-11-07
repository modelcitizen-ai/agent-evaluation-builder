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
    <div className="fixed inset-0 bg-background bg-opacity-100 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300">
      <div className="flex flex-col items-center space-y-6 text-muted-foreground">
        <div className="flex space-x-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-1.5">
              <div className="h-6 w-6 bg-primary rounded-full animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="text-lg font-medium">Loading...</div>
      </div>
    </div>
  )
}
