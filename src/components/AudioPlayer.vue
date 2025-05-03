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
        <div class="knob" @dblclick="resetVolume(1)">
          <div class="knob-dial" :style="{ transform: `rotate(${volume1 * 270 - 135}deg)` }"></div>
          <input
            type="range"
            id="volume1"
            v-model="volume1"
            min="0"
            max="1"
            step="0.01"
            @input="updateVolume(1)"
            class="knob-input"
          />
        </div>
        <div class="knob-label">Volume</div>
      </div>
    </div>

    <!-- サンプル2 -->
    <div class="sample-container">
      <h3>サンプル2</h3>
      <div ref="waveform2"></div>
      <div class="knob-container">
        <div class="knob" @dblclick="resetVolume(2)">
          <div class="knob-dial" :style="{ transform: `rotate(${volume2 * 270 - 135}deg)` }"></div>
          <input
            type="range"
            id="volume2"
            v-model="volume2"
            min="0"
            max="1"
            step="0.01"
            @input="updateVolume(2)"
            class="knob-input"
          />
        </div>
        <div class="knob-label">Volume</div>
      </div>
    </div>

    <!-- 再生ボタン -->
    <div class="control-container">
      <button @click="playFromStart" :disabled="!!error || isLoading">
        再生
      </button>
    </div>
  </div>
</template>

<script>
import WaveSurfer from 'wavesurfer.js';

