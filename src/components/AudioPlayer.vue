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
        <div class="knob-label">Volume</div>
      </div>
    </div>

    <!-- サンプル2 -->
    <div class="sample-container">
      <h3>サンプル2</h3>
      <div ref="waveform2"></div>
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
      wavesurfers: {
        1: null,
        2: null
      },
      isPlaying: false,
      error: null,
      isLoading: false,
      volumes: {
        1: 0.5,
        2: 0.5
      },
      isDragging: false,
      currentKnob: null,
      startY: 0,
      startVolume: 0,
    };
  },
  async mounted() {
    try {
      // wavesurfer.jsの初期化
      this.initializeWavesurfers();
      
      // 音声ファイルのロード
      await this.loadAudioFiles();

      // ドキュメント全体のマウスイベントを監視
      document.addEventListener('mousemove', this.handleDocumentMouseMove);
      document.addEventListener('mouseup', this.handleDocumentMouseUp);

      // キーボードイベントを監視
      document.addEventListener('keydown', this.handleKeyDown);
    } catch (error) {
      this.handleError('プレイヤーの初期化に失敗しました', error);
    }
  },
  methods: {
    /**
     * @function initializeWavesurfers
     * @description wavesurfer.jsのインスタンスを初期化する
     */
    initializeWavesurfers() {
      [1, 2].forEach(sampleNumber => {
        const wavesurfer = WaveSurfer.create({
          container: this.$refs[`waveform${sampleNumber}`],
          waveColor: '#a3cef1',
          progressColor: '#4361ee',
          height: 80,
        });

        // イベントリスナーの設定
        wavesurfer.on('error', (error) => {
          this.handleError(`サンプル${sampleNumber}の読み込みに失敗しました`, error);
        });

        wavesurfer.on('loading', () => {
          this.error = null;
          this.isLoading = true;
        });

        wavesurfer.on('ready', () => {
          this.error = null;
          this.isLoading = false;
          wavesurfer.setVolume(this.volumes[sampleNumber]);
        });

        wavesurfer.on('play', () => {
          this.isPlaying = true;
        });

        wavesurfer.on('pause', () => {
          this.isPlaying = false;
        });

        wavesurfer.on('finish', () => {
          this.isPlaying = false;
        });

        this.wavesurfers[sampleNumber] = wavesurfer;
      });
    },

    /**
     * @function loadAudioFiles
     * @description 音声ファイルをロードする
     */
    async loadAudioFiles() {
      try {
        this.isLoading = true;

        for (let sampleNumber of [1, 2]) {
          const response = await fetch(`/sample${sampleNumber}.wav`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          this.wavesurfers[sampleNumber].loadBlob(blob);
        }
      } catch (error) {
        this.handleError('音声ファイルの読み込みに失敗しました', error);
      }
    },

    /**
     * @function handleError
     * @description エラーを処理する
     * @param {string} message - エラーメッセージ
     * @param {Error} error - エラーオブジェクト
     */
    handleError(message, error) {
      this.error = `${message}: ${error.message}`;
      this.isLoading = false;
      console.error(`AudioPlayer.vue: ${message}`, error);
    },

    /**
     * @function playFromStart
     * @description 両方のサンプルを最初から再生する
     */
    playFromStart() {
      try {
        if (this.wavesurfers[1] && this.wavesurfers[2]) {
          // 両方のサンプルを最初に戻す
          this.wavesurfers[1].seekTo(0);
          this.wavesurfers[2].seekTo(0);
          // 再生を開始
          this.wavesurfers[1].play();
          this.wavesurfers[2].play();
        }
      } catch (error) {
        this.handleError('再生に失敗しました', error);
      }
    },

    /**
     * @function updateVolume
     * @description 指定したサンプルの音量を更新する
     * @param {number} sampleNumber - サンプル番号（1または2）
     */
    updateVolume(sampleNumber) {
      try {
        const wavesurfer = this.wavesurfers[sampleNumber];
        const volume = this.volumes[sampleNumber];
        if (wavesurfer) {
          wavesurfer.setVolume(volume);
        }
      } catch (error) {
        this.handleError('音量の調整に失敗しました', error);
      }
    },

    /**
     * @function resetVolume
     * @description 指定したサンプルの音量を初期値（0.5）にリセットする
     * @param {number} sampleNumber - サンプル番号（1または2）
     */
    resetVolume(sampleNumber) {
      try {
        this.volumes[sampleNumber] = 0.5;
        this.updateVolume(sampleNumber);
      } catch (error) {
        this.handleError('音量のリセットに失敗しました', error);
      }
    },

    /**
     * @function startDragging
     * @description ノブのドラッグを開始する
     * @param {number} knobNumber - ノブ番号（1または2）
     * @param {MouseEvent} event - マウスイベント
     */
    startDragging(knobNumber, event) {
      this.isDragging = true;
      this.currentKnob = knobNumber;
      this.startY = event.clientY;
      this.startVolume = this.volumes[knobNumber];
      document.body.style.cursor = 'pointer';
    },

    /**
     * @function handleDrag
     * @description ノブのドラッグ中の処理
     * @param {number} knobNumber - ノブ番号（1または2）
     * @param {MouseEvent} event - マウスイベント
     */
    handleDrag(knobNumber, event) {
      if (!this.isDragging || this.currentKnob !== knobNumber) return;

      // ドラッグ量を計算（ピクセル単位）
      const deltaY = this.startY - event.clientY;
      
      // ドラッグ量を音量の変化量に変換（感度調整用の係数）
      const sensitivity = 0.002;
      const volumeDelta = deltaY * sensitivity;
      
      // 新しい音量を計算（0-1の範囲に制限）
      const newVolume = Math.max(0, Math.min(1, this.startVolume + volumeDelta));

      // 音量を更新
      this.volumes[knobNumber] = newVolume;
      this.updateVolume(knobNumber);
    },

    /**
     * @function handleDocumentMouseMove
     * @description ドキュメント全体のマウス移動を処理
     * @param {MouseEvent} event - マウスイベント
     */
    handleDocumentMouseMove(event) {
      if (this.isDragging && this.currentKnob) {
        document.body.style.cursor = 'pointer';
        this.handleDrag(this.currentKnob, event);
      }
    },

    /**
     * @function handleDocumentMouseUp
     * @description ドキュメント全体のマウスボタン解放を処理
     */
    handleDocumentMouseUp() {
      if (this.isDragging) {
        document.body.style.cursor = '';
        this.isDragging = false;
        this.currentKnob = null;
      }
    },

    /**
     * @function handleKeyDown
     * @description キーボードイベントを処理する
     * @param {KeyboardEvent} event - キーボードイベント
     */
    handleKeyDown(event) {
      // スペースキーが押された場合
      if (event.code === 'Space') {
        // デフォルトのスクロール動作を防止
        event.preventDefault();
        
        // 再生ボタンと同じ動作を実行
        this.playFromStart();
      }
    },
  },
  beforeUnmount() {
    // wavesurfer.jsのインスタンスを破棄
    Object.values(this.wavesurfers).forEach(wavesurfer => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    });

    // イベントリスナーを削除
    document.removeEventListener('mousemove', this.handleDocumentMouseMove);
    document.removeEventListener('mouseup', this.handleDocumentMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
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
</style>
