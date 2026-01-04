"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { UserCircleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Don't show header on home page
  if (pathname === "/") return null

  // Determine if user is in data scientist or reviewer section
  const isDataScientist = pathname?.includes("/data-scientist")
  const isReviewer = pathname?.includes("/reviewer")
  const userRole = isDataScientist ? "Data Scientist" : isReviewer ? "Reviewer" : ""

  return (
    <header className="bg-background dark:bg-black/30 border-b border-border dark:border-gray-800 fixed top-0 left-0 right-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <div className="flex items-center">
            <button
              onClick={() => router.push("/")}
              className="cursor-pointer bg-transparent border-none p-0 m-0 flex items-center"
            >
              <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 relative">
                <div className="h-3 w-3 bg-background dark:bg-black/30 rounded-full"></div>
                <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-yellow-300 rounded-full"></div>
                <div className="absolute bottom-1 left-1 h-1 w-1 bg-pink-300 rounded-full"></div>
              </div>
              <h1 className="text-base font-semibold text-foreground dark:text-white">
                Agent Evaluation Builder
              </h1>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <div className="h-8 w-8 bg-muted dark:bg-gray-700 rounded-full flex items-center justify-center">
              <UserCircleIcon className="h-5 w-5 text-muted-foreground dark:text-gray-300" />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring dark:focus:ring-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={cn("md:hidden", mobileMenuOpen ? "block" : "hidden")}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-border dark:border-gray-800 bg-background dark:bg-black/30">
          <button
            onClick={() => {
              router.push("/")
              setMobileMenuOpen(false)
            }}
            className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:text-foreground hover:bg-accent dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 w-full text-left"
          >
            Switch Role
          </button>
        </div>
      </div>
    </header>
  )
}
