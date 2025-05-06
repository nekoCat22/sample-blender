/**
 * @file WaveformDisplay.vue
 * @brief 音声ファイルの波形表示を行うVueコンポーネント
 * @details
 * - wavesurfer.jsを使用して波形を表示
 * - 波形のスタイリングとインタラクション制御
 * - エラー処理とローディング状態の表示
 * @limitations
 * - 波形の表示のみを担当し、再生制御は行わない
 */

<template>
  <div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="isLoading" class="loading-message">
      読み込み中...
    </div>
    <div ref="waveform" class="waveform-container"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import type { WaveSurferInstance, WaveSurferOptions } from '../types/audio'

export default defineComponent({
  name: 'WaveformDisplay',
  props: {
    audioBlob: {
      type: Blob,
      required: true
    }
  },
  emits: ['error', 'loading', 'ready'],
  setup(props, { emit }) {
    const waveform = ref<HTMLDivElement | null>(null)
    const wavesurfer = ref<WaveSurferInstance | null>(null)
    const error = ref<string | null>(null)
    const isLoading = ref(false)

    const initializeWavesurfer = (): void => {
      if (!waveform.value) {
        handleError('波形表示用のコンテナが見つかりません', new Error('Container not found'))
        return
      }

      wavesurfer.value = WaveSurfer.create({
        container: waveform.value,
        waveColor: '#4361ee',
        height: 80,
        minPxPerSec: 100,
        partialRender: true,
        normalize: true,
        responsive: true,
        cursorColor: 'transparent',
        cursorWidth: 0,
        barWidth: 2,
        barGap: 1,
        barRadius: 0,
        interact: false,
        hideScrollbar: true,
        autoCenter: true,
        progressColor: 'transparent'
      } as WaveSurferOptions) as WaveSurferInstance

      // イベントリスナーの設定
      wavesurfer.value.on('error', (err?: Error) => {
        handleError('波形の読み込みに失敗しました', err || new Error('Unknown error'))
      })

      wavesurfer.value.on('loading', () => {
        error.value = null
        isLoading.value = true
        emit('loading')
      })

      wavesurfer.value.on('ready', () => {
        error.value = null
        isLoading.value = false
        emit('ready')
      })
    }

    const handleError = (message: string, err: Error): void => {
      console.error('Waveform Display Error:', message, err)
      error.value = `${message}: ${err.message}`
      emit('error', error.value)
    }

    onMounted(() => {
      try {
        initializeWavesurfer()
        if (wavesurfer.value) {
          wavesurfer.value.loadBlob(props.audioBlob)
        }
      } catch (err) {
        handleError('波形表示の初期化に失敗しました', err as Error)
      }
    })

    onBeforeUnmount(() => {
      if (wavesurfer.value) {
        wavesurfer.value.destroy()
      }
    })

    return {
      waveform,
      error,
      isLoading
    }
  }
})
</script>

<style scoped>
.waveform-container {
  margin-bottom: 1em;
  background: #f0f4f8;
  border-radius: 4px;
  padding: 8px;
}

.waveform-container canvas {
  width: 100% !important;
  height: auto !important;
  border-radius: 2px;
}

.waveform-container:hover {
  background: #e2e8f0;
  transition: background-color 0.2s ease;
}

.error-message {
  color: rgb(255, 29, 52);
  background-color: #f8d7da;
  padding: 0.5em;
  margin-bottom: 1em;
  border-radius: 4px;
}

.loading-message {
  color: #4361ee;
  background-color: #e9ecef;
  padding: 0.5em;
  margin-bottom: 1em;
  border-radius: 4px;
}
</style> 