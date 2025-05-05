/**
 * @file audio.ts
 * @brief 音声プレイヤーで使用する型定義
 */

/**
 * WaveSurfer.jsのオプション型
 */
export interface WaveSurferOptions {
  container: HTMLElement;
  waveColor: string;
  progressColor: string;
  height: number;
  minPxPerSec: number;
  partialRender: boolean;
  normalize: boolean;
  responsive: boolean;
  cursorColor: string;
  cursorWidth: number;
  barWidth: number;
  barGap: number;
  barRadius: number;
  interact: boolean;
  hideScrollbar: boolean;
  autoCenter: boolean;
}

/**
 * WaveSurfer.jsのインスタンス型
 */
export interface WaveSurferInstance {
  on: (event: string, callback: (error?: Error) => void) => void;
  loadBlob: (blob: Blob) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  getCurrentTime: () => number;
  destroy: () => void;
}

/**
 * 音声プレイヤーの状態型
 */
export interface AudioPlayerState {
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
  currentKnob: KnobType | null;
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
 * ノブの種類を表す型
 */
export type KnobType = number | 'master' | 'timing2' | 'timing3';

/**
 * 音声プレイヤーのエラー型
 */
export interface AudioError {
  message: string;
  error: Error;
} 