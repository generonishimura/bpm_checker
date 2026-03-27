export function mapFftToChroma(
  frequencyData: Float32Array,
  sampleRate: number,
  fftSize: number,
): number[] {
  const chroma = new Array(12).fill(0)
  const binCount = frequencyData.length

  for (let k = 1; k < binCount; k++) {
    const freq = (k * sampleRate) / fftSize
    if (freq < 60 || freq > 4200) continue

    // Convert dB to linear power
    const dbValue = frequencyData[k]
    const power = Math.pow(10, dbValue / 10)

    // Map to pitch class
    const midiNote = 12 * Math.log2(freq / 440) + 69
    const pitchClass = Math.round(midiNote) % 12
    const idx = ((pitchClass % 12) + 12) % 12
    chroma[idx] += power
  }

  // Normalize
  const maxVal = Math.max(...chroma)
  if (maxVal > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] /= maxVal
    }
  }

  return chroma
}
