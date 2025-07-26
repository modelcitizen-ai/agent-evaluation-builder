"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import ProgressDashboard from "@/components/progress-dashboard"
import PageLayout from "@/components/layout/page-layout"

export default function EvaluationProgressPage() {
  const router = useRouter()
  const params = useParams()
  const evaluationId = params.id ? Number(params.id) : undefined
  const [evaluationName, setEvaluationName] = useState<string>("Loading...")

  // Load evaluation name from localStorage
  useEffect(() => {
    if (evaluationId) {
      const storedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
      const evaluation = storedEvaluations.find((item: any) => item.id === evaluationId)

      if (evaluation) {
        setEvaluationName(evaluation.name)
      } else {
        setEvaluationName("Evaluation Not Found")
      }
    }
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
