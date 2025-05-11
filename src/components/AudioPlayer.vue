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
 * - サンプル2と3のタイミング調整機能（0秒から+0.5秒）
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
      <div class="knob-row">
        <Knob
          label="Gain"
          :value="volumes[1]"
          @update:value="(value) => updateVolume(1, value)"
          @reset="resetVolume(1)"
        />
        <Knob
          label="Filter"
          :sub-label="filterSubLabel"
          :value="filterAngles[0]"
          :min="-135"
          :max="135"
          :rotation-range="270"
          @update:value="(value) => updateFilter(0, value)"
          @reset="resetFilter(0)"
        />
        <Knob
          label="Pitch"
          :value="pitches[1]"
          :min="-135"
          :max="135"
          :rotation-range="270"
          :initial-rotation-offset="-135"
          @update:value="(value) => updatePitch(1, value)"
          @reset="resetPitch(1)"
        />
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
        <Knob
          label="Gain"
          :value="volumes[2]"
          @update:value="(value) => updateVolume(2, value)"
          @reset="resetVolume(2)"
        />
        <Knob
          label="Filter"
          :sub-label="filterSubLabels[1]"
          :value="filterAngles[1]"
          :min="-135"
          :max="135"
          :rotation-range="270"
          @update:value="(value) => updateFilter(1, value)"
          @reset="resetFilter(1)"
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
          label="Filter"
          :sub-label="filterSubLabels[2]"
          :value="filterAngles[2]"
          :min="-135"
          :max="135"
          :rotation-range="270"
          :is-disabled="!isSample3Enabled"
          @update:value="(value) => updateFilter(2, value)"
          @reset="resetFilter(2)"
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
        <Knob
          label="Filter"
          :sub-label="filterSubLabels[3]"
          :value="filterAngles[3]"
          :min="-135"
          :max="135"
          :rotation-range="270"
          @update:value="(value) => updateFilter(3, value)"
          @reset="resetFilter(3)"
        />
        <VolumeMeter 
          :level="volumeLevel"
          :is-playing="isPlaying"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { AudioEngine } from '../core/AudioEngine'
