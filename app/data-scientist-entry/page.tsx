"use client"

import { useRouter } from "next/navigation"
import { BeakerIcon } from "@heroicons/react/24/outline"
import Image from "next/image"

export default function DataScientistEntryPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Image 
            src="/images/header-design.png" 
            alt="Header design" 
            width={200} 
            height={80} 
            className="mx-auto mb-6" 
          />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Human Evaluation Builder</h1>
          <p className="mt-2 text-sm text-gray-600">Data Science Portal</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <button
              onClick={() => router.push("/data-scientist")}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BeakerIcon className="h-5 w-5 mr-2" />
              Continue to Dashboard
            </button>
            
            <div className="mt-4 text-sm text-center text-gray-600">
              <p>Access and manage human evaluations for your datasets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
