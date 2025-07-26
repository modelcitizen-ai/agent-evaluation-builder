"use client"

import type React from "react"

import { Inter } from "next/font/google"
import { useRouter, usePathname } from "next/navigation"
import "./globals.css"
import Header from "@/components/layout/header"
import { DatabaseProvider } from "@/components/database-provider"
import { GlobalLoadingProvider } from "@/components/GlobalLoadingOverlay"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Don't show header/footer on home page
  const isHomePage = pathname === "/"

  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalLoadingProvider>
          {/* Wrap the application with DatabaseProvider */}
          <DatabaseProvider>
            {/* Persistent Header - only show if not on home page */}
            {!isHomePage && <Header />}

            {/* Main Content */}
            <main className={isHomePage ? "" : "pt-16"}>{children}</main>
          </DatabaseProvider>
        </GlobalLoadingProvider>
      </body>
    </html>
  )
}
