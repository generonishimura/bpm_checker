import type { BpmDetectionEntry, BpmAnalysis, Confidence } from './types'

const MIN_BPM = 60
const MAX_BPM = 200
const BPM_TOLERANCE = 5

type BpmAlgorithm = 'autocorrelation' | 'onset-interval' | 'spectral-flux'

// --- Shared utilities ---

function computeEnergy(
  audioData: Float32Array,
  frameSize: number,
  hopSize: number,
): Float64Array {
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize)
  const energy = new Float64Array(numFrames)
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize
    let sum = 0
    for (let j = 0; j < frameSize; j++) {
      sum += audioData[start + j] * audioData[start + j]
    }
    energy[i] = sum / frameSize
  }
  return energy
}

function computeOnsetStrength(energy: Float64Array): Float64Array {
  const strength = new Float64Array(energy.length)
  for (let i = 1; i < energy.length; i++) {
    const diff = energy[i] - energy[i - 1]
    strength[i] = diff > 0 ? diff : 0
  }
  return strength
}

function bpmFromAutocorrelation(
  signal: Float64Array,
  sampleRate: number,
  hopSize: number,
): number {
  const minLag = Math.floor((60 / MAX_BPM) * sampleRate / hopSize)
  const maxLag = Math.ceil((60 / MIN_BPM) * sampleRate / hopSize)

  let bestLag = minLag
  let bestVal = -Infinity

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    let count = 0
    for (let i = 0; i < signal.length - lag; i++) {
      sum += signal[i] * signal[i + lag]
      count++
    }
    const corr = count > 0 ? sum / count : 0
    if (corr > bestVal) {
      bestVal = corr
      bestLag = lag
    }
  }

  return Math.round((60 * sampleRate) / (bestLag * hopSize))
}

// --- Algorithm 1: Autocorrelation on onset strength ---

function detectByAutocorrelation(audioData: Float32Array, sampleRate: number): number {
  const hopSize = 512
  const frameSize = 1024
  const energy = computeEnergy(audioData, frameSize, hopSize)
  const onset = computeOnsetStrength(energy)
  return bpmFromAutocorrelation(onset, sampleRate, hopSize)
}

// --- Algorithm 2: Onset interval histogram ---

function detectByOnsetInterval(audioData: Float32Array, sampleRate: number): number {
  const hopSize = 512
  const frameSize = 1024
  const energy = computeEnergy(audioData, frameSize, hopSize)
  const onset = computeOnsetStrength(energy)

  // Find peaks in onset strength
  const threshold = median(onset) * 2
  const peakIndices: number[] = []
  for (let i = 1; i < onset.length - 1; i++) {
    if (onset[i] > onset[i - 1] && onset[i] > onset[i + 1] && onset[i] > threshold) {
      peakIndices.push(i)
    }
  }

  if (peakIndices.length < 2) {
    return detectByAutocorrelation(audioData, sampleRate)
  }

  // Compute inter-onset intervals and convert to BPM
  const bpmVotes = new Map<number, number>()
  for (let i = 1; i < peakIndices.length; i++) {
    const intervalFrames = peakIndices[i] - peakIndices[i - 1]
    const intervalSec = (intervalFrames * hopSize) / sampleRate
    const bpm = Math.round(60 / intervalSec)
    if (bpm >= MIN_BPM && bpm <= MAX_BPM) {
      bpmVotes.set(bpm, (bpmVotes.get(bpm) ?? 0) + 1)
    }
  }

  if (bpmVotes.size === 0) {
    return detectByAutocorrelation(audioData, sampleRate)
  }

  // Cluster nearby BPMs (within tolerance) and pick the largest cluster
  const sortedBpms = [...bpmVotes.entries()].sort((a, b) => a[0] - b[0])
  let bestClusterBpm = sortedBpms[0][0]
  let bestClusterVotes = 0
  let clusterStart = 0

  for (let i = 0; i < sortedBpms.length; i++) {
    while (sortedBpms[i][0] - sortedBpms[clusterStart][0] > BPM_TOLERANCE) {
      clusterStart++
    }
    let clusterVotes = 0
    let weightedSum = 0
    for (let j = clusterStart; j <= i; j++) {
      clusterVotes += sortedBpms[j][1]
      weightedSum += sortedBpms[j][0] * sortedBpms[j][1]
    }
    if (clusterVotes > bestClusterVotes) {
      bestClusterVotes = clusterVotes
      bestClusterBpm = Math.round(weightedSum / clusterVotes)
    }
  }

  return bestClusterBpm
}

// --- Algorithm 3: Spectral flux autocorrelation ---

function detectBySpectralFlux(audioData: Float32Array, sampleRate: number): number {
  const hopSize = 512
  const frameSize = 2048
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize)

  if (numFrames < 2) {
    return detectByAutocorrelation(audioData, sampleRate)
  }

  // Compute spectral magnitude per frame using band energies (4 bands)
  const numBands = 4
  const bandEnergies: Float64Array[] = []
  for (let i = 0; i < numFrames; i++) {
    const bands = new Float64Array(numBands)
    const start = i * hopSize
    const bandSize = Math.floor(frameSize / numBands)
    for (let b = 0; b < numBands; b++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        const idx = start + b * bandSize + j
        if (idx < audioData.length) {
          sum += audioData[idx] * audioData[idx]
        }
      }
      bands[b] = sum / bandSize
    }
    bandEnergies.push(bands)
  }

  // Spectral flux: sum of positive band energy differences
  const flux = new Float64Array(numFrames)
  for (let i = 1; i < numFrames; i++) {
    let sum = 0
    for (let b = 0; b < numBands; b++) {
      const diff = bandEnergies[i][b] - bandEnergies[i - 1][b]
      if (diff > 0) sum += diff
    }
    flux[i] = sum
  }

  return bpmFromAutocorrelation(flux, sampleRate, hopSize)
}

// --- Helpers ---

function median(arr: Float64Array): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function medianNumber(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

// --- Public API ---

const ALGORITHMS: Record<BpmAlgorithm, (data: Float32Array, sr: number) => number> = {
  'autocorrelation': detectByAutocorrelation,
  'onset-interval': detectByOnsetInterval,
  'spectral-flux': detectBySpectralFlux,
}

export function detectBpmWithAlgorithm(
  audioData: Float32Array,
  sampleRate: number,
  algorithm: BpmAlgorithm,
): BpmDetectionEntry {
  const bpm = ALGORITHMS[algorithm](audioData, sampleRate)
  return { algorithm, bpm }
}

export function analyzeBpm(audioData: Float32Array, sampleRate: number): BpmAnalysis {
  const algorithms: BpmAlgorithm[] = ['autocorrelation', 'onset-interval', 'spectral-flux']
  const details = algorithms.map(alg => detectBpmWithAlgorithm(audioData, sampleRate, alg))

  const bpmValues = details.map(d => d.bpm)
  const bpm = medianNumber(bpmValues)

  // Confidence: count how many are within ±tolerance of the median
  const agreeing = bpmValues.filter(v => Math.abs(v - bpm) <= BPM_TOLERANCE).length

  let confidence: Confidence
  if (agreeing === 3) {
    confidence = 'high'
  } else if (agreeing === 2) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return { bpm, confidence, details }
}
