import { KEY_NAMES, RELATIVE_KEY_MAP } from './types'
import type { KeyDetectionEntry, KeyAnalysis, Confidence } from './types'

type ProfileName = 'krumhansl' | 'temperley' | 'shaath'

type KeyProfile = {
  major: number[]
  minor: number[]
}

const PROFILES: Record<ProfileName, KeyProfile> = {
  krumhansl: {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  },
  temperley: {
    major: [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0],
    minor: [5.0, 2.0, 3.5, 4.5, 2.0, 3.5, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0],
  },
  shaath: {
    major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.7, 2.3, 3.4],
    minor: [6.5, 2.7, 3.5, 5.4, 2.6, 3.5, 2.5, 5.2, 4.0, 2.7, 4.3, 3.2],
  },
}

function correlate(chroma: number[], profile: number[]): number {
  const n = chroma.length
  const meanA = chroma.reduce((s, v) => s + v, 0) / n
  const meanB = profile.reduce((s, v) => s + v, 0) / n

  let num = 0
  let denA = 0
  let denB = 0
  for (let i = 0; i < n; i++) {
    const a = chroma[i] - meanA
    const b = profile[i] - meanB
    num += a * b
    denA += a * a
    denB += b * b
  }

  const den = Math.sqrt(denA * denB)
  return den === 0 ? 0 : num / den
}

function rotateArray(arr: number[], shift: number): number[] {
  const n = arr.length
  const s = ((shift % n) + n) % n
  return [...arr.slice(s), ...arr.slice(0, s)]
}

export function detectKeyWithProfile(chroma: number[], algorithm: ProfileName): KeyDetectionEntry {
  const profile = PROFILES[algorithm]
  let bestKey = ''
  let bestCorr = -Infinity

  for (let i = 0; i < 12; i++) {
    const rotated = rotateArray(chroma, i)
    const majorCorr = correlate(rotated, profile.major)
    const minorCorr = correlate(rotated, profile.minor)

    if (majorCorr > bestCorr) {
      bestCorr = majorCorr
      bestKey = `${KEY_NAMES[i]} major`
    }
    if (minorCorr > bestCorr) {
      bestCorr = minorCorr
      bestKey = `${KEY_NAMES[i]} minor`
    }
  }

  return {
    algorithm,
    key: bestKey,
    altKey: getAltKey(bestKey),
    correlation: bestCorr,
  }
}

export function analyzeKey(chroma: number[]): KeyAnalysis {
  const algorithms: ProfileName[] = ['krumhansl', 'temperley', 'shaath']
  const details = algorithms.map(alg => detectKeyWithProfile(chroma, alg))

  // Count votes for each key
  const votes = new Map<string, number>()
  for (const d of details) {
    votes.set(d.key, (votes.get(d.key) ?? 0) + 1)
  }

  // Find majority key
  let majorityKey = details[0].key
  let maxVotes = 0
  for (const [key, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count
      majorityKey = key
    }
  }

  // Confidence based on agreement
  let confidence: Confidence
  if (maxVotes === 3) {
    confidence = 'high'
  } else if (maxVotes === 2) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    key: majorityKey,
    altKey: getAltKey(majorityKey),
    confidence,
    details,
  }
}

export function getAltKey(key: string): string {
  return RELATIVE_KEY_MAP[key] ?? ''
}
