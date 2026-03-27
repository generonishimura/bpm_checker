<script setup lang="ts">
import { ref } from 'vue'
import type { AnalysisResult, Confidence } from './domain/types'
import { analyzeAudio } from './domain/audio-analyzer'

const result = ref<AnalysisResult | null>(null)
const isAnalyzing = ref(false)
const error = ref<string | null>(null)
const isDragOver = ref(false)
const fileName = ref<string | null>(null)

function confidenceLabel(confidence: Confidence): string {
  const map: Record<Confidence, string> = { high: 'High', medium: 'Medium', low: 'Low' }
  return map[confidence]
}

function confidenceColor(confidence: Confidence): string {
  const map: Record<Confidence, string> = {
    high: 'text-emerald-400',
    medium: 'text-yellow-400',
    low: 'text-red-400',
  }
  return map[confidence]
}

const bpmAlgorithmName: Record<string, string> = {
  'autocorrelation': 'Autocorrelation',
  'onset-interval': 'Onset Interval',
  'spectral-flux': 'Spectral Flux',
}

const keyAlgorithmName: Record<string, string> = {
  krumhansl: 'Krumhansl-Kessler',
  temperley: 'Temperley',
  shaath: "Sha'ath",
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

async function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg') {
    error.value = 'MP3ファイルを選択してください'
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    error.value = 'ファイルサイズが大きすぎます（100MB以下にしてください）'
    return
  }

  if (isAnalyzing.value) return

  error.value = null
  result.value = null
  fileName.value = file.name
  isAnalyzing.value = true

  try {
    result.value = await analyzeAudio(file)
  } catch (e) {
    error.value = '解析中にエラーが発生しました。別のファイルをお試しください。'
    console.error(e)
  } finally {
    isAnalyzing.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}

function onDrop(event: DragEvent) {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
    <div class="max-w-2xl mx-auto px-4 py-16">
      <h1 class="text-4xl font-bold text-center mb-2">BPM Checker</h1>
      <p class="text-gray-400 text-center mb-12">MP3ファイルをアップロードして、BPM・Key・Alt Keyを解析</p>

      <!-- Upload Area -->
      <div
        class="border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer"
        :class="isDragOver ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600 hover:border-gray-400'"
        @drop.prevent="onDrop"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @click="($refs.fileInput as HTMLInputElement).click()"
      >
        <div class="text-5xl mb-4">🎵</div>
        <p class="text-lg text-gray-300 mb-2">MP3ファイルをドラッグ＆ドロップ</p>
        <p class="text-sm text-gray-500">またはクリックして選択</p>
        <input
          ref="fileInput"
          type="file"
          accept=".mp3,audio/mpeg"
          class="hidden"
          @change="onFileChange"
        />
      </div>

      <!-- Loading -->
      <div v-if="isAnalyzing" class="mt-8 text-center">
        <div class="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-3 text-gray-400">{{ fileName }} を解析中...</p>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-8 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-center">
        {{ error }}
      </div>

      <!-- Result -->
      <div v-if="result" class="mt-8 space-y-6">
        <!-- Main results -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-gray-800/80 rounded-2xl p-6 text-center backdrop-blur">
            <p class="text-sm text-gray-400 mb-1">BPM</p>
            <p class="text-4xl font-bold text-blue-400">{{ result.bpmAnalysis.bpm }}</p>
          </div>
          <div class="bg-gray-800/80 rounded-2xl p-6 text-center backdrop-blur">
            <p class="text-sm text-gray-400 mb-1">Key</p>
            <p class="text-3xl font-bold text-emerald-400">{{ result.keyAnalysis.key }}</p>
          </div>
          <div class="bg-gray-800/80 rounded-2xl p-6 text-center backdrop-blur">
            <p class="text-sm text-gray-400 mb-1">Alt Key</p>
            <p class="text-3xl font-bold text-purple-400">{{ result.keyAnalysis.altKey }}</p>
          </div>
        </div>

        <!-- Confidence badges -->
        <div class="flex justify-center gap-8 text-sm">
          <div>
            <span class="text-gray-400">BPM信頼度: </span>
            <span class="font-semibold" :class="confidenceColor(result.bpmAnalysis.confidence)">
              {{ confidenceLabel(result.bpmAnalysis.confidence) }}
            </span>
          </div>
          <div>
            <span class="text-gray-400">Key信頼度: </span>
            <span class="font-semibold" :class="confidenceColor(result.keyAnalysis.confidence)">
              {{ confidenceLabel(result.keyAnalysis.confidence) }}
            </span>
          </div>
        </div>

        <!-- Algorithm details -->
        <div class="grid grid-cols-2 gap-4">
          <!-- BPM details -->
          <div class="bg-gray-800/50 rounded-xl p-4">
            <p class="text-xs text-gray-500 mb-3 uppercase tracking-wider">BPM 各アルゴリズム</p>
            <div class="space-y-2">
              <div
                v-for="detail in result.bpmAnalysis.details"
                :key="detail.algorithm"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-400">{{ bpmAlgorithmName[detail.algorithm] ?? detail.algorithm }}</span>
                <span
                  class="font-mono"
                  :class="Math.abs(detail.bpm - result.bpmAnalysis.bpm) <= 5 ? 'text-blue-400' : 'text-gray-500'"
                >
                  {{ detail.bpm }}
                </span>
              </div>
            </div>
          </div>

          <!-- Key details -->
          <div class="bg-gray-800/50 rounded-xl p-4">
            <p class="text-xs text-gray-500 mb-3 uppercase tracking-wider">Key 各アルゴリズム</p>
            <div class="space-y-2">
              <div
                v-for="detail in result.keyAnalysis.details"
                :key="detail.algorithm"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-400">{{ keyAlgorithmName[detail.algorithm] ?? detail.algorithm }}</span>
                <div class="flex items-center gap-2">
                  <span
                    class="font-mono"
                    :class="detail.key === result.keyAnalysis.key ? 'text-emerald-400' : 'text-gray-500'"
                  >
                    {{ detail.key }}
                  </span>
                  <span class="text-gray-600 text-xs">r={{ detail.correlation.toFixed(3) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- File name -->
        <p v-if="fileName" class="text-center text-sm text-gray-500">
          {{ fileName }}
        </p>
      </div>
    </div>
  </div>
</template>
