import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface Reviewer {
  id: string
  name: string
  email: string
  notes: string
  link: string
  createdAt: string
  evaluationId: string
}

interface UploadedReviewer {
  ReviewerName: string
  Email: string
}

interface UseAssignReviewersUIHelpersProps {
  reviewers: Reviewer[]
  setUploadedReviewers: (reviewers: UploadedReviewer[]) => void
}

interface UseAssignReviewersUIHelpersReturn {
  // Navigation
  router: ReturnType<typeof useRouter>
  handleBack: () => void
  
  // File upload state and handlers
  isUploading: boolean
  setIsUploading: (uploading: boolean) => void
  selectedFileName: string
  setSelectedFileName: (filename: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  
  // Copy functionality
  copiedLinkId: string | null
  setCopiedLinkId: (id: string | null) => void
  handleCopyLink: (link: string, reviewerId: string) => Promise<void>
  
  // Export functionality
  handleExportCSV: () => void
  
  // File input clearing
  clearFileInput: () => void
}

export function useAssignReviewersUIHelpers({
  reviewers,
  setUploadedReviewers,
}: UseAssignReviewersUIHelpersProps): UseAssignReviewersUIHelpersReturn {
  const router = useRouter()
  
  // File upload state
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Copy functionality state
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  const handleBack = () => {
    router.push("/data-scientist")
  }

  // File upload functionality
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedFileName("")
      return
    }

    setSelectedFileName(file.name)
    setIsUploading(true)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        let parsedData: UploadedReviewer[] = []

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = text.split('\n').filter(line => line.trim())
          if (lines.length === 0) return

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          
          // Validate required headers (only Name and Email are required)
          const nameHeaderExists = headers.some(h => 
            h.toLowerCase() === 'name' || h.toLowerCase() === 'reviewername'
          )
          const emailHeaderExists = headers.some(h => h.toLowerCase() === 'email')

          if (!nameHeaderExists || !emailHeaderExists) {
            alert('CSV must contain headers: Name (or ReviewerName) and Email.')
            setIsUploading(false)
            return
          }

          // Find header indices (support multiple possible names)
          const nameIndex = headers.findIndex(h => 
            h.toLowerCase() === 'name' || h.toLowerCase() === 'reviewername'
          )
          const emailIndex = headers.findIndex(h => h.toLowerCase() === 'email')

          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
            if (values[nameIndex]?.trim()) {
              parsedData.push({
                ReviewerName: values[nameIndex] || '',
                Email: values[emailIndex] || ''
              })
            }
          }
        } else {
          alert('Please upload a CSV file. Excel files will be supported in a future update.')
          setIsUploading(false)
          return
        }

        setUploadedReviewers(parsedData)
        setIsUploading(false)
      } catch (error) {
        console.error('Error parsing file:', error)
        alert('Error parsing file. Please check the format.')
        setIsUploading(false)
      }
    }

    reader.readAsText(file)
  }

  const handleCopyLink = async (link: string, reviewerId: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLinkId(reviewerId)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  const handleExportCSV = () => {
    if (reviewers.length === 0) {
      alert("No reviewers to export")
      return
    }

    // CSV escaping function
    const escapeCSVField = (field: any): string => {
      if (field == null) return ""
      const str = String(field)
      // If field contains comma, quote, newline, or carriage return, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }

    const csvData = [
      ["Reviewer Name", "Email", "Evaluation Link", "Created Date"],
      ...reviewers.map(reviewer => [
        reviewer.name,
        reviewer.email || "",
        reviewer.link,
        new Date(reviewer.createdAt).toLocaleDateString()
      ])
    ]

    const csvContent = csvData.map(row => 
      row.map(field => escapeCSVField(field)).join(",")
    ).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `evaluation-reviewers-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return {
    // Navigation
    router,
    handleBack,
    
    // File upload state and handlers
    isUploading,
    setIsUploading,
    selectedFileName,
    setSelectedFileName,
    fileInputRef,
    handleFileUpload,
    
    // Copy functionality
    copiedLinkId,
    setCopiedLinkId,
    handleCopyLink,
    
    // Export functionality
    handleExportCSV,
    
    // File input clearing
    clearFileInput,
  }
}
