"use client"

import type React from "react"

import { Inter } from "next/font/google"
import { useRouter, usePathname } from "next/navigation"
import "./globals.css"
import Header from "@/components/layout/header"
import { DatabaseProvider } from "@/components/database-provider"
import { GlobalLoadingProvider } from "@/components/GlobalLoadingOverlay"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <GlobalLoadingProvider>
            {/* Wrap the application with DatabaseProvider */}
            <DatabaseProvider>
              {/* Persistent Header */}
              <Header />

              {/* Main Content */}
              <main className="pt-16">{children}</main>
            </DatabaseProvider>
          </GlobalLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
