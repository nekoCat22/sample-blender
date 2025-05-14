/**
 * @file player.ts
 * @brief 音声プレイヤーで使用する型定義
 */

import { WaveSurferInstance } from './wavesurfer';
import { Knob, Error } from './common';

/**
 * プレイヤーの状態
 */
export interface PlayerState {
  wavesurfers: {
    [key: number]: WaveSurferInstance | null;
  };
  isPlaying: boolean;
  error: string | null;
  isLoading: boolean;
  volumes: {
    [key: number]: number;
  };
  masterVolume: number;
  isDragging: boolean;
  currentKnob: Knob | null;
  startY: number;
  startVolume: number;
  meterLevel: number;
  meterInterval: number | null;
  volumeUpdateTimeout: number | null;
  timing: {
    [key: number]: number;
  };
  isSample3Enabled: boolean;
}

/**
 * プレイヤーのエラー
 */
export interface PlayerError extends Error {} 