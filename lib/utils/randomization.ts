/**
 * Randomization utilities for sample ordering
 * Provides seeded randomization based on participant ID to ensure
 * consistent but randomized sample presentation for each reviewer
 */

/**
 * Simple seeded random number generator
 * Based on the Park-Miller PRNG algorithm
 */
function seededRandom(seed: number): number {
  const a = 1664525
  const c = 1013904223
  const m = Math.pow(2, 32)
  
  seed = (a * seed + c) % m
  return seed / m
}

/**
 * Create a seeded random number generator for a given string seed
 */
function createSeededGenerator(seedString: string) {
  // Convert string to numeric seed
  let seed = 0
  for (let i = 0; i < seedString.length; i++) {
    seed = ((seed << 5) - seed + seedString.charCodeAt(i)) & 0xffffffff
  }
  seed = Math.abs(seed)
  
  return {
    next(): number {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
  }
}

/**
 * Generate a shuffled array of indices for a given participant
 * This ensures each participant sees the same randomized order consistently
 */
function generateShuffledIndices(participantId: string, totalLength: number): number[] {
  const generator = createSeededGenerator(participantId)
  const indices = Array.from({ length: totalLength }, (_, i) => i)
  
  // Fisher-Yates shuffle with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(generator.next() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  
  return indices
}

/**
 * Get the actual data index for a given UI position and participant
 * @param participantId - Unique identifier for the participant
 * @param uiPosition - The position shown in the UI (1-based)
 * @param totalLength - Total number of data items
 * @returns The actual index in the data array (0-based)
 */
export function getDataIndexForPosition(
  participantId: string, 
  uiPosition: number, 
  totalLength: number
): number {
  // Generate consistent shuffled order for this participant
  const shuffledIndices = generateShuffledIndices(participantId, totalLength)
  
  // Convert UI position (1-based) to array index (0-based)
  const positionIndex = (uiPosition - 1) % totalLength
  
  // Return the actual data index for this position
  return shuffledIndices[positionIndex]
}

/**
 * Get the UI position for a given data index and participant
 * This is the inverse of getDataIndexForPosition
 * @param participantId - Unique identifier for the participant
 * @param dataIndex - The actual index in the data array (0-based)
 * @param totalLength - Total number of data items
 * @returns The position shown in the UI (1-based)
 */
export function getPositionForDataIndex(
  participantId: string, 
  dataIndex: number, 
  totalLength: number
): number {
  // Generate consistent shuffled order for this participant
  const shuffledIndices = generateShuffledIndices(participantId, totalLength)
  
  // Find the position of this data index in the shuffled array
  const positionIndex = shuffledIndices.indexOf(dataIndex)
  
  // Convert to 1-based UI position
  return positionIndex + 1
}
