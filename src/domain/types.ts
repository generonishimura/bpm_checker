export type MusicalKey = {
  key: string
  altKey: string
}

export type KeyDetectionEntry = {
  algorithm: string
  key: string
  altKey: string
  correlation: number
}

export type Confidence = 'high' | 'medium' | 'low'

export type KeyAnalysis = {
  key: string
  altKey: string
  confidence: Confidence
  details: KeyDetectionEntry[]
}

export type BpmDetectionEntry = {
  algorithm: string
  bpm: number
}

export type BpmAnalysis = {
  bpm: number
  confidence: Confidence
  details: BpmDetectionEntry[]
}

export type AnalysisResult = {
  bpmAnalysis: BpmAnalysis
  keyAnalysis: KeyAnalysis
}

export const KEY_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const

export const RELATIVE_KEY_MAP: Record<string, string> = {
  'C major': 'A minor',
  'C# major': 'A# minor',
  'D major': 'B minor',
  'D# major': 'C minor',
  'E major': 'C# minor',
  'F major': 'D minor',
  'F# major': 'D# minor',
  'G major': 'E minor',
  'G# major': 'F minor',
  'A major': 'F# minor',
  'A# major': 'G minor',
  'B major': 'G# minor',
  'C minor': 'D# major',
  'C# minor': 'E major',
  'D minor': 'F major',
  'D# minor': 'F# major',
  'E minor': 'G major',
  'F minor': 'G# major',
  'F# minor': 'A major',
  'G minor': 'A# major',
  'G# minor': 'B major',
  'A minor': 'C major',
  'A# minor': 'C# major',
  'B minor': 'D major',
}
