"use client"

interface TableCellRendererProps {
  content: string | number | boolean | null | undefined
  preserveFormatting?: boolean
  cellType?: 'text' | 'number' | 'boolean' | 'json' | 'auto'
  className?: string
}

export default function TableCellRenderer({
  content,
  preserveFormatting = false,
  cellType = 'auto',
  className = ""
}: TableCellRendererProps) {
  // Handle null/undefined/empty content
  if (content === null || content === undefined || content === '') {
    return <span className={`text-gray-400 italic ${className}`}>—</span>
  }

  // If content is a native object or array, render as pretty JSON
  if (typeof content === 'object') {
    return (
      <div className={`font-mono text-xs ${className}`}>
        <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
      </div>
    )
  }

  // Convert to string for processing
  const stringContent = String(content)

  // Detect content type if auto
  const detectContentType = (str: string): 'text' | 'number' | 'boolean' | 'json' => {
    if (typeof content === 'boolean') return 'boolean'
    if (typeof content === 'number') return 'number'
    
    // Try to detect JSON
    if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
      try {
        JSON.parse(str)
        return 'json'
      } catch {
        // Not valid JSON, fall through to text
      }
    }
    
    return 'text'
  }

  const detectedType = cellType === 'auto' ? detectContentType(stringContent) : cellType

  // Process content based on type
  const processContent = (str: string, type: string) => {
    switch (type) {
      case 'boolean':
        return content ? '✓ True' : '✗ False'
      
      case 'number':
        const num = Number(content)
        // Don't add thousand separators to preserve original data appearance
        return isNaN(num) ? str : String(num)
      
      case 'json':
        try {
          const parsed = JSON.parse(str)
          return JSON.stringify(parsed, null, 2)
        } catch {
          return processTextContent(str)
        }
      
      case 'text':
      default:
        return processTextContent(str)
    }
  }

  const processTextContent = (str: string) => {
    // Handle multi-line content - only for display, not modifying source data
    if (!preserveFormatting) {
      // Don't replace newlines - let CSS handle the display
      // This preserves the original Excel formatting
      return str.trim()
    }

    return str
  }

  const displayContent = processContent(stringContent, detectedType)

  // Render based on content type
  if (detectedType === 'boolean') {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        content ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      } ${className}`}>
        {displayContent}
      </span>
    )
  }

  if (detectedType === 'number') {
    return (
      <span className={`font-mono text-right ${className}`}>
        {displayContent}
      </span>
    )
  }

  if (detectedType === 'json') {
    return (
      <div className={`font-mono text-xs ${className}`}>
        <pre className="whitespace-pre-wrap">{displayContent}</pre>
      </div>
    )
  }

  // Text content
  if (preserveFormatting && stringContent.includes('\n')) {
    return (
      <pre className={`whitespace-pre-wrap text-sm font-sans ${className}`}>
        {displayContent}
      </pre>
    )
  }

  return (
    <span className={`text-sm whitespace-pre-wrap align-top ${className}`}>
      {displayContent}
    </span>
  )
}
