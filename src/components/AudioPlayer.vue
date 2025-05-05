/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file AudioPlayer.vue
 * @brief 音声ファイルの再生と波形表示を行うVueコンポーネント
 * @details
 * - 2つの音声ファイルを同時に再生
 * - wavesurfer.jsで波形を表示
 * - 再生ボタン付き（両方のサンプルを同時に制御、常に最初から再生）
 * - エラー処理とエラーメッセージ表示機能
 * - ローディング状態の表示機能
 * - 各サンプルのノブによる音量調整機能（ダブルクリックで初期値にリセット）
 * - スペースキーでの再生制御機能
 * - マスターボリューム制御機能
 * - マスターボリュームの音量メーター表示機能（危険域の表示付き）
 * - サンプル2のタイミング調整機能（-0.5秒から+0.5秒）
 * @limitations
 * - ファイル名は固定（sample1.wav, sample2.wav）
 */

<template>
  <div>
    <h2>サンプル音声プレイヤー</h2>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="isLoading" class="loading-message">
      読み込み中...
    </div>

    <!-- サンプル1 -->
    <div class="sample-container">
      <h3>サンプル1</h3>
      <div ref="waveform1"></div>
      <div class="knob-container">
        <div 
          class="knob" 
          @dblclick="resetVolume(1)"
          @mousedown="startDragging(1, $event)"
          @mousemove="handleDrag(1, $event)"
          @mouseup="handleDocumentMouseUp"
        >
          <div class="knob-dial" :style="{ transform: `rotate(${volumes[1] * 270 - 135}deg)` }"></div>
        </div>
        <div class="knob-label">Gain</div>
      </div>
    </div>

    <!-- サンプル2 -->
    <div class="sample-container">
      <h3>サンプル2</h3>
      <div ref="waveform2"></div>
      <div class="knob-row">
        <div class="knob-container">
          <div 
            class="knob" 
            @dblclick="resetVolume(2)"
            @mousedown="startDragging(2, $event)"
            @mousemove="handleDrag(2, $event)"
            @mouseup="handleDocumentMouseUp"
          >
            <div class="knob-dial" :style="{ transform: `rotate(${volumes[2] * 270 - 135}deg)` }"></div>
          </div>
          <div class="knob-label">Gain</div>
        </div>
        <div class="knob-container">
          <div 
            class="knob" 
            @dblclick="resetTiming(2)"
            @mousedown="startDragging('timing2', $event)"
            @mousemove="handleDrag('timing2', $event)"
            @mouseup="handleDocumentMouseUp"
          >
            <div class="knob-dial" :style="{ transform: `rotate(${timing[2] * 270 - 135}deg)` }"></div>
          </div>
          <div class="knob-label">Timing</div>
        </div>
      </div>
    </div>

    <!-- サンプル3 -->
    <div class="sample-container">
      <h3>サンプル3</h3>
      <div ref="waveform3"></div>
      <div class="knob-row">
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" v-model="isSample3Enabled">
            <span class="toggle-slider"></span>
          </label>
          <div class="toggle-label">Enable</div>
        </div>
        <div class="knob-container">
          <div 
            class="knob" 
            @dblclick="resetVolume(3)"
            @mousedown="startDragging(3, $event)"
            @mousemove="handleDrag(3, $event)"
            @mouseup="handleDocumentMouseUp"
            :class="{ 'disabled': !isSample3Enabled }"
          >
            <div class="knob-dial" :style="{ transform: `rotate(${volumes[3] * 270 - 135}deg)` }"></div>
          </div>
          <div class="knob-label">Gain</div>
        </div>
        <div class="knob-container">
          <div 
            class="knob" 
            @dblclick="resetTiming(3)"
            @mousedown="startDragging('timing3', $event)"
            @mousemove="handleDrag('timing3', $event)"
            @mouseup="handleDocumentMouseUp"
            :class="{ 'disabled': !isSample3Enabled }"
          >
            <div class="knob-dial" :style="{ transform: `rotate(${timing[3] * 270 - 135}deg)` }"></div>
          </div>
          <div class="knob-label">Timing</div>
        </div>
      </div>
    </div>

    <!-- 再生ボタン -->
    <div class="control-container">
      <button @click="playFromStart" :disabled="!!error || isLoading">
        再生
      </button>
    </div>

    <!-- マスターボリューム -->
    <div class="master-volume-container">
      <div class="master-controls">
        <div class="knob-container">
          <div 
            class="knob" 
            @dblclick="resetMasterVolume"
            @mousedown="startDragging('master', $event)"
            @mousemove="handleDrag('master', $event)"
            @mouseup="handleDocumentMouseUp"
          >
            <div class="knob-dial" :style="{ transform: `rotate(${masterVolume * 270 - 135}deg)` }"></div>
          </div>
          <div class="knob-label">Master</div>
        </div>
        <div class="meter-container">
          <div class="meter">
            <div 
              class="meter-level" 
              :style="{ width: `${Math.max(0, Math.min(100, (meterLevel + 60) * (100/60)))}%` }"
              :class="{ 
                'meter-level--warning': meterLevel > -12,
                'meter-level--danger': meterLevel > -6
              }"
            ></div>
            <div class="meter-danger-line"></div>
          </div>
          <div class="meter-label">Level</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import type { WaveSurferInstance, KnobType, WaveSurferOptions } from '../types/audio'

