'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function DebugTypeChangePage() {
  const [formData, setFormData] = useState<Record<string, any>>({
    'criterion-1': '3' // Simulate having a Likert scale value initially
  })
  const [criterionType, setCriterionType] = useState<'likert-scale' | 'custom-list'>('likert-scale')

  // Simulate criteria data based on type
  const getCriterion = () => {
    if (criterionType === 'likert-scale') {
      return {
        id: 1,
        type: 'likert-scale',
        title: 'Rate the quality',
        options: ['1', '2', '3', '4', '5']
      }
    } else {
      return {
        id: 1,
        type: 'custom-list',
        title: 'Select Response',
        options: ['Response 1', 'Response 2']
      }
    }
  }

  const criterion = getCriterion()

  const handleInputChange = (criterionId: number, value: any) => {
    const fieldName = `criterion-${criterionId}`
    console.log('Setting form data:', { fieldName, value })
    
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const clearCriterionFormData = (criterionId: number) => {
    const fieldName = `criterion-${criterionId}`
    setFormData(prev => {
      const newFormData = { ...prev }
      delete newFormData[fieldName]
      console.log('Cleared form data for:', fieldName, 'New form data:', newFormData)
      return newFormData
    })
  }

  const handleTypeChange = (newType: 'likert-scale' | 'custom-list') => {
    const wasTypeChanged = criterionType !== newType
    setCriterionType(newType)
    
    // Clear form data when type changes (this is our fix)
    if (wasTypeChanged) {
      console.log(`Type changed from ${criterionType} to ${newType}, clearing form data`)
      clearCriterionFormData(1)
    }
  }

  const fieldName = `criterion-${criterion.id}`
  const currentValue = formData[fieldName]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Type Change Issue</h1>
      
      {/* Type Selector */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-3">Simulate Criterion Type Change</h3>
        <div className="flex gap-3">
          <Button
            variant={criterionType === 'likert-scale' ? 'default' : 'outline'}
            onClick={() => handleTypeChange('likert-scale')}
          >
            Likert Scale (1-5)
          </Button>
          <Button
            variant={criterionType === 'custom-list' ? 'default' : 'outline'}
            onClick={() => handleTypeChange('custom-list')}
          >
            Custom List (Response 1/2)
          </Button>
        </div>
        <p className="text-sm mt-2 text-gray-600">
          This simulates what happens when a user edits a criterion and changes its type.
        </p>
      </div>
      
      {/* Current Criterion Display */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="font-semibold mb-4">{criterion.title} ({criterion.type})</h3>
        
        {criterion.type === 'likert-scale' && (
          <div className="grid grid-cols-5 gap-2">
            {criterion.options.map((option, index) => {
              const isSelected = currentValue === option
              return (
                <Button
                  key={index}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={`px-3 py-2 ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleInputChange(criterion.id, option)}
                >
                  {option}
                </Button>
              )
            })}
          </div>
        )}
        
        {criterion.type === 'custom-list' && (
          <div className="flex gap-3">
            {criterion.options.map((option, index) => {
              const isSelected = currentValue === option
              return (
                <Button
                  key={`${criterion.id}-${option}-${index}`}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  className={`px-4 py-2 ${
                    isSelected 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleInputChange(criterion.id, option)}
                >
                  {option}
                </Button>
              )
            })}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-white rounded border">
          <p className="text-sm"><strong>Current Selection:</strong> "{currentValue || 'none'}"</p>
          <p className="text-sm"><strong>Field Name:</strong> {fieldName}</p>
          <p className="text-sm"><strong>Full Form Data:</strong></p>
          <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded mb-4">
        <h4 className="font-semibold mb-2">How to Test the Bug Fix:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Start with "Likert Scale" mode and click one of the numbers (1-5)</li>
          <li>Switch to "Custom List" mode</li>
          <li>Check if any "Response 1" or "Response 2" buttons are incorrectly selected</li>
          <li>Before the fix: Old Likert values might interfere with button selection</li>
          <li>After the fix: Form data should be cleared when type changes</li>
        </ol>
      </div>

      <div className="bg-green-50 p-4 rounded">
        <h4 className="font-semibold mb-2">Expected Behavior (Fixed):</h4>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>When switching criterion types, old form data is cleared</li>
          <li>Custom list buttons should start with no selection</li>
          <li>Only the clicked button should be active</li>
          <li>No conflicts between different criterion types</li>
        </ul>
      </div>
    </div>
  )
}
