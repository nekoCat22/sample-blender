/**
 * @file wavesurfer.ts
 * @brief WaveSurfer.jsで使用する型定義
 */

/**
 * WaveSurfer.jsの設定オプション
 */
export interface WaveSurferConfig {
  container: HTMLElement;
  waveColor: string;
  progressColor: string;
  height: number;
  minPxPerSec: number;
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
 * WaveSurfer.jsのインスタンス
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