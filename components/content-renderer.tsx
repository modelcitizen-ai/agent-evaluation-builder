"use client"

import React, { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import DOMPurify from "dompurify"
import VideoPlayer from "./video-player"
import ImageRenderer from "./image-renderer"

interface ContentRendererProps {
  content: string | any[] | { data: any[]; columns: string[]; fileType?: string };
  title?: string;
  className?: string;
}

function isParsedTableData(
  content: any
): content is { data: any[]; columns: string[]; fileType?: string } {
  return (
    content &&
    typeof content === "object" &&
    Array.isArray(content.data) &&
    Array.isArray(content.columns)
  );
}

function isArrayOfObjects(content: any): content is any[] {
  return Array.isArray(content) && content.length > 0 && typeof content[0] === "object";
}

export default function ContentRenderer({ content, title, className = "" }: ContentRendererProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Clean medical report text if it's a ground truth impression
  // Only clean if this is the original version, not the already-cleaned version
  const shouldCleanText = title === "Ground Truth Impression (Original)" && typeof content === "string";
  const displayContent = shouldCleanText ? cleanTextContentForDisplay(content) : content;

  // Helper function to convert numbered lists to HTML ordered list
  function formatNumberedListsAsHtml(text: string): React.ReactElement {
    // First, try to split the text at numbered list patterns
    // Handle both line-based and inline numbered lists
    let processedText = text;
    
    // Check if we have inline numbered lists (like "text. 1. item 2. item")
    if (text.match(/[.]\s+\d+\.\s+/) || text.match(/,\s*\d+\.\s+/)) {
      // Split at the first numbered item to separate narrative from list
      const splitPattern = /([^]*?)(?=\s*\d+\.\s+)/;
      const match = text.match(splitPattern);
      
      if (match && match[1]) {
        const narrativeText = match[1].trim();
        const listPart = text.substring(match[1].length).trim();
        
        // Extract numbered items from the list part
        const numberedItems = listPart.match(/\d+\.\s+[^0-9]*?(?=\d+\.|$)/g);
        
        if (numberedItems && numberedItems.length > 0) {
          const cleanedItems = numberedItems.map(item => 
            item.replace(/^\d+\.\s+/, '').replace(/,\s*$/, '').trim()
          ).filter(item => item.length > 0);
          
          return (
            <div className="leading-relaxed space-y-1">
              {narrativeText && <div className="text-sm text-gray-900 mb-3">{narrativeText}</div>}
              <ol className="list-decimal ml-6 mb-2 space-y-1" style={{ listStylePosition: 'outside' }}>
                {cleanedItems.map((item, idx) => (
                  <li key={idx} className="text-sm text-gray-900 pl-2">{item}</li>
                ))}
              </ol>
            </div>
          );
        }
      }
    }
    
    // Fallback to line-based processing for traditional format
    const lines = processedText.split('\n');
    const result: (string | React.ReactElement)[] = [];
    let currentList: string[] = [];
    let listIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts with numbered item (e.g., "1. ", "2. ", etc.)
      // More flexible pattern to handle various spacing
      const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        currentList.push(numberedMatch[2]);
      } else {
        // If we were building a list and hit a non-numbered line, render the list
        if (currentList.length > 0) {
          result.push(
            <ol key={`list-${listIndex++}`} className="list-decimal ml-6 mb-2 space-y-1" style={{ listStylePosition: 'outside' }}>
              {currentList.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-900 pl-2">{item}</li>
              ))}
            </ol>
          );
          currentList = [];
        }
        
        // Add non-numbered line (if not empty)
        if (line.trim()) {
          result.push(<div key={`text-${i}`} className="text-sm text-gray-900">{line}</div>);
        } else {
          result.push(<div key={`space-${i}`} className="h-2" />);
        }
      }
    }

    // Handle any remaining list items
    if (currentList.length > 0) {
      result.push(
        <ol key={`list-${listIndex}`} className="list-decimal ml-6 mb-2 space-y-1" style={{ listStylePosition: 'outside' }}>
          {currentList.map((item, idx) => (
            <li key={idx} className="text-sm text-gray-900 pl-2">{item}</li>
          ))}
        </ol>
      );
    }

    return <div className="leading-relaxed space-y-1">{result}</div>;
  }
  function cleanTextContentForDisplay(text: string): string {
    if (!text || typeof text !== "string") return text;
    
    let cleaned = text;
    
    // Convert XXXX redactions to [REDACTED] format for professional display
    cleaned = cleaned.replace(/\bXXXX\b/g, '[REDACTED]');
    
    // Clean up orphaned punctuation and formatting artifacts
    cleaned = cleaned.replace(/^\s*[.,;:]\s*/gm, ''); // Remove leading punctuation on lines
    cleaned = cleaned.replace(/\n\s*[.,;:]\s*\n/g, '\n'); // Remove punctuation on its own line
    
    // Fix double punctuation artifacts
    cleaned = cleaned.replace(/\.\s*,/g, '.'); // Period followed by comma
    cleaned = cleaned.replace(/,\s*\./g, '.'); // Comma followed by period
    cleaned = cleaned.replace(/;\s*,/g, ';'); // Semicolon followed by comma
    cleaned = cleaned.replace(/:\s*,/g, ':'); // Colon followed by comma
    
    // Clean up extra whitespace and newlines
    cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n'); // Multiple newlines to double
    cleaned = cleaned.replace(/^\s+|\s+$/g, ''); // Trim start and end
    cleaned = cleaned.replace(/\s+\n/g, '\n'); // Remove trailing spaces before newlines
    
    return cleaned;
  }

  // Table rendering for parsed data (CSV, Excel, JSONL)
  if (isParsedTableData(displayContent)) {
    const { data, columns } = displayContent;
    if (data.length === 0 || columns.length === 0) {
      return <div className={className}>{title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}<div className="text-gray-500 italic text-sm">No data</div></div>;
    }
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs text-left">
            <thead>
              <tr>
                {columns.map((col: string) => (
                  <th key={col} className="border-b px-2 py-1 font-semibold bg-gray-50">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={i} className="even:bg-gray-50">
                  {columns.map((col: string) => (
                    <td key={col} className="border-b px-2 py-1">{row[col] !== undefined ? String(row[col]) : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // If content is an array of objects (legacy fallback)
  if (isArrayOfObjects(displayContent)) {
    const columns = Object.keys(displayContent[0]);
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs text-left">
            <thead>
              <tr>
                {columns.map((col: string) => (
                  <th key={col} className="border-b px-2 py-1 font-semibold bg-gray-50">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayContent.map((row: any, i: number) => (
                <tr key={i} className="even:bg-gray-50">
                  {columns.map((col: string) => (
                    <td key={col} className="border-b px-2 py-1">{row[col] !== undefined ? String(row[col]) : ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Legacy string rendering logic
  if (typeof displayContent === "string") {
    // Check if content is a URL (simple check)
    const isUrl = (text: string): boolean => {
      try {
        new URL(text.trim())
        return true
      } catch {
        return false
      }
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
      return imageExtensions.some((ext) => lowerUrl.includes(ext)) || imageHosts.some((host) => lowerUrl.includes(host))
    }

    // Check if content is ONLY a URL (not mixed content)
    const trimmedContent = displayContent.trim()
    const isOnlyUrl = isUrl(trimmedContent) && !trimmedContent.includes('\n') && !trimmedContent.includes(' ')

    // If content is ONLY a URL, determine what type of content to render
    if (isOnlyUrl) {
      // Check for video first (more specific)
      if (isVideoUrl(trimmedContent)) {
        return (
          <div className={className}>
            {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
            <VideoPlayer url={trimmedContent} title={title} />
          </div>
        )
      }

      // Check for image
      if (isImageUrl(trimmedContent)) {
        return (
          <div className={className}>
            {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
            <ImageRenderer url={trimmedContent} title={title} />
          </div>
        )
      }

      // If it's a URL but not video or image, render as a link
      return (
        <div className={className}>
          {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
          <a
            href={trimmedContent}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 break-all"
          >
            {trimmedContent}
          </a>
        </div>
      )
    }

    // Otherwise render as text with proper multi-line formatting
    // Check if content contains numbered lists and format as HTML ordered list
    // More flexible regex to catch various numbered list formats including inline lists
    if (displayContent.match(/^[\s]*\d+\.\s+/m) || 
        displayContent.match(/\n\s*\d+\.\s+/) || 
        displayContent.match(/,\s*\d+\.\s+/) ||
        displayContent.match(/\.\s+\d+\.\s+/)) {
      return (
        <div className={className}>
          {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
          {formatNumberedListsAsHtml(displayContent)}
        </div>
      )
    }

    // HTML rendering block - check for HTML tags and render safely
    if (/<[^>]+>/.test(displayContent)) {
      // Sanitize HTML content for security (only on client side)
      const sanitizedHtml = isClient 
        ? DOMPurify.sanitize(displayContent, {
            ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'strong', 'em', 'b', 'i', 'u', 'br', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
            KEEP_CONTENT: true
          })
        : displayContent; // Fallback to original content during SSR
      
      return (
        <div className={className}>
          {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
          <div 
            className="prose prose-sm text-gray-900 leading-relaxed prose-a:text-blue-600 prose-a:no-underline"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      )
    }

    // Markdown rendering block (fix: remove className from ReactMarkdown)
    if (
      displayContent.match(/[#*_`~>\[\]\(\)]/) // basic markdown characters
    ) {
      return (
        <div className={className}>
          {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
          <div className="prose prose-sm text-gray-900 whitespace-pre-wrap leading-relaxed prose-a:text-blue-600 prose-a:no-underline">
            <ReactMarkdown>
              {displayContent}
            </ReactMarkdown>
          </div>
        </div>
      )
    }
    
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
        <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{displayContent}</div>
      </div>
    )
  }

  // If content is a plain object (not array, not null)
  if (typeof content === "object" && content !== null && !Array.isArray(content)) {
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
        <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto text-gray-800 border border-gray-100">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    );
  }

  // If content is an array (not array of objects)
  if (Array.isArray(content)) {
    const arr = content as any[];
    if (arr.length === 0 || typeof arr[0] !== "object") {
      return (
        <div className={className}>
          {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto text-gray-800 border border-gray-100">
            {JSON.stringify(arr, null, 2)}
          </pre>
        </div>
      );
    }
  }

  // If content is a number
  if (typeof content === "number") {
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
        <div className="text-sm text-gray-900">{content}</div>
      </div>
    )
  }

  // Fallback for unknown types
  return (
    <div className={className}>
      {title && <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>}
      <div className="text-gray-500 italic text-sm">Unsupported content type</div>
    </div>
  )
}