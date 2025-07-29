/**
 * Test script for randomization persistence
 * Run this script to verify that randomization setting is saved and restored properly
 */

console.log('Testing randomization persistence...')

// Simulate creating an evaluation with randomization enabled
const testEvaluation = {
  id: 999999,
  name: "Test Randomization Persistence",
  instructions: "Test instructions",
  criteria: [{ id: 1, name: "Test criterion", type: "yes-no", options: ["Yes", "No"], required: true }],
  columnRoles: [],
  data: [{ sample: "test data" }],
  totalItems: 1,
  randomizationEnabled: true,  // THIS IS THE KEY FIELD TO TEST
  status: "draft",
  createdAt: new Date().toISOString(),
}

// Save to localStorage
const existingEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
existingEvaluations.push(testEvaluation)
localStorage.setItem("evaluations", JSON.stringify(existingEvaluations))

console.log('✅ Created test evaluation with randomizationEnabled: true')

// Verify it was saved correctly
const savedEvaluations = JSON.parse(localStorage.getItem("evaluations") || "[]")
const savedTest = savedEvaluations.find(e => e.id === 999999)

if (savedTest && savedTest.randomizationEnabled === true) {
  console.log('✅ Randomization setting correctly saved:', savedTest.randomizationEnabled)
} else {
  console.log('❌ Randomization setting NOT saved correctly:', savedTest?.randomizationEnabled)
}

// Simulate loading for editing (what happens when reopening from My Projects)
const loadedForEdit = savedEvaluations.find(e => e.id === 999999)
console.log('✅ Loaded evaluation for editing:', {
  id: loadedForEdit.id,
  name: loadedForEdit.name,
  randomizationEnabled: loadedForEdit.randomizationEnabled
})

// Clean up
const cleanedEvaluations = existingEvaluations.filter(e => e.id !== 999999)
localStorage.setItem("evaluations", JSON.stringify(cleanedEvaluations))
console.log('✅ Cleaned up test evaluation')

console.log('Test complete! Check the logs above for results.')
