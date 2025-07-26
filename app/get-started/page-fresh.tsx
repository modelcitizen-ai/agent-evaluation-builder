"use client"

import { useRouter } from "next/navigation"
import PageLayout from "@/components/layout/page-layout"

export default function GetStartedPageFresh() {
  const router = useRouter()
  
  return (
    <PageLayout title="">
      {/* Spacer div to push content down */}
      <div className="h-[220px]" style={{backgroundColor: "#f9fafb"}}></div>
      
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-6">
          Human Evaluation Builder
        </h1>
        <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-12">
          Get started with human evaluation in three simple steps.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-16">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4 text-xl font-semibold">
              1
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Upload Your Data</h3>
            <p className="text-gray-500 text-center">
              Upload your Excel or CSV file containing the content you want evaluated. Our system automatically analyzes your data structure.
            </p>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4 text-xl font-semibold">
              2
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Configure Evaluation</h3>
            <p className="text-gray-500 text-center">
              AI suggests evaluation criteria based on your data. Customize questions, rating scales, and instructions to match your needs.
            </p>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4 text-xl font-semibold">
              3
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Collaborate & Export</h3>
            <p className="text-gray-500 text-center">
              Invite team members to review content, track progress in real-time, and export results when complete.
            </p>
          </div>
        </div>
        
        <button
          onClick={() => router.push("/data-scientist")}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-8"
        >
          Get Started
        </button>
      </div>
    </PageLayout>
  )
}
