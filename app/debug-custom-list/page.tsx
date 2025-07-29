'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function DebugCustomListPage() {
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Simulate a custom list criterion with Response 1 and Response 2
  const criterion = {
    id: 'test-criterion',
    type: 'custom-list',
    title: 'Select Response',
    options: ['Response 1', 'Response 2']
  }

  const handleInputChange = (name: string, value: any) => {
    console.log('Input change:', { name, value, currentFormData: formData })
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const fieldName = `criterion-${criterion.id}`
  const currentValue = formData[fieldName]

  console.log('Current render state:', {
    fieldName,
    currentValue,
    formData,
    criterionOptions: criterion.options
  })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Custom List Buttons</h1>
      
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="font-semibold mb-4">{criterion.title}</h3>
        
        <div className="flex gap-3">
          {criterion.options.map((option, index) => {
            const isSelected = currentValue === option
            
            console.log(`Button ${option}:`, {
              option,
              currentValue,
              isSelected,
              comparison: `"${currentValue}" === "${option}"`
            })
            
            return (
              <Button
                key={index}
                type="button"
                variant={isSelected ? "default" : "outline"}
                className={`px-4 py-2 ${
                  isSelected 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  console.log(`Clicked ${option}`)
                  handleInputChange(fieldName, option)
                }}
              >
                {option}
              </Button>
            )
          })}
        </div>
        
        <div className="mt-4 p-3 bg-white rounded border">
          <p><strong>Current Selection:</strong> {currentValue || 'None'}</p>
          <p><strong>Form Data:</strong> {JSON.stringify(formData, null, 2)}</p>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold mb-2">Expected Behavior:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Only one button should be active (blue) at a time</li>
          <li>Clicking "Response 1" should make only that button active</li>
          <li>Clicking "Response 2" should make only that button active</li>
          <li>The form data should contain the selected option</li>
        </ul>
      </div>

      <div className="mt-6">
        <Button 
          className={`w-full ${currentValue ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'}`}
          disabled={!currentValue}
        >
          Submit {currentValue ? `(Selected: ${currentValue})` : '(No selection)'}
        </Button>
      </div>
    </div>
  )
}
