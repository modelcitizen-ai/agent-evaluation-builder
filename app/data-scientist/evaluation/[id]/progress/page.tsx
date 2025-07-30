"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import ProgressDashboard from "@/components/progress-dashboard"
import PageLayout from "@/components/layout/page-layout"
import { getEvaluation } from "@/lib/client-db"

export default function EvaluationProgressPage() {
  const router = useRouter()
  const params = useParams()
  const evaluationId = params.id ? Number(params.id) : undefined
  const [evaluationName, setEvaluationName] = useState<string>("Loading...")

  // Load evaluation name from API (PostgreSQL backend)
  useEffect(() => {
    const loadEvaluationName = async () => {
      if (evaluationId) {
        try {
          const evaluation = await getEvaluation(evaluationId)
          if (evaluation) {
            setEvaluationName(evaluation.name)
          } else {
            setEvaluationName("Evaluation Not Found")
          }
        } catch (error) {
          console.error("Error loading evaluation:", error)
          setEvaluationName("Evaluation Not Found")
        }
      }
    }

    loadEvaluationName()
  }, [evaluationId])

  // Add the back handler function
  const handleBack = () => {
    router.push("/data-scientist")
  }

  return (
    <PageLayout title={evaluationName}>
      <ProgressDashboard evaluationId={evaluationId} onBack={handleBack} />
    </PageLayout>
  )
}
