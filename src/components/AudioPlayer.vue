/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file AudioPlayer.vue
 * @brief 音声ファイルの再生と波形表示を行うVueコンポーネント
 * @details
 * - 2つの音声ファイルを同時に再生
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
      <WaveformDisplay
        v-if="audioBlobs[1]"
        :audio-blob="audioBlobs[1]"
        @error="handleWaveformError"
        @loading="handleWaveformLoading"
        @ready="handleWaveformReady"
      />
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
      <WaveformDisplay
        v-if="audioBlobs[2]"
        :audio-blob="audioBlobs[2]"
        @error="handleWaveformError"
        @loading="handleWaveformLoading"
        @ready="handleWaveformReady"
      />
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
            <div class="knob-dial" :style="{ transform: `rotate(${timing[2] * 540 - 135}deg)` }"></div>
          </div>
          <div class="knob-label">Timing</div>
        </div>
      </div>
    </div>

    <!-- サンプル3 -->
    <div class="sample-container">
      <h3>サンプル3</h3>
      <WaveformDisplay
        v-if="audioBlobs[3]"
        :audio-blob="audioBlobs[3]"
        @error="handleWaveformError"
        @loading="handleWaveformLoading"
        @ready="handleWaveformReady"
      />
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
            <div class="knob-dial" :style="{ transform: `rotate(${timing[3] * 540 - 135}deg)` }"></div>
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
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import type { KnobType } from '../types/audio'
import { AudioEngine } from '../core/AudioEngine'
import WaveformDisplay from './WaveformDisplay.vue'

export default defineComponent({
  name: 'AudioPlayer',
  components: {
    WaveformDisplay
  },
  setup() {
    // AudioEngineのインスタンスを作成
    const audioEngine = new AudioEngine()

    // 状態の定義
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
    const audioBlobs = ref<{ [key: number]: Blob | null }>({
      1: null,
      2: null,
      3: null
    })

    // メソッドの定義
    const loadAudioFiles = async (): Promise<void> => {
      try {
        isLoading.value = true

        for (let sampleNumber of [1, 2, 3]) {
          const response = await fetch(`/sample${sampleNumber}.wav`)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const blob = await response.blob()
          audioBlobs.value[sampleNumber] = blob
          
          // AudioEngineで音声データを読み込み
          const arrayBuffer = await blob.arrayBuffer()
          await audioEngine.loadSample(sampleNumber.toString(), arrayBuffer)
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

    const handleWaveformError = (error: string): void => {
      handleError('波形表示でエラーが発生しました', new Error(error))
    }

    const handleWaveformLoading = (): void => {
      isLoading.value = true
    }

    const handleWaveformReady = (): void => {
      isLoading.value = false
    }

    const resetPlayback = (): void => {
      audioEngine.stopAll()
      isPlaying.value = false
    }

    const playFromStart = (): void => {
      try {
        resetPlayback()
        isPlaying.value = true
        
        // AudioEngineを使って再生
        audioEngine.playSample('1')
        
        if (timing.value[2] > 0) {
          setTimeout(() => {
            audioEngine.playSample('2')
          }, timing.value[2] * 1000)
        } else {
          audioEngine.playSample('2')
        }
        
        if (isSample3Enabled.value) {
          if (timing.value[3] > 0) {
            setTimeout(() => {
              audioEngine.playSample('3')
            }, timing.value[3] * 1000)
          } else {
            audioEngine.playSample('3')
          }
        }

        // 再生が終了したら状態をリセット
        const maxDuration = audioEngine.getMaxDuration()
        setTimeout(() => {
          isPlaying.value = false
        }, maxDuration * 1000)
      } catch (error) {
        handleError('再生に失敗しました', error as Error)
        isPlaying.value = false
      }
    }

    const handleDrag = (knob: KnobType, event: MouseEvent): void => {
      if (!isDragging.value || currentKnob.value !== knob) return

      const deltaY = startY.value - event.clientY
      const sensitivity = 0.005
      let newValue = startVolume.value + (deltaY * sensitivity)

      // タイミング調整の場合は異なる範囲を使用
      if (knob === 'timing2' || knob === 'timing3') {
        // マウスの移動量から回転角度を計算（-135度から135度の範囲）
        const angle = startVolume.value + (deltaY * sensitivity * 270)
        // 回転角度を0から0.5の範囲に変換
        newValue = (angle + 135) / 270 * 0.5
        newValue = Math.max(0, Math.min(0.5, newValue))
        const sampleNumber = parseInt(knob.replace('timing', ''))
        timing.value[sampleNumber] = newValue
        updateTiming(sampleNumber)
        return
      }

      // ボリューム調整の場合
      newValue = Math.max(0, Math.min(1, newValue))
      if (knob === 'master') {
        masterVolume.value = newValue
        // マスターボリュームが変更されたら、全てのサンプルの音量を更新
        Object.keys(volumes.value).forEach(key => {
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
          ? timing.value[parseInt(knob.replace('timing', ''))] * 540 - 135  // タイミング値を回転角度に変換
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
          const level1 = audioEngine.getSampleVolume('1')
          const level2 = audioEngine.getSampleVolume('2')
          const level3 = audioEngine.getSampleVolume('3')
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
        audioEngine.setTiming(sampleNumber.toString(), timing.value[sampleNumber])
      } catch (error) {
        handleError('タイミングの調整に失敗しました', error as Error)
      }
    }

    const resetTiming = (sampleNumber: number): void => {
      try {
        timing.value[sampleNumber] = 0
        audioEngine.resetTiming(sampleNumber.toString())
      } catch (error) {
        handleError('タイミングのリセットに失敗しました', error as Error)
      }
    }

    const updateVolume = (sampleNumber: number): void => {
      try {
        const volume = volumes.value[sampleNumber] * masterVolume.value
        audioEngine.setSampleVolume(sampleNumber.toString(), volume)
      } catch (error) {
        handleError('音量の更新に失敗しました', error as Error)
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
    onMounted(async () => {
      try {
        // 音声ファイルの読み込み
        await loadAudioFiles()
        // メーター更新の開始
        startMeterUpdate()
        // キーボードイベントのリスナーを追加
        window.addEventListener('keydown', handleKeyDown)
      } catch (error) {
        handleError('プレイヤーの初期化に失敗しました', error as Error)
      }
    })

    onBeforeUnmount(() => {
      // メーター更新の停止
      stopMeterUpdate()
      // キーボードイベントのリスナーを削除
      window.removeEventListener('keydown', handleKeyDown)
      // AudioEngineの破棄
      audioEngine.dispose()
    })

    return {
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
      audioBlobs,
      playFromStart,
      resetVolume,
      resetMasterVolume,
      resetTiming,
      startDragging,
      handleDrag,
      handleDocumentMouseUp,
      handleWaveformError,
      handleWaveformLoading,
      handleWaveformReady
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
  background: #f0f4f8;  /* 背景色を少し暗く */
  border-radius: 4px;
  padding: 8px;
}

/* 波形のコンテナ内のキャンバス要素のスタイル */
div[ref="waveform1"] canvas,
div[ref="waveform2"] canvas,
div[ref="waveform3"] canvas {
  width: 100% !important;
  height: auto !important;
  border-radius: 2px;
}

/* 波形のコンテナのホバー効果 */
div[ref="waveform1"]:hover,
div[ref="waveform2"]:hover,
div[ref="waveform3"]:hover {
  background: #e2e8f0;  /* ホバー時の背景色も調整 */
  transition: background-color 0.2s ease;
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

