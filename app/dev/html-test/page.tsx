/**
 * HTML Rendering Test Page
 * 
 * This page demonstrates and tests the HTML rendering functionality
 * in the ContentRenderer component.
 */

"use client"

import React, { useState } from "react"
import ContentRenderer from "@/components/content-renderer"

const testCases = [
  {
    id: "basic-html",
    title: "Basic HTML",
    content: `<p>This is a <strong>paragraph</strong> with <em>emphasis</em> and <u>underlined</u> text.</p>`
  },
  {
    id: "html-list",
    title: "HTML Lists",
    content: `
      <h3>HTML Features:</h3>
      <ul>
        <li>Safe HTML rendering</li>
        <li>DOMPurify sanitization</li>
        <li>Prose styling support</li>
      </ul>
      <h4>Ordered List:</h4>
      <ol>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
      </ol>
    `
  },
  {
    id: "mixed-content",
    title: "Mixed HTML and Markdown Characters",
    content: `<p>This HTML contains **markdown** characters but should render as HTML</p>`
  },
  {
    id: "markdown-content",
    title: "Pure Markdown",
    content: `# Markdown Header\n\nThis is **bold** and *italic* markdown text.\n\n- List item 1\n- List item 2\n- List item 3`
  },
  {
    id: "plain-text",
    title: "Plain Text",
    content: `This is plain text without any markup.`
  },
  {
    id: "csv-with-html",
    title: "CSV Cell with HTML (simulated)",
    content: `<div><h4>Model Response:</h4><p>The sentiment is <strong>positive</strong> based on:</p><ul><li>Positive language</li><li>Upbeat tone</li></ul></div>`
  }
]

export default function HTMLTestPage() {
  const [selectedTest, setSelectedTest] = useState(testCases[0])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            HTML Rendering Test
          </h1>
          <p className="text-gray-600">
            Testing HTML support in ContentRenderer component following markdown patterns
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Case Selector */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Cases</h2>
            
            <div className="space-y-2">
              {testCases.map((testCase) => (
                <button
                  key={testCase.id}
                  onClick={() => setSelectedTest(testCase)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTest.id === testCase.id
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{testCase.title}</div>
                  <div className="text-sm text-gray-500 mt-1 truncate">
                    {testCase.content.substring(0, 80)}...
                  </div>
                </button>
              ))}
            </div>

            {/* Raw Content Display */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Raw Content</h3>
              <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto text-gray-800">
                {selectedTest.content}
              </pre>
            </div>
          </div>

          {/* Rendered Output */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Rendered Output</h2>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <ContentRenderer 
                content={selectedTest.content}
                title={selectedTest.title}
                className="border-l-4 border-blue-500 pl-4"
              />
            </div>

            {/* Pattern Detection Info */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Pattern Detection</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">HTML detected:</span>{" "}
                  <span className={/<[^>]+>/.test(selectedTest.content) ? "text-green-600" : "text-red-600"}>
                    {/<[^>]+>/.test(selectedTest.content) ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Markdown chars detected:</span>{" "}
                  <span className={/[#*_`~>\[\]\(\)]/.test(selectedTest.content) ? "text-green-600" : "text-red-600"}>
                    {/[#*_`~>\[\]\(\)]/.test(selectedTest.content) ? "Yes" : "No"}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  HTML takes precedence over markdown when both are detected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