export default defineComponent({
  name: 'AudioPlayer',
  setup() {
    // 状態の定義
    const wavesurfers = ref<{ [key: number]: WaveSurferInstance | null }>({
      1: null,
      2: null,
      3: null
    })
    const isPlaying = ref(false)
    const errorMessage = ref<string | null>(null)
    const isLoading = ref(false)
    const volumes = ref<{ [key: number]: number }>({
      1: 0.5,
      2: 0.5,
      3: 0.5
    })
    const masterVolume = ref(0.8)
    const isDragging = ref(false)
    const currentKnob = ref<KnobType | null>(null)
    const startY = ref(0)
    const startVolume = ref(0)
    const meterLevel = ref(-60)
    const meterInterval = ref<number | null>(null)
    const volumeUpdateTimeout = ref<number | null>(null)
    const timing = ref<{ [key: number]: number }>({
      2: 0,
      3: 0
    })
    const isSample3Enabled = ref(false)

    // DOM要素の参照
    const waveform1 = ref<HTMLDivElement | null>(null)
    const waveform2 = ref<HTMLDivElement | null>(null)
    const waveform3 = ref<HTMLDivElement | null>(null)

    // メソッドの定義
    const initializeWavesurfers = (): void => {
      [1, 2, 3].forEach(sampleNumber => {
        const container = sampleNumber === 1 ? waveform1.value :
                         sampleNumber === 2 ? waveform2.value :
                         waveform3.value

        if (!container) {
          handleError(`サンプル${sampleNumber}のコンテナが見つかりません`, new Error('Container not found'))
          return
        }

        const wavesurfer = WaveSurfer.create({
          container,
          waveColor: '#a3cef1',
          progressColor: '#4361ee',
          height: 80,
          minPxPerSec: 100,
          partialRender: true,
          normalize: true,
          responsive: true,
          cursorColor: '#4361ee',
          cursorWidth: 1,
          barWidth: 2,
          barGap: 1,
          barRadius: 0,
          interact: true,
          hideScrollbar: true,
          autoCenter: true
        } as WaveSurferOptions) as WaveSurferInstance

        // イベントリスナーの設定
        wavesurfer.on('error', (error?: Error) => {
          handleError(`サンプル${sampleNumber}の読み込みに失敗しました`, error || new Error('Unknown error'))
        })

        wavesurfer.on('loading', () => {
          errorMessage.value = null
          isLoading.value = true
        })

        wavesurfer.on('ready', () => {
          errorMessage.value = null
          isLoading.value = false
          wavesurfer.setVolume(volumes.value[sampleNumber])
        })

        wavesurfer.on('play', () => {
          isPlaying.value = true
        })

        wavesurfer.on('pause', () => {
          isPlaying.value = false
        })

        wavesurfer.on('finish', () => {
          isPlaying.value = false
        })

        wavesurfers.value[sampleNumber] = wavesurfer
      })
    }

    const loadAudioFiles = async (): Promise<void> => {
      try {
        isLoading.value = true

        for (let sampleNumber of [1, 2, 3]) {
          const response = await fetch(`/sample${sampleNumber}.wav`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const blob = await response.blob()
          wavesurfers.value[sampleNumber]?.loadBlob(blob)
        }
      } catch (error) {
        handleError('音声ファイルの読み込みに失敗しました', error as Error)
      }
    }

    const handleError = (message: string, err: Error): void => {
      console.error('Audio Player Error:', message, err)
      errorMessage.value = `${message}: ${err.message}`
      isLoading.value = false
    }

    const resetPlayback = (): void => {
      [1, 2, 3].forEach(sampleNumber => {
        const wavesurfer = wavesurfers.value[sampleNumber]
        if (wavesurfer) {
          wavesurfer.stop()
          wavesurfer.seekTo(0)
        }
      })
    }

    const playFromStart = (): void => {
      try {
        if (wavesurfers.value[1] && wavesurfers.value[2] && wavesurfers.value[3]) {
          resetPlayback()
          
          wavesurfers.value[1].play()
          
          if (timing.value[2] > 0) {
            setTimeout(() => {
              wavesurfers.value[2]?.play()
            }, timing.value[2] * 1000)
          } else {
            wavesurfers.value[2]?.play()
          }
          
          if (isSample3Enabled.value) {
            if (timing.value[3] > 0) {
              setTimeout(() => {
                wavesurfers.value[3]?.play()
              }, timing.value[3] * 1000)
            } else {
              wavesurfers.value[3]?.play()
            }
          }
        }
      } catch (error) {
        handleError('再生に失敗しました', error as Error)
      }
    }

    const handleDrag = (knob: KnobType, event: MouseEvent): void => {
      if (!isDragging.value || currentKnob.value !== knob) return

      const deltaY = startY.value - event.clientY
      const sensitivity = 0.005
      let newValue = startVolume.value + (deltaY * sensitivity)

      // タイミング調整の場合は異なる範囲を使用
      if (knob === 'timing2' || knob === 'timing3') {
        newValue = Math.max(-0.5, Math.min(0.5, newValue))
        const sampleNumber = parseInt(knob.replace('timing', ''))
        timing.value[sampleNumber] = newValue
        return
      }

      // ボリューム調整の場合
      newValue = Math.max(0, Math.min(1, newValue))
      if (knob === 'master') {
        masterVolume.value = newValue
        // マスターボリュームが変更されたら、全てのサンプルの音量を更新
        Object.keys(wavesurfers.value).forEach(key => {
          const sampleNumber = parseInt(key)
          updateVolume(sampleNumber)
        })
      } else {
        volumes.value[knob as number] = newValue
        updateVolume(knob as number)
      }
    }

    const startDragging = (knob: KnobType, event: MouseEvent): void => {
      event.preventDefault()
      isDragging.value = true
      currentKnob.value = knob
      startY.value = event.clientY
      startVolume.value = knob === 'master' 
        ? masterVolume.value 
        : knob === 'timing2' || knob === 'timing3'
          ? timing.value[parseInt(knob.replace('timing', ''))]
          : volumes.value[knob as number]

      document.addEventListener('mousemove', handleDocumentMouseMove)
      document.addEventListener('mouseup', handleDocumentMouseUp)
    }

    const handleDocumentMouseMove = (event: MouseEvent): void => {
      if (isDragging.value && currentKnob.value) {
        event.preventDefault()
        document.body.style.cursor = 'pointer'
        handleDrag(currentKnob.value, event)
      }
    }

    const handleDocumentMouseUp = (event: MouseEvent): void => {
      event.preventDefault()
      isDragging.value = false
      currentKnob.value = null
      document.body.style.cursor = 'default'
      document.removeEventListener('mousemove', handleDocumentMouseMove)
      document.removeEventListener('mouseup', handleDocumentMouseUp)
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'Space') {
        event.preventDefault()
        playFromStart()
      }
    }

    const resetMasterVolume = (): void => {
      try {
        masterVolume.value = 0.8
        updateVolume(1)
        updateVolume(2)
        updateVolume(3)
      } catch (error) {
        handleError('マスターボリュームのリセットに失敗しました', error as Error)
      }
    }

    const startMeterUpdate = (): void => {
      meterInterval.value = window.setInterval(() => {
        if (isPlaying.value) {
          const level1 = wavesurfers.value[1]?.getVolume() || 0
          const level2 = wavesurfers.value[2]?.getVolume() || 0
          const level3 = wavesurfers.value[3]?.getVolume() || 0
          meterLevel.value = 20 * Math.log10((level1 + level2 + level3) / 3)
        } else {
          meterLevel.value = -60
        }
      }, 1000 / 60)
    }

    const stopMeterUpdate = (): void => {
      if (meterInterval.value) {
        clearInterval(meterInterval.value)
        meterInterval.value = null
      }
    }

    const updateTiming = (sampleNumber: number): void => {
      try {
        const wavesurfer = wavesurfers.value[sampleNumber]
        if (wavesurfer) {
          const currentTime = wavesurfer.getCurrentTime()
          wavesurfer.seekTo(Math.max(0, currentTime + timing.value[sampleNumber]))
        }
      } catch (error) {
        handleError('タイミングの調整に失敗しました', error as Error)
      }
    }

    const resetTiming = (sampleNumber: number): void => {
      try {
        timing.value[sampleNumber] = 0
        if (isPlaying.value) {
          updateTiming(sampleNumber)
        }
      } catch (error) {
        handleError('タイミングのリセットに失敗しました', error as Error)
      }
    }

    // 個別のボリューム更新
    const updateVolume = (sampleNumber: number): void => {
      const wavesurfer = wavesurfers.value[sampleNumber]
      if (!wavesurfer) return

      const volume = volumes.value[sampleNumber] * masterVolume.value
      wavesurfer.setVolume(volume)

      // サンプル3が無効な場合は音量を0に
      if (sampleNumber === 3 && !isSample3Enabled.value) {
        wavesurfer.setVolume(0)
      }
    }

    const resetVolume = (sampleNumber: number): void => {
      try {
        volumes.value[sampleNumber] = 0.5
        updateVolume(sampleNumber)
      } catch (error) {
        handleError('音量のリセットに失敗しました', error as Error)
      }
    }

    // ライフサイクルフック
    onMounted(() => {
      try {
        initializeWavesurfers()
        loadAudioFiles()
        document.addEventListener('keydown', handleKeyDown)
        startMeterUpdate()
      } catch (error) {
        handleError('プレイヤーの初期化に失敗しました', error as Error)
      }
    })

    onBeforeUnmount(() => {
      Object.values(wavesurfers.value).forEach(wavesurfer => {
        if (wavesurfer) {
          wavesurfer.destroy()
        }
      })

      document.removeEventListener('keydown', handleKeyDown)

      stopMeterUpdate()
    })

    // ノブの回転角度を計算するcomputedプロパティ
    const knobRotations = {
      master: computed(() => masterVolume.value * 270 - 135),
      sample1: computed(() => volumes.value[1] * 270 - 135),
      sample2: computed(() => volumes.value[2] * 270 - 135),
      sample3: computed(() => volumes.value[3] * 270 - 135),
      timing2: computed(() => timing.value[2] * 270 - 135),
      timing3: computed(() => timing.value[3] * 270 - 135)
    }

    return {
      wavesurfers,
      isPlaying,
      error: errorMessage,
      isLoading,
      volumes,
      masterVolume,
      isDragging,
      currentKnob,
      startY,
      startVolume,
      meterLevel,
      meterInterval,
      volumeUpdateTimeout,
      timing,
      isSample3Enabled,
      waveform1,
      waveform2,
      waveform3,
      playFromStart,
      resetVolume,
      resetMasterVolume,
      resetTiming,
      startDragging,
      handleDrag,
      handleDocumentMouseUp,
      knobRotations
    }
  }
})
</script>

