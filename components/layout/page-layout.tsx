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

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-background ${fullWidth ? "" : "pt-9"}`}>
      {/* Header */}
      <div className={`w-full ${fullWidth ? "py-4 border-b border-border mb-0" : "py-2"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex items-center">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={fullWidth ? "w-full" : "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"}>{children}</div>
    </div>
  )
}
