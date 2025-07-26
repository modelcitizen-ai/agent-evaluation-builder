"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { HomeIcon } from "@heroicons/react/20/solid"

export default function Breadcrumb() {
  const pathname = usePathname()

  // Skip rendering breadcrumbs on the home page
  if (pathname === "/") return null

  // Check if we're in the reviewer section
  const isReviewerSection = pathname.startsWith("/reviewer")

  // Define breadcrumbs for reviewer section
  const reviewerBreadcrumbs = [
    { href: "/", label: "Home", segment: "" },
    { href: "/reviewer", label: "Review", segment: "reviewer" },
    { href: "/reviewer/task/1", label: "Evaluation", segment: "task" },
  ]

  // Define breadcrumbs for data scientist section
  const dataScientistBreadcrumbs = [
    { href: "/", label: "Home", segment: "" },
    { href: "/data-scientist", label: "Projects", segment: "data-scientist" },
    { href: "/data-scientist/new", label: "Connect", segment: "new" },
    { href: "/data-scientist/new/preview", label: "Review", segment: "preview" },
  ]

  const fullBreadcrumbs = isReviewerSection ? reviewerBreadcrumbs : dataScientistBreadcrumbs

  // Split the pathname into segments
  const segments = pathname.split("/").filter(Boolean)

  // Determine which breadcrumbs should be enabled based on current path
  const currentBreadcrumbs = fullBreadcrumbs.map((breadcrumb, index) => {
    let isEnabled = false
    let isCurrent = false

    if (isReviewerSection) {
      // Reviewer section logic
      if (index === 0) {
        // Home is always enabled
        isEnabled = true
      } else if (index === 1) {
        // Review (reviewer dashboard) is enabled if we're in the reviewer section
        isEnabled = segments.includes("reviewer")
        // This is current if we're on the main reviewer page
        isCurrent = pathname === "/reviewer"
      } else if (index === 2) {
        // Evaluation (task page) is enabled if we're in a task
        isEnabled = segments.includes("task")
        // This is current if we're on a task page
        isCurrent = pathname.includes("/reviewer/task/")
      }
    } else {
      // Data scientist section logic
      if (index === 0) {
        // Home is always enabled
        isEnabled = true
      } else if (index === 1) {
        // Projects is enabled if we're in the data-scientist section
        isEnabled = segments.includes("data-scientist")
      } else if (index === 2) {
        // Connect is enabled if we're in the new section
        isEnabled = segments.includes("data-scientist") && segments.includes("new")
      } else if (index === 3) {
        // Review is enabled if we're in preview or have visited it
        isEnabled = segments.includes("preview") || segments.includes("assign-reviewers")
      }

      // Check if this is the current page for data scientist section
      if (breadcrumb.href === pathname) {
        isCurrent = true
      }
    }

    return {
      ...breadcrumb,
      isEnabled,
      isCurrent,
    }
  })

  return (
    <nav className="fixed top-16 left-0 right-0 z-10 bg-gray-50 pt-1">
      <ol className="flex justify-center items-center h-8 text-sm space-x-4">
        {currentBreadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.href} className="flex items-center">
            {index === 0 ? (
              // Home icon
              <Link href={breadcrumb.href} className="text-gray-500 hover:text-gray-700">
                <HomeIcon className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Home</span>
              </Link>
            ) : breadcrumb.isCurrent ? (
              // Current page - not clickable
              <span className="text-gray-700 font-medium">{breadcrumb.label}</span>
            ) : breadcrumb.isEnabled ? (
              // Enabled link
              <Link href={breadcrumb.href} className="text-gray-500 hover:text-gray-700">
                {breadcrumb.label}
              </Link>
            ) : (
              // Disabled link
              <span className="text-gray-300 cursor-not-allowed">{breadcrumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
