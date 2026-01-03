"use client"

import type React from "react"

import { useRouter, usePathname } from "next/navigation"

interface PageLayoutProps {
  title: React.ReactNode
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  fullWidth?: boolean
}

export default function PageLayout({ title, subtitle, children, actions, fullWidth = false }: PageLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isHomePage = pathname === "/"

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-background ${fullWidth ? "" : "pt-9"}`}>
      {/* Header */}
      <div className={`w-full ${fullWidth ? "py-4 border-b border-border mb-0" : "py-2"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 flex items-center">
              {isHomePage && (
                <div className="flex items-center mr-6">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 relative">
                    <div className="h-3 w-3 bg-background dark:bg-black/30 rounded-full"></div>
                    <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-yellow-300 rounded-full"></div>
                    <div className="absolute bottom-1 left-1 h-1 w-1 bg-pink-300 rounded-full"></div>
                  </div>
                  <h1 className="text-xl font-bold text-foreground">
                    Human Evaluation Builder
                  </h1>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={fullWidth ? "w-full" : "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"}>{children}</div>
    </div>
  )
}
