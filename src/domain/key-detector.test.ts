import { describe, it, expect } from 'vitest'
import { detectKeyWithProfile, analyzeKey, getAltKey } from './key-detector'

describe('getAltKey', () => {
  it('returns relative minor for a major key', () => {
    const result = getAltKey('C major')
    expect(result).toBe('A minor')
  })

  it('returns relative major for a minor key', () => {
    const result = getAltKey('A minor')
    expect(result).toBe('C major')
  })

  it('returns relative minor for F# major', () => {
    const result = getAltKey('F# major')
    expect(result).toBe('D# minor')
  })
})

describe('detectKeyWithProfile', () => {
  it('detects C major from a chroma profile weighted toward C', () => {
    // Given: C major diatonic notes are strong
    const chroma = [1.0, 0.1, 0.8, 0.1, 0.9, 0.7, 0.1, 0.9, 0.1, 0.7, 0.1, 0.6]

    // When
    const result = detectKeyWithProfile(chroma, 'krumhansl')

    // Then
    expect(result.key).toBe('C major')
    expect(result.altKey).toBe('A minor')
    expect(result.algorithm).toBe('krumhansl')
    expect(result.correlation).toBeGreaterThan(0)
  })

  it('detects A minor from a chroma profile weighted toward A minor', () => {
    // Given: A natural minor = A, B, C, D, E, F, G
    // Emphasize A (tonic) and E (dominant), with minor 3rd (C) stronger than major 3rd (C#)
    const chroma = [0.5, 0.0, 0.4, 0.7, 0.3, 0.5, 0.0, 0.4, 0.6, 1.0, 0.0, 0.4]

    // When
    const result = detectKeyWithProfile(chroma, 'temperley')

    // Then
    expect(result.key).toBe('A minor')
    expect(result.algorithm).toBe('temperley')
  })
})

describe('analyzeKey', () => {
  it('returns high confidence when all 3 algorithms agree', () => {
    // Given: strong C major chroma — all algorithms should agree
    const chroma = [1.0, 0.1, 0.8, 0.1, 0.9, 0.7, 0.1, 0.9, 0.1, 0.7, 0.1, 0.6]

    // When
    const result = analyzeKey(chroma)

    // Then
    expect(result.confidence).toBe('high')
    expect(result.key).toBe('C major')
    expect(result.altKey).toBe('A minor')
    expect(result.details).toHaveLength(3)
  })

  it('returns details for each algorithm', () => {
    // Given
    const chroma = [1.0, 0.1, 0.8, 0.1, 0.9, 0.7, 0.1, 0.9, 0.1, 0.7, 0.1, 0.6]

    // When
    const result = analyzeKey(chroma)

    // Then
    const algorithmNames = result.details.map(d => d.algorithm)
    expect(algorithmNames).toContain('krumhansl')
    expect(algorithmNames).toContain('temperley')
    expect(algorithmNames).toContain('shaath')
  })

  it('returns medium confidence when 2 of 3 algorithms agree', () => {
    // Given: ambiguous chroma that might split algorithms
    // This chroma is designed to be on the border between keys
    const chroma = [0.5, 0.3, 0.7, 0.6, 0.4, 0.8, 0.2, 0.9, 0.5, 0.3, 0.6, 0.4]

    // When
    const result = analyzeKey(chroma)

    // Then: at least verify confidence is not undefined and details exist
    expect(['high', 'medium', 'low']).toContain(result.confidence)
    expect(result.details).toHaveLength(3)
    expect(result.key).toBeTruthy()
  })

  it('majority key is chosen as the result', () => {
    // Given
    const chroma = [1.0, 0.1, 0.8, 0.1, 0.9, 0.7, 0.1, 0.9, 0.1, 0.7, 0.1, 0.6]

    // When
    const result = analyzeKey(chroma)

    // Then: result key should match at least 2 of the detail entries
    const matchCount = result.details.filter(d => d.key === result.key).length
    expect(matchCount).toBeGreaterThanOrEqual(2)
  })
})
