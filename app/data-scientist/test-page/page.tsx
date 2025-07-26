"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline"
import PageLayout from "@/components/layout/page-layout"
import { getEvaluations, createEvaluation, deleteEvaluation } from "@/lib/client-db"

interface Evaluation {
  id: number
  name: string
  status: string
  totalItems: number
  createdAt: string
  completedAt?: string
  criteria: any[]
  instructions?: string
  columnRoles?: any[]
  data?: any[]
}

export default function DataScientistTestPage() {
  const router = useRouter()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Only run this effect on the client side
  useEffect(() => {
    // Define function to load data
    const loadData = async () => {
      console.log('Starting to load data in test-page');
      try {
        // Load evaluations from localStorage
        console.log('Loading evaluations from localStorage');
        const dbEvaluations = await getEvaluations();
        console.log('Loaded evaluations:', dbEvaluations);
        
        // Set evaluations 
        setEvaluations(dbEvaluations || []);
      } catch (err) {
        console.error("Error loading evaluations:", err);
        setError("Failed to load evaluations. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    };

    // Only run on client-side
    if (typeof window !== 'undefined') {
      loadData();
    }
  }, []);
  
  // Create a new evaluation
  const handleCreateEvaluation = async () => {
    try {
      // Create a new evaluation with placeholder data
      const newEvaluation = await createEvaluation({
        id: Date.now(),
        name: `New Evaluation ${Date.now()}`,
        status: "draft",
        totalItems: 0,
        createdAt: new Date().toISOString(),
        criteria: []
      });
      
      // Navigate to the new evaluation
      if (newEvaluation && newEvaluation.id) {
        router.push(`/build/${newEvaluation.id}`);
      }
    } catch (err) {
      console.error("Error creating evaluation:", err);
      setError("Failed to create evaluation. Please try again.");
    }
  };
  
  // Render the page
  return (
    <PageLayout title="Test Page - Your Evaluations">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Test Page</h1>
          <button
            onClick={handleCreateEvaluation}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            Create New Evaluation
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading evaluations...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't created any evaluations yet.</p>
            <button
              onClick={handleCreateEvaluation}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              Create Your First Evaluation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{evaluation.name}</h2>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(evaluation.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => router.push(`/build/${evaluation.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-sm"
                  >
                    Edit
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === evaluation.id ? null : evaluation.id)}
                      className="p-1 rounded-full hover:bg-gray-200"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                    {openDropdown === evaluation.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                        <div className="py-1">
                          <button
                            onClick={async () => {
                              if (confirm("Are you sure you want to delete this evaluation?")) {
                                await deleteEvaluation(evaluation.id);
                                setEvaluations(evaluations.filter(e => e.id !== evaluation.id));
                              }
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
