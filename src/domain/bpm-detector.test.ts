import { describe, it, expect } from 'vitest'
import { detectBpmWithAlgorithm, analyzeBpm } from './bpm-detector'

function createPulseAudio(bpm: number, sampleRate: number, duration: number): Float32Array {
  const samplesPerBeat = (60 / bpm) * sampleRate
  const totalSamples = sampleRate * duration
  const audioData = new Float32Array(totalSamples)

  for (let i = 0; i < totalSamples; i++) {
    const posInBeat = i % samplesPerBeat
    if (posInBeat < sampleRate * 0.02) {
      audioData[i] = Math.sin(2 * Math.PI * 200 * i / sampleRate) * 0.8
    }
  }
  return audioData
}

describe('detectBpmWithAlgorithm', () => {
  it('detects 120 BPM with autocorrelation algorithm', () => {
    // Given
    const audioData = createPulseAudio(120, 44100, 10)

    // When
    const result = detectBpmWithAlgorithm(audioData, 44100, 'autocorrelation')

    // Then
    expect(result.bpm).toBeGreaterThanOrEqual(118)
    expect(result.bpm).toBeLessThanOrEqual(122)
    expect(result.algorithm).toBe('autocorrelation')
  })

  it('detects 120 BPM with onset-interval algorithm', () => {
    // Given
    const audioData = createPulseAudio(120, 44100, 10)

    // When
    const result = detectBpmWithAlgorithm(audioData, 44100, 'onset-interval')

    // Then
    expect(result.bpm).toBeGreaterThanOrEqual(115)
    expect(result.bpm).toBeLessThanOrEqual(125)
    expect(result.algorithm).toBe('onset-interval')
  })

  it('detects 120 BPM with spectral-flux algorithm', () => {
    // Given
    const audioData = createPulseAudio(120, 44100, 10)

    // When
    const result = detectBpmWithAlgorithm(audioData, 44100, 'spectral-flux')

    // Then
    expect(result.bpm).toBeGreaterThanOrEqual(115)
    expect(result.bpm).toBeLessThanOrEqual(125)
    expect(result.algorithm).toBe('spectral-flux')
  })

  it('detects 140 BPM with autocorrelation algorithm', () => {
    // Given
    const audioData = createPulseAudio(140, 44100, 10)

    // When
    const result = detectBpmWithAlgorithm(audioData, 44100, 'autocorrelation')

    // Then
    expect(result.bpm).toBeGreaterThanOrEqual(138)
    expect(result.bpm).toBeLessThanOrEqual(142)
  })
})

describe('analyzeBpm', () => {
  it('returns high confidence when all 3 algorithms agree within ±5 BPM', () => {
    // Given: clear 120 BPM pulse
    const audioData = createPulseAudio(120, 44100, 10)

    // When
    const result = analyzeBpm(audioData, 44100)

    // Then
    expect(result.confidence).toBe('high')
    expect(result.bpm).toBeGreaterThanOrEqual(115)
    expect(result.bpm).toBeLessThanOrEqual(125)
    expect(result.details).toHaveLength(3)
  })

  it('returns details for each algorithm', () => {
    // Given
    const audioData = createPulseAudio(120, 44100, 10)

    // When
    const result = analyzeBpm(audioData, 44100)

    // Then
    const names = result.details.map(d => d.algorithm)
    expect(names).toContain('autocorrelation')
    expect(names).toContain('onset-interval')
    expect(names).toContain('spectral-flux')
  })

  it('uses median BPM as the final result', () => {
    // Given
    const audioData = createPulseAudio(120, 44100, 10)

    // When
    const result = analyzeBpm(audioData, 44100)

    // Then: median of 3 values close to 120
    expect(result.bpm).toBeGreaterThanOrEqual(115)
    expect(result.bpm).toBeLessThanOrEqual(125)
  })
})
