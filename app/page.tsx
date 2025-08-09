"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import PageLayout from "@/components/layout/page-layout"
import DisclaimerModal from "@/components/modals/disclaimer-modal"

export default function HomePage() {
  const router = useRouter()
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  
  return (
    <PageLayout title="">
      {/* Disclaimer Modal */}
      <DisclaimerModal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} />
      
      {/* Spacer div to push content down */}
      <div className="h-[100px] -mt-9"></div>
      
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
            <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4 text-xl font-semibold">
              1
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Upload Your Data</h3>
            <p className="text-gray-500 text-center">
              Upload your Excel or CSV file containing the content you want evaluated. Our system automatically analyzes your data structure.
            </p>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4 text-xl font-semibold">
              2
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Configure Evaluation</h3>
            <p className="text-gray-500 text-center">
              AI suggests evaluation criteria based on your data. Customize questions, rating scales, and instructions to match your needs.
            </p>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mb-4 text-xl font-semibold">
              3
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Collaborate & Export</h3>
            <p className="text-gray-500 text-center">
              Invite team members to review content, track progress in real-time, and export results when complete.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          <button
            onClick={() => router.push("/data-scientist")}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Get Started
          </button>
          <a
            href="https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fhumanelevaldeploy.blob.core.windows.net%2Fdeploy%2Fazuredeploy.bicep%3Fse%3D2026-08-09T14%253A16%253A02Z%26sp%3Dr%26sv%3D2022-11-02%26sr%3Db%26sig%3DP%252BYN89d%252BAWdnSFzfpLXrYNfakbjzd2dObgywppAaGVo%253D"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 border border-blue-500 text-base font-medium rounded-md shadow-sm text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Deploy to Azure
          </a>
        </div>
        
        {/* Disclaimer link at the bottom - COMMENTED OUT */}
        {/* 
        <div className="mt-12 text-center">
          <button
            onClick={() => setShowDisclaimer(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none"
          >
            Your Data
          </button>
        </div>
        */}
      </div>
    </PageLayout>
  )
}
