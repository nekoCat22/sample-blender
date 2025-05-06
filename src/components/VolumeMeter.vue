/**
 * @file VolumeMeter.vue
 * @brief 音量メーターを表示するVueコンポーネント
 * @details
 * - 音量レベルを視覚的に表示
 * - 警告域と危険域の表示機能
 * - スムーズなアニメーション効果
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
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'VolumeMeter',
  props: {
    /**
     * 音量レベル（dB）
     * @type {number}
     */
    level: {
      type: Number,
      required: true,
      default: -60
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