"use client"

export default function DebugTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-red-600 mb-4">
        🔴 DEBUG TEST FILE - THIS PROVES FILES ARE UPDATING 🔴
      </h1>
      <p className="text-xl">
        If you can see this file, then file updates are working.
      </p>
      <p className="text-lg mt-4">
        Navigate back to: http://localhost:3000/data-scientist
      </p>
      <div className="mt-8 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <h2 className="text-xl font-bold mb-2">Expected Dropdown Options:</h2>
        <ol className="list-decimal list-inside">
          <li>Edit</li>
          <li>Preview</li>
          <li>View Progress</li>
          <li>Add Participants</li>
          <li>Delete</li>
        </ol>
      </div>
    </div>
  )
}