<style scoped>
/* 波形表示のスタイル */
div[ref="waveform1"],
div[ref="waveform2"],
div[ref="waveform3"] {
  margin-bottom: 1em;
}

/* 波形のコンテナ内のキャンバス要素のスタイル */
div[ref="waveform1"] canvas,
div[ref="waveform2"] canvas,
div[ref="waveform3"] canvas {
  width: 100% !important;
  height: auto !important;
}

button {
  padding: 0.5em 1em;
  font-size: 1em;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.sample-container {
  margin-bottom: 2em;
  padding: 1em;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.sample-container h3 {
  margin-top: 0;
  margin-bottom: 1em;
}

.control-container {
  margin-top: 1em;
  text-align: center;
}

.knob-row {
  display: flex;
  justify-content: center;
  gap: 2em;
  margin-top: 1em;
}

.knob-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
}

.knob {
  position: relative;
  width: 50px;
  height: 50px;
  background: #2b2b2b;
  border-radius: 50%;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.1s ease;
  user-select: none; /* ドラッグ時のテキスト選択を防止 */
}

.knob:active {
  transform: scale(0.95);
}

.knob-dial {
  position: absolute;
  width: 4px;
  height: 20px;
  background: #4361ee;
  top: 5px;
  left: 50%;
  transform-origin: bottom center;
  transform: translateX(-50%) rotate(-135deg);
  border-radius: 2px;
}

.knob-input {
  position: absolute;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
  transform: rotate(-135deg);
}

.knob-label {
  font-size: 0.8em;
  color: #666;
  margin-top: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.master-volume-container {
  margin-top: 2em;
  padding: 1em;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.master-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2em;
}

.meter-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
}

.meter {
  width: 200px;
  height: 8px;
  background: #2b2b2b;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
  position: relative;
}

.meter-level {
  height: 100%;
  background: #4CAF50; /* 緑 */
  transition: width 0.05s ease-out;
}

.meter-level--warning {
  background: #FFC107; /* 黄 */
}

.meter-level--danger {
  background: #F44336; /* 赤 */
}

.meter-danger-line {
  position: absolute;
  top: 0;
  left: 90%; /* -6dBの位置（-60dBから0dBの範囲で90%の位置） */
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

.meter-label {
  font-size: 0.8em;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.toggle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 1em;
}

.toggle-label {
  font-size: 0.8em;
  color: #666;
  margin-top: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #4361ee;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>

