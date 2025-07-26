"use client"

import type React from "react"

import { useRouter } from "next/navigation"

interface PageLayoutProps {
  title: React.ReactNode
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export default function PageLayout({ title, subtitle, children, actions }: PageLayoutProps) {
  const router = useRouter()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 pt-9">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
          {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
