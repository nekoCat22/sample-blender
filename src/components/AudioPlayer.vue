/**
 * @file AudioPlayer.vue
 * @brief 音声プレイヤーのUIと制御を行うVueコンポーネント
 * @details
 * - 3つの音声サンプルの波形表示とUI操作
 * - サンプル3はEnable/Disable機能付き
 * - 各サンプルの音量、フィルター、ピッチの調整UI
 * - サンプル2と3のタイミング調整UI（0秒から+0.5秒）
 * - マスターボリュームとマスターフィルターの調整UI
 * - 音量メーター表示（危険域の表示付き）
 * - スペースキーでの再生コントロール
 * - エラー表示とローディング表示
 * @limitations
 * - ファイル名は固定（sample1.wav, sample2.wav, sample3.wav）
 * - 実際の音声処理はAudioEngineクラスに委譲
 */

<template>
  <div>
    <h2>サンプル声プレイヤー</h2>
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
          :sub-label="filterSubLabels[1]"
          :value="filterAngles[1]"
          @update:value="(value) => updateFilter(1, value)"
          @reset="resetFilter(1)"
        />
        <Knob
          label="Pitch"
          :value="pitches[1]"
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
          :sub-label="filterSubLabels[2]"
          :value="filterAngles[2]"
          @update:value="(value) => updateFilter(2, value)"
          @reset="resetFilter(2)"
        />
        <Knob
          label="Timing"
          :value="timing[2]"
          @update:value="(value) => updateTiming(2, value)"
          @reset="resetTiming(2)"
        />
        <Knob
          label="Pitch"
          :value="pitches[2]"
          :initial-rotation-offset="-135"
          @update:value="(value) => updatePitch(2, value)"
          @reset="resetPitch(2)"
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
            <input type="checkbox" v-model="isChannel3Enabled">
            <span class="toggle-slider"></span>
          </label>
          <div class="toggle-label">Enable</div>
        </div>
        <Knob
          label="Gain"
          :value="volumes[3]"
          :is-disabled="!isChannel3Enabled"
          @update:value="(value) => updateVolume(3, value)"
          @reset="resetVolume(3)"
        />
        <Knob
          label="Filter"
          :sub-label="filterSubLabels[3]"
          :value="filterAngles[3]"
          :is-disabled="!isChannel3Enabled"
          @update:value="(value) => updateFilter(3, value)"
          @reset="resetFilter(3)"
        />
        <Knob
          label="Timing"
          :value="timing[3]"
          :is-disabled="!isChannel3Enabled"
          @update:value="(value) => updateTiming(3, value)"
          @reset="resetTiming(3)"
        />
        <Knob
          label="Pitch"
          :value="pitches[3]"
          :initial-rotation-offset="-135"
          :is-disabled="!isChannel3Enabled"
          @update:value="(value) => updatePitch(3, value)"
          @reset="resetPitch(3)"
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
          :sub-label="filterSubLabels[0]"
          :value="masterFilterAngle"
          :min="0"
          :max="1"
          @update:value="(value) => updateFilter(0, value)"
          @reset="resetFilter(0)"
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
import { PlaybackSettingManager } from '../core/PlaybackSettingManager'
import { ChannelId } from '../core/audioConstants'
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
    // PlaybackSettingManagerのインスタンスを作成
    const playbackSettingsManager = new PlaybackSettingManager();

    // AudioEngineのインスタンスを作成
    const audioEngine = new AudioEngine(playbackSettingsManager);

    // 状態の定義
    const isPlaying = ref(false);
    const errorMessage = ref<string | null>(null);
    const isLoading = ref(false);
    const masterVolume = ref(0.8);
    const isChannel3Enabled = ref(false);
    const audioBlobs = ref<{ [key: number]: Blob | null }>({
      1: null,
      2: null,
      3: null
    });
    const filterAngles = ref<{ [key: number]: number }>({
      1: 0.5, // サンプル1
      2: 0.5, // サンプル2
      3: 0.5  // サンプル3
    });
    const volumeLevel = ref(-60); // 音量レベルの初期値
    const meterInterval = ref<number | null>(null); // 音量メーターの表示の設定

    // ノブの値を保持する状態変数
    const volumeAngles = ref<{ [key: number]: number }>({
      1: 0.8,
      2: 0.8,
      3: 0.8
    });
    const timingAngles = ref<{ [key: number]: number }>({
      2: 0,
      3: 0
    });
    const pitchAngles = ref<{ [key: number]: number }>({
      1: 0.5,
      2: 0.5,
      3: 0.5
    });

    // マスターフィルター用の状態変数
    const masterFilterAngle = ref(0.5);

    // 各フィルターのサブラベルを計算（0から1の正規化値で判断）
    const filterSubLabels = computed(() => {
      const labels: { [key: number]: string } = {};
      
      // マスターフィルターのサブラベル
      const masterValue = masterFilterAngle.value;
      const bypassRange = 0.05;  // バイパス範囲を0.05に設定（0.45から0.55の範囲）
      if (Math.abs(masterValue - 0.5) <= bypassRange) {
        labels[0] = 'BYPASS';
      } else if (masterValue > 0.5) {
        labels[0] = 'HP';
      } else {
        labels[0] = 'LP';
      }

      // 各サンプルのフィルターのサブラベル
      Object.keys(filterAngles.value).forEach((key) => {
        const value = filterAngles.value[parseInt(key)];
        if (Math.abs(value - 0.5) <= bypassRange) {
          labels[parseInt(key)] = 'BYPASS';
        } else if (value > 0.5) {
          labels[parseInt(key)] = 'HP';
        } else {
          labels[parseInt(key)] = 'LP';
        }
      });

      return labels;
    })

    // ===== エラーハンドリング関連 =====
    const handleError = (message: string, err: Error): void => {
      console.error('Audio Player Error:', message, err);
      errorMessage.value = `${message}: ${err.message}`;
      isLoading.value = false;
    };

    const handleWaveformError = (error: string): void => {
      handleError('波形表示でエラーが発生しました', new Error(error));
    };

    const handleWaveformLoading = (): void => {
      isLoading.value = true;
    };

    const handleWaveformReady = (): void => {
      isLoading.value = false;
    };

    // ===== 音声ファイル読み込み関連 =====
    const loadAudioFiles = async (): Promise<void> => {
      try {
        isLoading.value = true;

        for (let channelNumber of [1, 2, 3] as ChannelId[]) {
          const response = await fetch(`/sample${channelNumber}.wav`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          audioBlobs.value[channelNumber] = blob;
          
          // AudioEngineで音声データを読み込み
          const arrayBuffer = await blob.arrayBuffer();
          await audioEngine.loadSample(channelNumber, arrayBuffer);
          
          // 初期設定をPlaybackSettingManagerに保存
          playbackSettingsManager.setSetting(channelNumber, 'volume', 0.8);
          playbackSettingsManager.setSetting(channelNumber, 'pitch', 0.5);
          if (channelNumber === 2 || channelNumber === 3) {
            playbackSettingsManager.setSetting(channelNumber, 'timing', 0.0);
          }
        }

        // マスターボリュームを設定
        audioEngine.setMasterVolume(masterVolume.value);
        
        // マスターフィルターを設定
        audioEngine.setFilterValue(0, masterFilterAngle.value);

        // 再生終了時のコールバックを設定
        audioEngine.setOnPlaybackEnd(() => {
          isPlaying.value = false;
        });
      } catch (error) {
        handleError('音声ファイルの読み込みに失敗しました', error as Error);
      }
    };

    // ===== 再生制御関連 =====
    const resetPlayback = (): void => {
      audioEngine.stopAll();
      isPlaying.value = false;
    };

    const playFromStart = (): void => {
      try {
        resetPlayback();
        isPlaying.value = true;
        
        // 再生するサンプルIDの配列を作成
        const channelIds: ChannelId[] = [1, 2];
        if (isChannel3Enabled.value) {
          channelIds.push(3);
        }

        // AudioEngineを使って再生
        audioEngine.playSamples(channelIds);

        // 各サンプルをEffectChainに接続
        channelIds.forEach(channelId => {
          audioEngine.connectSampleToEffectChain(channelId);
        });
      } catch (error) {
        handleError('再生に失敗しました', error as Error);
        isPlaying.value = false;
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.code === 'Space') {
        event.preventDefault();
        playFromStart();
      }
    };

    // ===== パラメータ更新関連 =====
    // マスターボリューム制御
    const updateMasterVolume = (value: number): void => {
      try {
        masterVolume.value = value;
        audioEngine.setMasterVolume(value);
      } catch (error) {
        handleError('マスターボリュームの更新に失敗しました', error as Error);
      }
    };

    const resetMasterVolume = (): void => {
      try {
        masterVolume.value = 0.8;
        audioEngine.setMasterVolume(0.8);
      } catch (error) {
        handleError('マスターボリュームのリセットに失敗しました', error as Error);
      }
    };

    // サンプル音量制御
    const updateVolume = (channelNumber: ChannelId, value: number): void => {
      try {
        playbackSettingsManager.setSetting(channelNumber, 'volume', value);
        volumeAngles.value[channelNumber] = value;
      } catch (error) {
        handleError('音量の更新に失敗しました', error as Error);
      }
    };

    const resetVolume = (channelNumber: ChannelId): void => {
      try {
        playbackSettingsManager.setSetting(channelNumber, 'volume', 0.8);
        volumeAngles.value[channelNumber] = 0.8;
      } catch (error) {
        handleError('音量のリセットに失敗しました', error as Error);
      }
    };

    // タイミング制御
    const updateTiming = (channelNumber: ChannelId, value: number): void => {
      try {
        playbackSettingsManager.setSetting(channelNumber, 'timing', value);
        timingAngles.value[channelNumber] = value;
      } catch (error) {
        handleError('タイミングの調整に失敗しました', error as Error);
      }
    };

    const resetTiming = (channelNumber: ChannelId): void => {
      try {
        playbackSettingsManager.setSetting(channelNumber, 'timing', 0.0);
        timingAngles.value[channelNumber] = 0.0;
      } catch (error) {
        handleError('タイミングのリセットに失敗しました', error as Error);
      }
    };

    // ピッチ制御
    const updatePitch = (channelNumber: ChannelId, value: number): void => {
      try {
        playbackSettingsManager.setSetting(channelNumber, 'pitch', value);
        pitchAngles.value[channelNumber] = value;
      } catch (error) {
        handleError('ピッチの更新に失敗しました', error as Error);
      }
    };

    const resetPitch = (channelNumber: ChannelId): void => {
      try {
        playbackSettingsManager.setSetting(channelNumber, 'pitch', 0.5);
        pitchAngles.value[channelNumber] = 0.5;
      } catch (error) {
        handleError('ピッチのリセットに失敗しました', error as Error);
      }
    };

    // フィルター制御
    const updateFilter = (channelNumber: ChannelId | 0, angle: number) => {
      try {
        if (channelNumber === 0) {
          // マスターフィルターの更新
          audioEngine.setFilterValue(0, angle);
          masterFilterAngle.value = angle;
        } else {
          // サンプルのフィルターの更新
          audioEngine.setFilterValue(channelNumber, angle);
          filterAngles.value[channelNumber] = angle;
        }
      } catch (error) {
        handleError('フィルターの更新に失敗しました', error as Error);
      }
    };

    const resetFilter = (channelNumber: ChannelId | 0) => {
      try {
        const initialFilter = 0.5;
        if (channelNumber === 0) {
          // マスターフィルターのリセット
          masterFilterAngle.value = initialFilter;
          audioEngine.setFilterValue(0, initialFilter);
        } else {
          // サンプルのフィルターのリセット
          filterAngles.value[channelNumber] = initialFilter;
          audioEngine.setFilterValue(channelNumber, initialFilter);
        }
      } catch (error) {
        handleError('フィルターのリセットに失敗しました', error as Error);
      }
    };

    // ===== メーター制御関連 =====
    const startMeterUpdate = (): void => {
      meterInterval.value = window.setInterval(() => {
        if (isPlaying.value) {
          const level1 = audioEngine.getSampleVolume(1);
          const level2 = audioEngine.getSampleVolume(2);
          const level3 = isChannel3Enabled.value ? audioEngine.getSampleVolume(3) : 0;
          volumeLevel.value = 20 * Math.log10((level1 + level2 + level3) / 3);
        }
      }, 1000 / 60);
    };

    const stopMeterUpdate = (): void => {
      if (meterInterval.value) {
        clearInterval(meterInterval.value);
        meterInterval.value = null;
      }
    };

    // 再生状態が変更されたときにメーターの更新を制御
    watch(() => isPlaying.value, (newValue) => {
      if (newValue) {
        startMeterUpdate();
      } else {
        stopMeterUpdate();
        volumeLevel.value = -60;
      }
    });

    // ===== ライフサイクル関連 =====
    onMounted(async () => {
      try {
        // 音声ファイルの読み込み
        await loadAudioFiles();
        // キーボードイベントのリスナーを追加
        window.addEventListener('keydown', handleKeyDown);
      } catch (error) {
        handleError('プレイヤーの初期化に失敗しました', error as Error);
      }
    });

    onBeforeUnmount(() => {
      // キーボードイベントのリスナーを削除
      window.removeEventListener('keydown', handleKeyDown);
      
      // メーターの更新を停止
      stopMeterUpdate();
      
      // AudioEngineの破棄を呼び出す
      audioEngine.dispose();
      
      // 状態のクリーンアップ
      audioBlobs.value = { 1: null, 2: null, 3: null };
      volumeAngles.value = { 1: 0.8, 2: 0.8, 3: 0.8 };
      timingAngles.value = { 2: 0, 3: 0 };
      filterAngles.value = { 1: 0.5, 2: 0.5, 3: 0.5 };
      pitchAngles.value = { 1: 0.5, 2: 0.5, 3: 0.5 };
      isChannel3Enabled.value = false;
      isPlaying.value = false;
      errorMessage.value = null;
      isLoading.value = false;
      volumeLevel.value = -60;
    });

    return {
      isPlaying,
      error: errorMessage,
      isLoading,
      volumes: volumeAngles,
      masterVolume,
      timing: timingAngles,
      pitches: pitchAngles,
      isChannel3Enabled,
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
      masterFilterAngle,
      filterSubLabels,
      updateFilter,
      resetFilter
    };
  }
});
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

