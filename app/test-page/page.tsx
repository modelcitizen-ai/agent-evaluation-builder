"use client"

import { useRouter } from "next/navigation"
import PageLayout from "@/components/layout/page-layout"

export default function TestPage() {
  const router = useRouter()
  
  return (
    <PageLayout title="">
      <div style={{
        height: "200px", 
        backgroundColor: "red", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "white",
        fontSize: "24px",
        fontWeight: "bold"
      }}>
        THIS IS A TEST PAGE WITH RED BACKGROUND
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-6">
          Test Page
        </h1>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mt-8"
        >
          Go to Homepage
        </button>
      </div>
    </PageLayout>
  )
}
