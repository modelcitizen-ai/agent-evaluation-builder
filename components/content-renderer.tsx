"use client"

import React, { useEffect, useState } from "react"
import { marked } from "marked"
import DOMPurify from "dompurify"
import VideoPlayer from "./video-player"
import ImageRenderer from "./image-renderer"

interface ContentRendererProps {
  content: string | any[] | { data: any[]; columns: string[]; fileType?: string };
  title?: string;
  className?: string;
}

// Unified function to convert any content to HTML
function convertContentToHtml(content: string, title?: string): string {
  if (!content || typeof content !== "string") return content;

  // Clean medical report text if it's a ground truth impression
  const shouldCleanText = title === "Ground Truth Impression (Original)";
  let processedText = shouldCleanText ? cleanTextContentForDisplay(content) : content;

  // Check if content already contains HTML tags
  const hasHtmlTags = /<[^>]+>/.test(processedText);
  
  if (hasHtmlTags) {
    console.log('[ContentRenderer] Content already contains HTML, using as-is');
    return processedText;
  }

  // Check if content has markdown syntax
  const hasMarkdownSyntax = /[#*_`~\[\]\(\)]/.test(processedText);
  
  if (hasMarkdownSyntax) {
    console.log('[ContentRenderer] Converting markdown to HTML');
    try {
      // Configure marked for safe, compact output
      marked.setOptions({
        breaks: true, // Convert line breaks to <br>
        gfm: true,    // GitHub flavored markdown
      });
      
      const htmlResult = marked(processedText);
      return typeof htmlResult === 'string' ? htmlResult : processedText;
    } catch (error) {
      console.error('[ContentRenderer] Markdown conversion failed:', error);
      return processedText; // Fallback to original text
    }
  }

  console.log('[ContentRenderer] Plain text content, converting newlines to <br>');
  // For plain text, convert newlines to <br> tags
  return processedText.replace(/\n/g, '<br>');
}

// Helper function to clean medical report text
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

  // Add debug logging for all content
  console.log('[ContentRenderer] Called with title:', title, 'content type:', typeof content, 'content preview:', 
    typeof content === 'string' ? content.substring(0, 100) + '...' : 'non-string content')
  
  if (title === 'Completion' && typeof content === 'string') {
    console.log('[ContentRenderer] FULL COMPLETION CONTENT:', JSON.stringify(content))
  }

  // Clean medical report text if it's a ground truth impression
  // Only clean if this is the original version, not the already-cleaned version
  const shouldCleanText = title === "Ground Truth Impression (Original)" && typeof content === "string";
  const displayContent = shouldCleanText ? cleanTextContentForDisplay(content) : content;

  // Table rendering for parsed data (CSV, Excel, JSONL)
  if (isParsedTableData(displayContent)) {
    const { data, columns } = displayContent;
    if (data.length === 0 || columns.length === 0) {
      return <div className={className}>{title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}<div className="text-muted-foreground italic text-sm">No data</div></div>;
    }
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
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
        {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
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

  // Unified string rendering with HTML pipeline
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
            {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
            <VideoPlayer url={trimmedContent} title={title} />
          </div>
        )
      }

      // Check for image
      if (isImageUrl(trimmedContent)) {
        return (
          <div className={className}>
            {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
            <ImageRenderer url={trimmedContent} title={title} />
          </div>
        )
      }

      // If it's a URL but not video or image, render as a link
      return (
        <div className={className}>
          {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
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

    // UNIFIED PIPELINE: Convert all content to HTML and render consistently
    console.log('[ContentRenderer] Using unified HTML pipeline for content:', displayContent.substring(0, 100) + '...')
    
    const htmlContent = convertContentToHtml(displayContent, title);
    
    // Sanitize HTML content for security (only on client side)
    const sanitizedHtml = isClient 
      ? DOMPurify.sanitize(htmlContent, {
          ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'strong', 'em', 'b', 'i', 'u', 'br', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style'],
          KEEP_CONTENT: true
        })
      : htmlContent; // Fallback to original content during SSR
    
    console.log('[ContentRenderer] Final sanitized HTML:', sanitizedHtml)
    
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
        <div 
          className="prose prose-sm max-w-none text-foreground prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-a:text-blue-600 prose-a:no-underline dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    )
  }

  // If content is a plain object (not array, not null)
  if (typeof content === "object" && content !== null && !Array.isArray(content)) {
    return (
      <div className={className}>
        {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
        <pre className="text-xs bg-muted rounded p-2 overflow-x-auto text-foreground border border-border">
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
          {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
          <pre className="text-xs bg-muted rounded p-2 overflow-x-auto text-foreground border border-border">
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
        {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
        <div className="text-sm text-foreground">{content}</div>
      </div>
    )
  }

  // Fallback for unknown types
  return (
    <div className={className}>
      {title && <div className="text-sm font-semibold text-muted-foreground mb-2">{title}</div>}
      <div className="text-muted-foreground italic text-sm">Unsupported content type</div>
    </div>
  )
}