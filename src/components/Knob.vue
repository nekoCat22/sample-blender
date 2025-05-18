/**
 * @file Knob.vue
 * @brief 回転式ノブコンポーネント
 * @details
 * - マウスドラッグによる値の調整
 * - ダブルクリックによるリセット機能
 * - カスタマイズ可能な回転範囲と初期オフセット
 * - 無効化状態のサポート
 * - スムーズなアニメーション
 * - 2行のラベル表示機能（AudioPlayer.vueから渡されたデータを表示するだけ）
 * - マウスホイールによる値の調整
 */

<template>
  <div 
    class="knob-container"
    :class="{ 'disabled': isDisabled }"
  >
    <div 
      class="knob" 
      @dblclick="handleDoubleClick"
      @mousedown="startDrag"
      @mousemove="handleDrag"
      @mouseup="stopDrag"
      @wheel="handleWheel"
    >
      <div class="knob-dial" :style="{ transform: `rotate(${rotation}deg)` }"></div>
    </div>
    <div class="knob-labels">
      <div class="knob-label">{{ label }}</div>
      <div class="knob-sub-label">{{ subLabel }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onBeforeUnmount } from 'vue';

interface KnobProps {
  label: string;
  subLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  rotationRange: number;
  initialRotationOffset: number;
  isDisabled: boolean;
}

export default defineComponent({
  name: 'Knob',
  props: {
    label: {
      type: String,
      required: true
    },
    subLabel: {
      type: String,
      default: ''
    },
    value: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 1
    },
    step: {
      type: Number,
      default: 0.01
    },
    rotationRange: {
      type: Number,
      default: 270 // デフォルトの回転範囲
    },
    initialRotationOffset: {
      type: Number,
      default: -135 // デフォルトの初期オフセット
    },
    isDisabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:value', 'reset'],
  setup(props: KnobProps, { emit }) {
    const isDragging = ref(false);
    const startY = ref(0);
    const startX = ref(0);
    const startValue = ref(0);

    const rotation = computed(() => {
      const normalizedValue = (props.value - props.min) / (props.max - props.min);
      return normalizedValue * props.rotationRange + props.initialRotationOffset;
    });

    const handleDoubleClick = () => {
      if (props.isDisabled) return;
      emit('reset');
    };

    const startDrag = (event: MouseEvent) => {
      if (props.isDisabled) return;
      event.preventDefault();
      isDragging.value = true;
      startY.value = event.clientY;
      startX.value = event.clientX;
      startValue.value = props.value;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'pointer';
    };

    const handleDrag = (event: MouseEvent) => {
      if (!isDragging.value) return;
      event.preventDefault();
      const deltaY = startY.value - event.clientY;
      const deltaX = event.clientX - startX.value;
      const sensitivity = 0.005;
      
      let newValue = startValue.value;
      newValue += deltaY * sensitivity * (props.max - props.min);
      newValue += deltaX * sensitivity * (props.max - props.min);
      
      newValue = Math.max(props.min, Math.min(props.max, newValue));
      emit('update:value', parseFloat(newValue.toFixed(3)));
    };

    const stopDrag = () => {
      if (isDragging.value) {
        isDragging.value = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isDragging.value) {
        handleDrag(event);
      }
    };

    const onMouseUp = () => {
      stopDrag();
    };

    const handleWheel = (event: WheelEvent) => {
      if (props.isDisabled) return;
      event.preventDefault();
      
      const wheelSensitivity = 0.0001
      const delta = -event.deltaY * wheelSensitivity * (props.max - props.min);
      let newValue = props.value + delta;
      
      newValue = Math.max(props.min, Math.min(props.max, newValue));
      emit('update:value', parseFloat(newValue.toFixed(3)));
    };

    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    });

    return {
      rotation,
      startDrag,
      handleDrag,
      stopDrag,
      handleDoubleClick,
      handleWheel
    };
  }
});
</script>

<style scoped>
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

.knob-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2em;
}

.knob-label {
  font-size: 0.8em;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.knob-sub-label {
  font-size: 0.7em;
  color: #4361ee;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.knob-container.disabled .knob {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 