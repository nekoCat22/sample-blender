/**
 * @file AudioPlayer.vue
 * @brief 音声ファイルの再生と波形表示を行うVueコンポーネント
 * @details
 * - 音声ファイル（public/sample.wav）を再生
 * - wavesurfer.jsで波形を表示
 * - 再生・停止ボタン付き
 * @limitations
 * - ファイル名は固定（sample.wav）
 * - エラー処理は最小限
 */

<template>
  <div>
    <h2>サンプル音声プレイヤー</h2>
    <div ref="waveform"></div>
    <button @click="togglePlay">{{ isPlaying ? '停止' : '再生' }}</button>
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
    };
  },
  mounted() {
    try {
      // wavesurfer.jsの初期化
      this.wavesurfer = WaveSurfer.create({
        container: this.$refs.waveform,
        waveColor: '#a3cef1',
        progressColor: '#4361ee',
        height: 80,
      });
      // 音声ファイルのロード
      this.wavesurfer.load('/sample.wav');
      // 再生・停止状態の監視
      this.wavesurfer.on('play', () => {
        this.isPlaying = true;
      });
      this.wavesurfer.on('pause', () => {
        this.isPlaying = false;
      });
      this.wavesurfer.on('finish', () => {
        this.isPlaying = false;
      });
    } catch (error) {
      // エラー時の詳細出力
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
</style>