export default {
  name: 'AudioPlayer',
  data() {
    return {
      wavesurfer1: null, // サンプル1のwavesurfer.jsのインスタンス
      wavesurfer2: null, // サンプル2のwavesurfer.jsのインスタンス
      isPlaying: false, // 再生中かどうか
      error: null, // エラーメッセージ
      isLoading: false, // 読み込み中かどうか
      volume1: 0.5, // サンプル1の音量（0-1）
      volume2: 0.5, // サンプル2の音量（0-1）
    };
  },
  async mounted() {
    try {
      // wavesurfer.jsの初期化（サンプル1）
      this.wavesurfer1 = WaveSurfer.create({
        container: this.$refs.waveform1,
        waveColor: '#a3cef1',
        progressColor: '#4361ee',
        height: 80,
      });

      // wavesurfer.jsの初期化（サンプル2）
      this.wavesurfer2 = WaveSurfer.create({
        container: this.$refs.waveform2,
        waveColor: '#a3cef1',
        progressColor: '#4361ee',
        height: 80,
      });

      // エラーイベントの監視（サンプル1）
      this.wavesurfer1.on('error', (error) => {
        this.error = `サンプル1の読み込みに失敗しました: ${error.message}`;
        this.isLoading = false;
        console.error('AudioPlayer.vue: wavesurfer1エラー', error);
      });

      // エラーイベントの監視（サンプル2）
      this.wavesurfer2.on('error', (error) => {
        this.error = `サンプル2の読み込みに失敗しました: ${error.message}`;
        this.isLoading = false;
        console.error('AudioPlayer.vue: wavesurfer2エラー', error);
      });

      // ロード開始時の処理（サンプル1）
      this.wavesurfer1.on('loading', () => {
        this.error = null;
        this.isLoading = true;
      });

      // ロード開始時の処理（サンプル2）
      this.wavesurfer2.on('loading', () => {
        this.error = null;
        this.isLoading = true;
      });

      // ロード完了時の処理（サンプル1）
      this.wavesurfer1.on('ready', () => {
        this.error = null;
        this.isLoading = false;
        this.wavesurfer1.setVolume(this.volume1);
      });

      // ロード完了時の処理（サンプル2）
      this.wavesurfer2.on('ready', () => {
        this.error = null;
        this.isLoading = false;
        this.wavesurfer2.setVolume(this.volume2);
      });

      // 再生状態の監視（サンプル1）
      this.wavesurfer1.on('play', () => {
        this.isPlaying = true;
      });
      this.wavesurfer1.on('pause', () => {
        this.isPlaying = false;
      });
      this.wavesurfer1.on('finish', () => {
        this.isPlaying = false;
      });

      // 再生状態の監視（サンプル2）
      this.wavesurfer2.on('play', () => {
        this.isPlaying = true;
      });
      this.wavesurfer2.on('pause', () => {
        this.isPlaying = false;
      });
      this.wavesurfer2.on('finish', () => {
        this.isPlaying = false;
      });

      // 音声ファイルのロード
      try {
        this.isLoading = true;

        // サンプル1のロード
        const response1 = await fetch('/sample1.wav');
        if (!response1.ok) {
          throw new Error(`HTTP error! status: ${response1.status}`);
        }
        const blob1 = await response1.blob();
        this.wavesurfer1.loadBlob(blob1);

        // サンプル2のロード
        const response2 = await fetch('/sample2.wav');
        if (!response2.ok) {
          throw new Error(`HTTP error! status: ${response2.status}`);
        }
        const blob2 = await response2.blob();
        this.wavesurfer2.loadBlob(blob2);
      } catch (error) {
        this.error = `音声ファイルの読み込みに失敗しました: ${error.message}`;
        this.isLoading = false;
        console.error('AudioPlayer.vue: load() - ファイル読み込みエラー', error);
      }
    } catch (error) {
      this.error = `プレイヤーの初期化に失敗しました: ${error.message}`;
      this.isLoading = false;
      console.error('AudioPlayer.vue: mounted() - wavesurfer初期化エラー', error);
    }
  },
  methods: {
    /**
     * @function playFromStart
     * @description 両方のサンプルを最初から再生する
     */
    playFromStart() {
      try {
        if (this.wavesurfer1 && this.wavesurfer2) {
          // 両方のサンプルを最初に戻す
          this.wavesurfer1.seekTo(0);
          this.wavesurfer2.seekTo(0);
          // 再生を開始
          this.wavesurfer1.play();
          this.wavesurfer2.play();
        }
      } catch (error) {
        this.error = `再生に失敗しました: ${error.message}`;
        console.error('AudioPlayer.vue: playFromStart() - 再生エラー', error);
      }
    },
    /**
     * @function updateVolume
     * @description 指定したサンプルの音量を更新する
     * @param {number} sampleNumber - サンプル番号（1または2）
     */
    updateVolume(sampleNumber) {
      try {
        const wavesurfer = sampleNumber === 1 ? this.wavesurfer1 : this.wavesurfer2;
        const volume = sampleNumber === 1 ? this.volume1 : this.volume2;
        if (wavesurfer) {
          wavesurfer.setVolume(volume);
        }
      } catch (error) {
        this.error = `音量の調整に失敗しました: ${error.message}`;
        console.error('AudioPlayer.vue: updateVolume() - 音量調整エラー', error);
      }
    },
    /**
     * @function resetVolume
     * @description 指定したサンプルの音量を初期値（0.5）にリセットする
     * @param {number} sampleNumber - サンプル番号（1または2）
     */
    resetVolume(sampleNumber) {
      try {
        if (sampleNumber === 1) {
          this.volume1 = 0.5;
          this.updateVolume(1);
        } else {
          this.volume2 = 0.5;
          this.updateVolume(2);
        }
      } catch (error) {
        this.error = `音量のリセットに失敗しました: ${error.message}`;
        console.error('AudioPlayer.vue: resetVolume() - 音量リセットエラー', error);
      }
    },
  },
  beforeUnmount() {
    if (this.wavesurfer1) {
      this.wavesurfer1.destroy();
    }
    if (this.wavesurfer2) {
      this.wavesurfer2.destroy();
    }
  },
};
</script>

<style scoped>
/* 波形表示のスタイル */
div[ref="waveform1"],
div[ref="waveform2"] {
  margin-bottom: 1em;
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

.knob-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
  margin-top: 1em;
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
</style>
