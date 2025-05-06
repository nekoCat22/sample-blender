/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file AudioPlayer.vue
 * @brief 音声ファイルの再生と波形表示を行うVueコンポーネント
 * @details
 * - 3つの音声ファイルを同時に再生可能（サンプル3はEnable/Disable機能付き）
 * - 再生ボタン付き（全てのサンプルを同時に制御、常に最初から再生）
 * - エラー処理とエラーメッセージ表示機能
 * - ローディング状態の表示機能
 * - 各サンプルのノブによる音量調整機能（ダブルクリックで初期値にリセット）
 * - スペースキーでの再生制御機能
 * - マスターボリューム制御機能
 * - マスターボリュームの音量メーター表示機能（危険域の表示付き）
 * - サンプル2と3のタイミング調整機能（-0.5秒から+0.5秒）
 * @limitations
 * - ファイル名は固定（sample1.wav, sample2.wav, sample3.wav）
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
      <Knob
        label="Gain"
        :value="volumes[1]"
        @update:value="(value) => updateVolume(1, value)"
        @reset="resetVolume(1)"
      />
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
        <Knob
          label="Gain"
          :value="volumes[2]"
          @update:value="(value) => updateVolume(2, value)"
          @reset="resetVolume(2)"
        />
        <Knob
          label="Timing"
          :value="timing[2]"
          :min="0"
          :max="0.5"
          :rotation-range="270"
          @update:value="(value) => updateTiming(2, value)"
          @reset="resetTiming(2)"
        />
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
        <Knob
          label="Gain"
          :value="volumes[3]"
          :is-disabled="!isSample3Enabled"
          @update:value="(value) => updateVolume(3, value)"
          @reset="resetVolume(3)"
        />
        <Knob
          label="Timing"
          :value="timing[3]"
          :min="0"
          :max="0.5"
          :rotation-range="270"
          :is-disabled="!isSample3Enabled"
          @update:value="(value) => updateTiming(3, value)"
          @reset="resetTiming(3)"
        />
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
        <Knob
          label="Master"
          :value="masterVolume"
          @update:value="(value) => updateMasterVolume(value)"
          @reset="resetMasterVolume"
        />
        <VolumeMeter 
          :audio-engine="audioEngine"
          :is-playing="isPlaying"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { AudioEngine } from '../core/AudioEngine'
import WaveformDisplay from './WaveformDisplay.vue'
import VolumeMeter from './VolumeMeter.vue'
import Knob from './Knob.vue'

export default defineComponent({
  name: 'AudioPlayer',
  components: {
    WaveformDisplay,
    VolumeMeter,
    Knob
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
        audioEngine.playSample('2')
        
        if (isSample3Enabled.value) {
          audioEngine.playSample('3')
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

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'Space') {
        event.preventDefault()
        playFromStart()
      }
    }

    const resetMasterVolume = (): void => {
      try {
        masterVolume.value = 0.8
        updateVolume(1, 0.5)
        updateVolume(2, 0.5)
        updateVolume(3, 0.5)
      } catch (error) {
        handleError('マスターボリュームのリセットに失敗しました', error as Error)
      }
    }

    const updateTiming = (sampleNumber: number, value: number): void => {
      try {
        audioEngine.setTiming(sampleNumber.toString(), value)
        timing.value[sampleNumber] = value
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

    const updateVolume = (sampleNumber: number, value: number): void => {
      try {
        const volume = value * masterVolume.value
        audioEngine.setSampleVolume(sampleNumber.toString(), volume)
        volumes.value[sampleNumber] = value
      } catch (error) {
        handleError('音量の更新に失敗しました', error as Error)
      }
    }

    const resetVolume = (sampleNumber: number): void => {
      try {
        volumes.value[sampleNumber] = 0.5
        updateVolume(sampleNumber, 0.5)
      } catch (error) {
        handleError('音量のリセットに失敗しました', error as Error)
      }
    }

    const updateMasterVolume = (value: number): void => {
      try {
        masterVolume.value = value
        // マスターボリュームが変更されたら、全てのサンプルの音量を更新
        Object.keys(volumes.value).forEach(key => {
          const sampleNumber = parseInt(key)
          updateVolume(sampleNumber, volumes.value[sampleNumber])
        })
      } catch (error) {
        handleError('マスターボリュームの更新に失敗しました', error as Error)
      }
    }

    // ライフサイクルフック
    onMounted(async () => {
      try {
        // 音声ファイルの読み込み
        await loadAudioFiles()
        // キーボードイベントのリスナーを追加
        window.addEventListener('keydown', handleKeyDown)
      } catch (error) {
        handleError('プレイヤーの初期化に失敗しました', error as Error)
      }
    })

    onBeforeUnmount(() => {
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
      timing,
      isSample3Enabled,
      audioBlobs,
      audioEngine,
      playFromStart,
      resetVolume,
      resetMasterVolume,
      resetTiming,
      handleWaveformError,
      handleWaveformLoading,
      handleWaveformReady,
      updateVolume,
      updateTiming,
      updateMasterVolume
    }
  }
})
</script>

<style scoped>
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
</style>

