/**
 * @file AudioPlayer.vue
 * @brief 音声ファイルの再生と波形表示を行うVueコンポーネント
 * @details
 * - 音声ファイル（public/sample.wav）を再生
 * - wavesurfer.jsで波形を表示
 * - 再生・停止ボタン付き
 * - エラー処理とエラーメッセージ表示機能
 * - ローディング状態の表示機能
 * @limitations
 * - ファイル名は固定（sample.wav）
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
    <div ref="waveform"></div>
    <button @click="togglePlay" :disabled="!!error || isLoading">
      {{ isPlaying ? '停止' : '再生' }}
    </button>
  </div>
</template>

<script>
import WaveSurfer from 'wavesurfer.js';

export default {
  name: 'AudioPlayer',
  data() {
    return {
      wavesurfer: null, // wavesurfer.jsのインスタンス
      isPlaying: false, // 再生中かどうか
      error: null, // エラーメッセージ
      isLoading: false, // 読み込み中かどうか
    };
  },
  async mounted() {
    try {
      // wavesurfer.jsの初期化
      this.wavesurfer = WaveSurfer.create({
        container: this.$refs.waveform,
        waveColor: '#a3cef1',
        progressColor: '#4361ee',
        height: 80,
      });

      // エラーイベントの監視
      this.wavesurfer.on('error', (error) => {
        this.error = `音声ファイルの読み込みに失敗しました: ${error.message}`;
        this.isLoading = false;
        console.error('AudioPlayer.vue: wavesurferエラー', error);
      });

      // ロード開始時の処理
      this.wavesurfer.on('loading', () => {
        this.error = null;
        this.isLoading = true;
      });

      // ロード完了時の処理
      this.wavesurfer.on('ready', () => {
        this.error = null;
        this.isLoading = false;
      });

      // 再生完了時の処理
      this.wavesurfer.on('finish', () => {
        this.isPlaying = false;
      });

      // 音声ファイルのロード
      try {
        this.isLoading = true;
        const response = await fetch('/sample.wav');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        this.wavesurfer.loadBlob(blob);
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
     * @function togglePlay
     * @description 再生・停止を切り替える
     */
    togglePlay() {
      try {
        if (this.wavesurfer) {
          this.wavesurfer.playPause();
        }
      } catch (error) {
        this.error = `再生/停止の切り替えに失敗しました: ${error.message}`;
        console.error('AudioPlayer.vue: togglePlay() - 再生/停止エラー', error);
      }
    },
  },
  beforeUnmount() {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }
  },
};
</script>

<style scoped>
/* 波形表示のスタイル */
div[ref="waveform"] {
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
</style>
