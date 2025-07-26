"use client"

export default function DebugTest() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-red-600 mb-4">
        🔴 DEBUG TEST FILE - THIS PROVES FILES ARE UPDATING 🔴
      </h1>
      <p className="text-xl">
        If you can see this file, then file updates are working.
      </p>
      <p className="text-lg mt-4">
        Navigate to: http://localhost:3000/data-scientist/debug-test
      </p>
    </div>
  )
}