import WaveformDisplay from './WaveformDisplay.vue'
import VolumeMeter from './VolumeMeter.vue'
import Knob from './Knob.vue'
import { Filter } from '@/effects/Filter'
import { EffectChain } from '@/effects/EffectChain'
import { BaseEffect } from '@/effects/base/BaseEffect'

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
      1: 0.8,
      2: 0.8,
      3: 0.8
    })
    const masterVolume = ref(0.8)
    const timing = ref<{ [key: number]: number }>({
      2: 0,
      3: 0
    })
    const pitches = ref<{ [key: number]: number }>({
      1: 1.0,
      2: 1.0,
      3: 1.0
    })
    const isSample3Enabled = ref(false)
    const audioBlobs = ref<{ [key: number]: Blob | null }>({
      1: null,
      2: null,
      3: null
    })
    const volumeLevel = ref(-60)
    const meterInterval = ref<number | null>(null)
    const filters = ref<Filter[]>([])
    const effectChains = ref<EffectChain[]>([])
    const filterAngles = ref<number[]>([0, 0, 0, 0])  // サンプル1,2,3とマスター用

    // フィルターのサブラベルを計算
    const filterSubLabel = computed(() => {
      if (!filters.value[0]) return 'BYPASS'
      const bypassRange = filters.value[0].getBypassAngleRange()
      if (Math.abs(filterAngles.value[0]) <= bypassRange) return 'BYPASS'
      if (filterAngles.value[0] > 0) return 'HP'
      return 'LP'
    })

    // 各フィルターのサブラベルを計算
    const filterSubLabels = computed(() => {
      return filterAngles.value.map((angle, index) => {
        if (!filters.value[index]) return 'BYPASS'
        const bypassRange = filters.value[index].getBypassAngleRange()
        if (Math.abs(angle) <= bypassRange) return 'BYPASS'
        if (angle > 0) return 'HP'
        return 'LP'
      })
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

        // 再生終了時のコールバックを設定
        audioEngine.setOnPlaybackEnd(() => {
          isPlaying.value = false
        })
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

    // サンプルの接続を管理する関数
    const connectSampleToEffectChain = (sampleNumber: number) => {
      try {
        const sampleGain = audioEngine.getSampleGain(sampleNumber.toString())
        if (sampleGain) {
          sampleGain.disconnect()
          // サンプルの出力を対応するEffectChainに接続
          sampleGain.connect(effectChains.value[sampleNumber - 1].getInput())
          // EffectChainの出力をマスターのEffectChainに接続
          effectChains.value[sampleNumber - 1].getOutput().connect(effectChains.value[3].getInput())
        }
      } catch (error) {
        handleError(`サンプル${sampleNumber}の接続に失敗しました`, error as Error)
      }
    }

    const playFromStart = (): void => {
      try {
        resetPlayback()
        isPlaying.value = true
        
        // 再生するサンプルIDの配列を作成
        const sampleIds = ['1', '2']
        if (isSample3Enabled.value) {
          sampleIds.push('3')
        }

        // タイミング情報を作成
        const timings: { [key: string]: number } = {}
        if (timing.value[2] !== 0) {
          timings['2'] = timing.value[2]
        }
        if (timing.value[3] !== 0) {
          timings['3'] = timing.value[3]
        }

        // AudioEngineを使って再生
        audioEngine.playSamples(sampleIds, timings)

        // 各サンプルをEffectChainに接続
        sampleIds.forEach(sampleId => {
          connectSampleToEffectChain(parseInt(sampleId))
        })
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
        audioEngine.setMasterVolume(0.8)
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
        volumes.value[sampleNumber] = 0.8
        updateVolume(sampleNumber, 0.8)
      } catch (error) {
        handleError('音量のリセットに失敗しました', error as Error)
      }
    }

    const updateMasterVolume = (value: number): void => {
      try {
        masterVolume.value = value;
        audioEngine.setMasterVolume(value);
      } catch (error) {
        handleError('マスターボリュームの更新に失敗しました', error as Error);
      }
    }

    const updatePitch = (sampleNumber: number, value: number): void => {
      try {
        audioEngine.setSamplePitch(sampleNumber.toString(), value)
        pitches.value[sampleNumber] = value
      } catch (error) {
        handleError('ピッチの更新に失敗しました', error as Error)
      }
    }

    const resetPitch = (sampleNumber: number): void => {
      try {
        pitches.value[sampleNumber] = 1.0
        audioEngine.setSamplePitch(sampleNumber.toString(), 1.0, true)
      } catch (error) {
        handleError('ピッチのリセットに失敗しました', error as Error)
      }
    }

    // メーターの更新を開始する
    const startMeterUpdate = (): void => {
      meterInterval.value = window.setInterval(() => {
        if (isPlaying.value) {
          const level1 = audioEngine.getSampleVolume('1')
          const level2 = audioEngine.getSampleVolume('2')
          const level3 = isSample3Enabled.value ? audioEngine.getSampleVolume('3') : 0
          volumeLevel.value = 20 * Math.log10((level1 + level2 + level3) / 3)
        }
      }, 1000 / 60)
    }

    // メーターの更新を停止する
    const stopMeterUpdate = (): void => {
      if (meterInterval.value) {
        clearInterval(meterInterval.value)
        meterInterval.value = null
      }
    }

    // 再生状態が変更されたときにメーターの更新を制御
    watch(() => isPlaying.value, (newValue) => {
      if (newValue) {
        startMeterUpdate()
      } else {
        stopMeterUpdate()
        volumeLevel.value = -60
      }
    })

    // フィルターの初期化
    const initFilter = () => {
      try {
        // サンプル1,2,3とマスター用のフィルターを作成
        for (let i = 0; i < 4; i++) {
          const filter = new Filter(audioEngine.getContext())
          const effectChain = new EffectChain(audioEngine.getContext())
          effectChain.addEffect(filter as unknown as BaseEffect)
          filters.value.push(filter)
          effectChains.value.push(effectChain)
        }
        
        // マスターのEffectChainを出力に接続
        effectChains.value[3].getOutput().connect(audioEngine.getContext().destination)
        
        // サンプル1の出力をEffectChainに接続（既存の動作を維持）
        const sample1Gain = audioEngine.getSampleGain('1')
        if (sample1Gain) {
          sample1Gain.disconnect()
          sample1Gain.connect(effectChains.value[0].getInput())
        }
      } catch (error) {
        handleError('フィルターの初期化に失敗しました', error as Error)
      }
    }

    // フィルターの更新
    const updateFilter = (index: number, angle: number) => {
      try {
        if (filters.value[index]) {
          filters.value[index].setKnobAngle(angle)
          filterAngles.value[index] = angle
        }
      } catch (error) {
        handleError('フィルターの更新に失敗しました', error as Error)
      }
    }

    // フィルターのリセット
    const resetFilter = (index: number) => {
      try {
        if (filters.value[index]) {
          filters.value[index].reset()
          filterAngles.value[index] = 0
        }
      } catch (error) {
        handleError('フィルターのリセットに失敗しました', error as Error)
      }
    }

    // ライフサイクルフック
    onMounted(async () => {
      try {
        // 音声ファイルの読み込み
        await loadAudioFiles()
        // フィルターの初期化
        initFilter()
        // キーボードイベントのリスナーを追加
        window.addEventListener('keydown', handleKeyDown)
      } catch (error) {
        handleError('プレイヤーの初期化に失敗しました', error as Error)
      }
    })

    onBeforeUnmount(() => {
      // キーボードイベントのリスナーを削除
      window.removeEventListener('keydown', handleKeyDown)
      
      // メーターの更新を停止
      stopMeterUpdate()
      
      // AudioEngineの破棄を呼び出す（これにより、エフェクトチェーンとフィルターも破棄される）
      audioEngine.dispose();
      
      // 状態のクリーンアップ
      audioBlobs.value = { 1: null, 2: null, 3: null }
      volumes.value = { 1: 0.8, 2: 0.8, 3: 0.8 }
      timing.value = { 2: 0, 3: 0 }
      filterAngles.value = [0, 0, 0, 0]
      isSample3Enabled.value = false
      isPlaying.value = false
      errorMessage.value = null
      isLoading.value = false
      volumeLevel.value = -60
      
      // 参照のクリーンアップ
      filters.value = []
      effectChains.value = []
    })

    return {
      isPlaying,
      error: errorMessage,
      isLoading,
      volumes,
      masterVolume,
      timing,
      pitches,
      isSample3Enabled,
      audioBlobs,
      audioEngine,
      volumeLevel,
      playFromStart,
      resetVolume,
      resetMasterVolume,
      resetTiming,
      resetPitch,
      handleWaveformError,
      handleWaveformLoading,
      handleWaveformReady,
      updateVolume,
      updateTiming,
      updateMasterVolume,
      updatePitch,
      filterAngles,
      filterSubLabel,
      filterSubLabels,
      updateFilter,
      resetFilter
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

