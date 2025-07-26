"use client"

import { useState, useEffect } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"

interface DisclaimerModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DisclaimerModal({ isOpen, onClose }: DisclaimerModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Handle animation timing for smooth opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsModalOpen(true)
    } else {
      const timer = setTimeout(() => {
        setIsModalOpen(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])
  
  if (!isOpen && !isModalOpen) return null
  
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOpen ? "opacity-100" : "opacity-0"
      } transition-opacity duration-200`}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div 
        className={`relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto p-12 transform ${
          isOpen ? "translate-y-0" : "translate-y-4"
        } transition-transform duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="disclaimer-title" className="text-xl font-semibold text-gray-900">
            Your Data
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={onClose}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-2 space-y-4 text-sm text-gray-600">
          <p className="font-medium">
            This is an early-stage prototype. Please note how your data is used:
          </p>
          <ul className="list-disc list-outside space-y-2 pl-5">
            <li>
              <strong>Azure OpenAI Summarization:</strong> Content you submit for AI analysis is processed by Azure OpenAI's GPT-4o model. This is necessary to generate contextual UI summaries and reviewer instructions. Please do not upload sensitive or personal information that you do not want processed by Azure OpenAI.
            </li>
            <li>
              <strong>Local Storage:</strong> Data you enter or generate is temporarily stored in your browser's localStorage to support the user experience. This data is never transmitted to a server or saved in any external database. All locally stored data remains on your device.
            </li>
          </ul>
          <p>
            You are welcome to share this prototype to help us gather feedback and improve. Thank you!
          </p>
        </div>
      </div>
    </div>
  )
}
