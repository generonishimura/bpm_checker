import type { AnalysisResult } from './types'
import { analyzeBpm } from './bpm-detector'
import { analyzeKey } from './key-detector'
import { mapFftToChroma } from './chroma'

let activeContext: AudioContext | null = null

export async function analyzeAudio(file: File): Promise<AnalysisResult> {
  // Close previous context to prevent resource exhaustion
  if (activeContext) {
    await activeContext.close().catch(() => {})
    activeContext = null
  }

  const arrayBuffer = await file.arrayBuffer()
  const audioContext = new AudioContext()
  activeContext = audioContext
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const audioData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  const bpmAnalysis = analyzeBpm(audioData, sampleRate)

  const chroma = await computeChromaWithWebAudio(audioBuffer)
  const keyAnalysis = analyzeKey(chroma)

  await audioContext.close()
  activeContext = null

  return { bpmAnalysis, keyAnalysis }
}

async function computeChromaWithWebAudio(audioBuffer: AudioBuffer): Promise<number[]> {
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration
  const fftSize = 4096

  // Process in chunks using OfflineAudioContext
  const aggregatedChroma = new Array(12).fill(0)
  const numSamples = 30
  const interval = duration / numSamples

  for (let i = 0; i < numSamples; i++) {
    const startTime = i * interval
    const chunkDuration = Math.min(fftSize / sampleRate, duration - startTime)
    if (chunkDuration <= 0) break

    const offlineCtx = new OfflineAudioContext(1, Math.ceil(chunkDuration * sampleRate), sampleRate)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer

    const analyser = offlineCtx.createAnalyser()
    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = 0

    source.connect(analyser)
    analyser.connect(offlineCtx.destination)
    source.start(0, startTime, chunkDuration)

    await offlineCtx.startRendering()

    const frequencyData = new Float32Array(analyser.frequencyBinCount)
    analyser.getFloatFrequencyData(frequencyData)

    const chroma = mapFftToChroma(frequencyData, sampleRate, fftSize)
    for (let j = 0; j < 12; j++) {
      aggregatedChroma[j] += chroma[j]
    }
  }

  // Normalize
  const maxVal = Math.max(...aggregatedChroma)
  if (maxVal > 0) {
    for (let j = 0; j < 12; j++) {
      aggregatedChroma[j] /= maxVal
    }
  }

  return aggregatedChroma
}
