"use client"

import { useState } from "react"
import { PlayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface VideoPlayerProps {
  url: string
  title?: string
  className?: string
}

export default function VideoPlayer({ url, title, className = "" }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Extract YouTube video ID from various YouTube URL formats
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Extract Vimeo video ID
  const extractVimeoId = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/)
    return match ? match[1] : null
  }

  // Check if URL is a video URL
  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".flv"]
    const videoHosts = ["youtube.com", "youtu.be", "vimeo.com"]

    return (
      videoExtensions.some((ext) => url.toLowerCase().includes(ext)) ||
      videoHosts.some((host) => url.toLowerCase().includes(host))
    )
  }

  if (!isVideoUrl(url)) {
    return <div className={`text-sm text-gray-900 ${className}`}>{url}</div>
  }

  if (hasError) {
    return (
      <div className={`border border-gray-300 rounded-lg p-4 bg-gray-50 ${className}`}>
        <div className="flex items-center text-red-600">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">Failed to load video</span>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Open video in new tab
          </a>
        </div>
      </div>
    )
  }

  // YouTube video
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return (
      <div className={`relative ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
          title={title || "YouTube video"}
          className="w-full aspect-video rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    )
  }

  // Vimeo video
  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    return (
      <div className={`relative ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={title || "Vimeo video"}
          className="w-full aspect-video rounded-lg"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    )
  }

  // Direct video file
  return (
    <div className={`relative ${className}`}>
      <video
        controls
        className="w-full max-h-96 rounded-lg"
        onLoadStart={() => setIsLoading(true)}
        onLoadedData={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        crossOrigin="anonymous"
      >
        <source src={url} />
        Your browser does not support the video tag.
      </video>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <PlayIcon className="h-12 w-12 text-gray-400" />
        </div>
      )}
    </div>
  )
}
