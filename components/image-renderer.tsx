"use client"

import { useState } from "react"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface ImageRendererProps {
  url: string
  title?: string
  className?: string
}

export default function ImageRenderer({ url, title, className = "" }: ImageRendererProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if URL is an image URL
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff"]
    const imageHosts = [
      "imgur.com",
      "i.imgur.com",
      "images.unsplash.com",
      "unsplash.com",
      "pixabay.com",
      "pexels.com",
      "flickr.com",
      "instagram.com",
      "pinterest.com",
      "googleusercontent.com",
      "amazonaws.com",
      "cloudinary.com",
      "imagekit.io",
    ]

    const lowerUrl = url.toLowerCase()
    return (
      imageExtensions.some((ext) => lowerUrl.includes(ext)) ||
      imageHosts.some((host) => lowerUrl.includes(host)) ||
      lowerUrl.includes("image") ||
      lowerUrl.includes("photo") ||
      lowerUrl.includes("picture")
    )
  }

  if (!isImageUrl(url)) {
    return <div className={`text-sm text-gray-900 ${className}`}>{url}</div>
  }

  if (hasError) {
    return (
      <div className={`border border-gray-300 rounded-lg p-4 bg-gray-50 ${className}`}>
        <div className="flex items-center text-red-600">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">Failed to load image</span>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600">
            Open image in new tab
          </a>
        </div>
        <button
          onClick={() => {
            setHasError(false)
            setIsLoading(true)
          }}
          className="mt-2 text-xs text-blue-600"
        >
          Retry loading
        </button>
      </div>
    )
  }

  return (
    <div className={`relative flex justify-center ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-500">Loading image...</span>
          </div>
        </div>
      )}

      <img
        src={url || "/placeholder.svg"}
        alt={title || "Content image"}
        className={`max-w-full h-auto rounded-lg shadow-sm ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        style={{ maxHeight: "500px" }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true)
          setIsLoading(false)
        }}
      />
    </div>
  )
}
