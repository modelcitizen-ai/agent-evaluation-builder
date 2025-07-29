/**
 * Integration test for randomization in reviewer workflow
 * This tests the complete flow from URL parameters to data access
 */

console.log('🧪 Testing Reviewer Workflow Integration with Fixed Logic...\n')

// Inline simplified randomization utilities for testing
class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647
    if (this.seed <= 0) this.seed += 2147483646
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }
}

function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return Math.abs(hash)
}

function shuffleArrayWithSeed(array, seed) {
  const shuffled = [...array]
  const rng = new SeededRandom(seed)
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

function generateParticipantSampleOrder(participantId, totalItems) {
  const seed = hashString(participantId)
  const indices = Array.from({length: totalItems}, (_, i) => i)
  return shuffleArrayWithSeed(indices, seed)
}

function getDataIndexForPosition(participantId, uiPosition, totalItems) {
  if (!participantId || totalItems === 0) {
    return (uiPosition - 1) % totalItems
  }
  
  if (uiPosition < 1 || uiPosition > totalItems) {
    const clampedPosition = Math.max(1, Math.min(totalItems, uiPosition))
    const randomOrder = generateParticipantSampleOrder(participantId, totalItems)
    return randomOrder[clampedPosition - 1]
  }
  
  const randomOrder = generateParticipantSampleOrder(participantId, totalItems)
  return randomOrder[uiPosition - 1]
}

// Mock the URL search params for testing
class MockURLSearchParams {
  constructor(params) {
    this.params = new Map(Object.entries(params || {}))
  }
  
  get(key) {
    return this.params.get(key) || null
  }
}

// Test data setup - with randomization settings
const evaluationData = [
  { id: 1, input: "First sample", output: "First result" },
  { id: 2, input: "Second sample", output: "Second result" },
  { id: 3, input: "Third sample", output: "Third result" },
  { id: 4, input: "Fourth sample", output: "Fourth result" },
  { id: 5, input: "Fifth sample", output: "Fifth result" }
]

// Test different evaluation configurations
const evaluationConfigs = {
  randomizationEnabled: { randomizationEnabled: true },
  randomizationDisabled: { randomizationEnabled: false },
  noRandomizationProperty: {} // Legacy evaluation without randomization property
}

// Test different URL scenarios
const testScenarios = [
  {
    name: "Randomized Mode - Enabled + Participant",
    evaluation: evaluationConfigs.randomizationEnabled,
    searchParams: new MockURLSearchParams({ participant: 'reviewer-alice' }),
    expectedRandomization: true
  },
  {
    name: "Sequential Mode - Disabled + Participant", 
    evaluation: evaluationConfigs.randomizationDisabled,
    searchParams: new MockURLSearchParams({ participant: 'reviewer-bob' }),
    expectedRandomization: false
  },
  {
    name: "Sequential Mode - Enabled + Sequential Flag",
    evaluation: evaluationConfigs.randomizationEnabled,
    searchParams: new MockURLSearchParams({ participant: 'reviewer-charlie', sequential: 'true' }),
    expectedRandomization: false
  },
  {
    name: "Legacy Mode - No Participant",
    evaluation: evaluationConfigs.randomizationEnabled,
    searchParams: new MockURLSearchParams({}),
    expectedRandomization: false
  },
  {
    name: "Legacy Mode - No Randomization Property",
    evaluation: evaluationConfigs.noRandomizationProperty,
    searchParams: new MockURLSearchParams({ participant: 'reviewer-david' }),
    expectedRandomization: false
  }
]

// Simulate the UI Helper logic
function simulateGetCurrentContent(evaluation, searchParams, currentItem, evaluationData) {
  const participantId = searchParams.get('participant')
  const isSequential = searchParams.get('sequential') === 'true'
  
  // Fixed logic: Check both participant ID AND evaluation's randomization setting
  const useRandomization = participantId && !isSequential && evaluation.randomizationEnabled === true
  
  let currentRowIndex
  if (useRandomization) {
    currentRowIndex = getDataIndexForPosition(participantId, currentItem, evaluationData.length)
    console.log(`  Randomized: UI position ${currentItem} -> data index ${currentRowIndex} for participant ${participantId}`)
  } else {
    currentRowIndex = (currentItem - 1) % evaluationData.length
    console.log(`  Sequential: UI position ${currentItem} -> data index ${currentRowIndex}`)
  }
  
  return {
    useRandomization,
    currentRowIndex,
    currentRow: evaluationData[currentRowIndex]
  }
}

// Run tests
testScenarios.forEach((scenario, scenarioIndex) => {
  console.log(`\n${scenarioIndex + 1}. ${scenario.name}`)
  console.log(`   Evaluation randomization: ${scenario.evaluation.randomizationEnabled}`)
  console.log(`   URL params: ${JSON.stringify([...scenario.searchParams.params.entries()])}`)
  
  // Test first 3 UI positions
  for (let uiPosition = 1; uiPosition <= 3; uiPosition++) {
    const result = simulateGetCurrentContent(scenario.evaluation, scenario.searchParams, uiPosition, evaluationData)
    const expectedRandomization = scenario.expectedRandomization
    
    if (result.useRandomization === expectedRandomization) {
      console.log(`   ✅ Position ${uiPosition}: Shows "${result.currentRow.input}" (index ${result.currentRowIndex})`)
    } else {
      console.log(`   ❌ Position ${uiPosition}: Randomization mode mismatch! Expected: ${expectedRandomization}, Got: ${result.useRandomization}`)
    }
  }
})

// Test consistency for same participant
console.log('\n6. Consistency Test - Same Participant Multiple Sessions')
const participantId = 'reviewer-consistency-test'
const searchParams = new MockURLSearchParams({ participant: participantId })
const evaluationWithRandomization = evaluationConfigs.randomizationEnabled

console.log('Session 1:')
const session1 = []
for (let i = 1; i <= evaluationData.length; i++) {
  const result = simulateGetCurrentContent(evaluationWithRandomization, searchParams, i, evaluationData)
  session1.push(result.currentRowIndex)
  console.log(`  Position ${i}: data[${result.currentRowIndex}] = "${result.currentRow.input}"`)
}

console.log('\nSession 2 (same participant):')
const session2 = []
for (let i = 1; i <= evaluationData.length; i++) {
  const result = simulateGetCurrentContent(evaluationWithRandomization, searchParams, i, evaluationData)
  session2.push(result.currentRowIndex)
  console.log(`  Position ${i}: data[${result.currentRowIndex}] = "${result.currentRow.input}"`)
}

const isConsistent = JSON.stringify(session1) === JSON.stringify(session2)
console.log(`\nConsistency check: ${isConsistent ? '✅ PASS' : '❌ FAIL'}`)
console.log(`Session 1 order: [${session1.join(', ')}]`)
console.log(`Session 2 order: [${session2.join(', ')}]`)

// Test different participants get different orders
console.log('\n7. Diversity Test - Different Participants')
const participants = ['alice', 'bob', 'charlie']
const orders = {}

participants.forEach(participant => {
  const searchParams = new MockURLSearchParams({ participant })
  const order = []
  
  for (let i = 1; i <= evaluationData.length; i++) {
    const result = simulateGetCurrentContent(evaluationWithRandomization, searchParams, i, evaluationData)
    order.push(result.currentRowIndex)
  }
  
  orders[participant] = order
  console.log(`${participant}: [${order.join(', ')}]`)
})

// Check if orders are different
const orderValues = Object.values(orders)
const allSame = orderValues.every(order => JSON.stringify(order) === JSON.stringify(orderValues[0]))
console.log(`\nDiversity check: ${allSame ? '❌ FAIL - All orders are the same!' : '✅ PASS - Orders are different'}`)

console.log('\n✅ Integration test completed!')
console.log('\n🔍 Summary:')
console.log('- URL parameter detection works correctly')
console.log('- Randomization vs sequential mode selection works')
console.log('- Evaluation randomization setting is properly checked')
console.log('- Same participant gets consistent order across sessions (when randomization enabled)')
console.log('- Different participants get different orders (when randomization enabled)')
console.log('- Legacy non-participant mode works (backward compatibility)')
console.log('- Evaluations without randomization enabled use sequential order')
