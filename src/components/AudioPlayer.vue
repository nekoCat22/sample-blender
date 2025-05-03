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
        <div class="knob-label">Volume</div>
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
          <div class="knob-label">Volume</div>
        </div>
        <div class="knob-container">
          <div 
            class="knob" 
            @dblclick="resetTiming"
            @mousedown="startDragging('timing', $event)"
            @mousemove="handleDrag('timing', $event)"
            @mouseup="handleDocumentMouseUp"
          >
            <div class="knob-dial" :style="{ transform: `rotate(${(timing + 0.5) * 270 - 135}deg)` }"></div>
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
          <div class="knob-label">Master Volume</div>
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
      masterVolume: 0.8,
      isDragging: false,
      currentKnob: null,
      startY: 0,
      startVolume: 0,
      meterLevel: -60, // メーターの初期値（-60dB）
      meterInterval: null, // メーター更新用のインターバル
      volumeUpdateTimeout: null, // 音量更新用のタイムアウト
      timing: 0, // タイミング調整値（-0.5秒から+0.5秒）
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

      // メーターの更新を開始
      this.startMeterUpdate();
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
      this.isPlaying = false;
      this.stopMeterUpdate();
      console.error(`AudioPlayer.vue: ${message}`, error);
    },

    /**
     * @function resetPlayback
     * @description 両方のサンプルの再生をリセットする
     */
    resetPlayback() {
      [1, 2].forEach(sampleNumber => {
        if (this.wavesurfers[sampleNumber]) {
          this.wavesurfers[sampleNumber].stop();
          this.wavesurfers[sampleNumber].seekTo(0);
        }
      });
    },

    /**
     * @function playFromStart
     * @description 両方のサンプルを最初から再生する
     */
    playFromStart() {
      try {
        if (this.wavesurfers[1] && this.wavesurfers[2]) {
          // 再生をリセット
          this.resetPlayback();
          
          if (this.timing < 0) {
            // サンプル2を先に再生
            this.wavesurfers[2].play();
            // サンプル1の再生を遅延
            setTimeout(() => {
              this.wavesurfers[1].play();
            }, -this.timing * 1000);
          } else if (this.timing > 0) {
            // サンプル1を先に再生
            this.wavesurfers[1].play();
            // サンプル2の再生を遅延
            setTimeout(() => {
              this.wavesurfers[2].play();
            }, this.timing * 1000);
          } else {
            // 同時に再生
            this.wavesurfers[1].play();
            this.wavesurfers[2].play();
          }
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
          // マスターボリュームを考慮した音量を設定
          wavesurfer.setVolume(volume * this.masterVolume);
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
     * @function handleDrag
     * @description ノブのドラッグ中の処理
     * @param {number|string} knobNumber - ノブ番号（1または2、または'master'、または'timing'）
     * @param {MouseEvent} event - マウスイベント
     */
    handleDrag(knobNumber, event) {
      if (!this.isDragging || this.currentKnob !== knobNumber) return;

      // ドラッグ量を計算（ピクセル単位）
      const deltaY = this.startY - event.clientY;
      
      // ドラッグ量を値の変化量に変換（感度調整用の係数）
      const sensitivity = 0.001;
      const valueDelta = deltaY * sensitivity;
      
      if (knobNumber === 'timing') {
        // タイミング調整（-0.5秒から+0.5秒）
        const newTiming = Math.max(-0.5, Math.min(0.5, this.startVolume + valueDelta));
        this.timing = newTiming;
      } else if (knobNumber === 'master') {
        // マスターボリュームの処理
        const newVolume = Math.max(0, Math.min(1, this.startVolume + valueDelta));
        this.masterVolume = newVolume;
        // ドラッグ中は更新を抑える
        if (!this.volumeUpdateTimeout) {
          this.volumeUpdateTimeout = setTimeout(() => {
            this.updateVolume(1);
            this.updateVolume(2);
            this.volumeUpdateTimeout = null;
          }, 100);
        }
      } else {
        // 個別のボリューム処理
        const newVolume = Math.max(0, Math.min(1, this.startVolume + valueDelta));
        this.volumes[knobNumber] = newVolume;
        // ドラッグ中は更新を抑える
        if (!this.volumeUpdateTimeout) {
          this.volumeUpdateTimeout = setTimeout(() => {
            this.updateVolume(knobNumber);
            this.volumeUpdateTimeout = null;
          }, 100);
        }
      }
    },

    /**
     * @function startDragging
     * @description ノブのドラッグを開始する
     * @param {number|string} knobNumber - ノブ番号（1または2、または'master'、または'timing'）
     * @param {MouseEvent} event - マウスイベント
     */
    startDragging(knobNumber, event) {
      this.isDragging = true;
      this.currentKnob = knobNumber;
      this.startY = event.clientY;
      if (knobNumber === 'timing') {
        this.startVolume = this.timing;
      } else if (knobNumber === 'master') {
        this.startVolume = this.masterVolume;
      } else {
        this.startVolume = this.volumes[knobNumber];
      }
      document.body.style.cursor = 'pointer';
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
        
        // ドラッグ終了時に確実に音量を更新
        if (this.volumeUpdateTimeout) {
          clearTimeout(this.volumeUpdateTimeout);
          this.volumeUpdateTimeout = null;
        }
        if (this.currentKnob === 'master') {
          this.updateVolume(1);
          this.updateVolume(2);
        } else if (typeof this.currentKnob === 'number') {
          this.updateVolume(this.currentKnob);
        }
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

    /**
     * @function resetMasterVolume
     * @description マスターボリュームを初期値（0.8）にリセットする
     */
    resetMasterVolume() {
      try {
        this.masterVolume = 0.8;
        // 両方のサンプルの音量を更新
        this.updateVolume(1);
        this.updateVolume(2);
      } catch (error) {
        this.handleError('マスターボリュームのリセットに失敗しました', error);
      }
    },

    /**
     * @function startMeterUpdate
     * @description メーターの更新を開始する
     */
    startMeterUpdate() {
      // 60fpsでメーターを更新
      this.meterInterval = setInterval(() => {
        if (this.isPlaying) {
          // 両方のサンプルの音量を取得して合成
          const level1 = this.wavesurfers[1].getVolume() || 0;
          const level2 = this.wavesurfers[2].getVolume() || 0;
          // 合成した音量をdBに変換（簡易的な計算）
          this.meterLevel = 20 * Math.log10((level1 + level2) / 2);
        } else {
          // 再生中でない場合は最小値に
          this.meterLevel = -60;
        }
      }, 1000 / 60);
    },

    /**
     * @function stopMeterUpdate
     * @description メーターの更新を停止する
     */
    stopMeterUpdate() {
      if (this.meterInterval) {
        clearInterval(this.meterInterval);
        this.meterInterval = null;
      }
    },

    /**
     * @function updateTiming
     * @description サンプル2のタイミングを更新する
     */
    updateTiming() {
      try {
        if (this.wavesurfers[2]) {
          // 現在の再生位置を取得
          const currentTime = this.wavesurfers[2].getCurrentTime();
          // タイミング調整を適用
          this.wavesurfers[2].seekTo(Math.max(0, currentTime + this.timing));
        }
      } catch (error) {
        this.handleError('タイミングの調整に失敗しました', error);
      }
    },

    /**
     * @function resetTiming
     * @description タイミングを初期値（0秒）にリセットする
     */
    resetTiming() {
      try {
        this.timing = 0;
        if (this.isPlaying) {
          this.updateTiming();
        }
      } catch (error) {
        this.handleError('タイミングのリセットに失敗しました', error);
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

    // メーターの更新を停止
    this.stopMeterUpdate();
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
</style>
