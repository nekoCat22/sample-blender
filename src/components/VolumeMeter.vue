/**
 * @file VolumeMeter.vue
 * @brief 音量メーターを表示するVueコンポーネント
 * @details
 * - 音量レベルを視覚的に表示
 * - 警告域と危険域の表示機能
 * - スムーズなアニメーション効果
 * - 音量レベルの自動更新機能
 * @limitations
 * - 入力値は-60dBから0dBの範囲を想定
 */

<template>
  <div class="meter-container">
    <div class="meter">
      <div 
        class="meter-level" 
        :style="{ width: `${Math.max(0, Math.min(100, (level + 60) * (100/60)))}%` }"
        :class="{ 
          'meter-level--warning': level > -12,
          'meter-level--danger': level > -6
        }"
      ></div>
      <div class="meter-danger-line"></div>
    </div>
    <div class="meter-label">Level</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { AudioEngine } from '../core/AudioEngine'

export default defineComponent({
  name: 'VolumeMeter',
  props: {
    /**
     * 音声エンジンのインスタンス
     * @type {AudioEngine}
     */
    audioEngine: {
      type: Object as () => AudioEngine,
      required: true
    },
    /**
     * 再生中かどうか
     * @type {boolean}
     */
    isPlaying: {
      type: Boolean,
      required: true
    }
  },
  setup(props) {
    const level = ref(-60)
    const meterInterval = ref<number | null>(null)

    /**
     * メーターの更新を開始する
     */
    const startMeterUpdate = (): void => {
      meterInterval.value = window.setInterval(() => {
        if (props.isPlaying) {
          const level1 = props.audioEngine.getSampleVolume('1')
          const level2 = props.audioEngine.getSampleVolume('2')
          const level3 = props.audioEngine.getSampleVolume('3')
          level.value = 20 * Math.log10((level1 + level2 + level3) / 3)
        } else {
          level.value = -60
        }
      }, 1000 / 60)
    }

    /**
     * メーターの更新を停止する
     */
    const stopMeterUpdate = (): void => {
      if (meterInterval.value) {
        clearInterval(meterInterval.value)
        meterInterval.value = null
      }
    }

    // 再生状態が変更されたときにメーターの更新を制御
    watch(() => props.isPlaying, (newValue) => {
      if (newValue) {
        startMeterUpdate()
      } else {
        stopMeterUpdate()
        level.value = -60
      }
    })

    onMounted(() => {
      if (props.isPlaying) {
        startMeterUpdate()
      }
    })

    onBeforeUnmount(() => {
      stopMeterUpdate()
    })

    return {
      level
    }
  }
})
</script>

<style scoped>
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
  background: #4CAF50;
  transition: width 0.05s ease-out;
}

.meter-level--warning {
  background: #FFC107;
}

.meter-level--danger {
  background: #F44336;
}

.meter-danger-line {
  position: absolute;
  top: 0;
  left: 90%;
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