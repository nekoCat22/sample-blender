/**
 * @file audioConstants.ts
 * @brief 音声処理に関する定数を定義するファイル
 * @details
 * - ピッチ、タイミング、ボリュームなどの音声パラメータの範囲を定義
 * - Web Audio APIの実際のパラメータ範囲に変換するための定数
 */

// ピッチ関連の定数
export const PITCH_MIN_RATE = 0.5;  // 最小再生速度（半速）
export const PITCH_MAX_RATE = 2.0;  // 最大再生速度（2倍速）
export const PITCH_DEFAULT_RATE = 1.0;  // デフォルト再生速度（通常速度）

// タイミング関連の定数
export const TIMING_MAX_DELAY_SECONDS = 0.5;  // 最大遅延時間（秒）

// ボリューム関連の定数
export const VOLUME_MIN = 0.0;  // 最小音量
export const VOLUME_MAX = 1.0;  // 最大音量
export const VOLUME_DEFAULT = 1.0;  // デフォルト音量

// チャンネル関連の定数
export const CHANNEL_IDS = [1, 2, 3] as const;  // 利用可能なチャンネルID
export type ChannelId = typeof CHANNEL_IDS[number];  // チャンネルIDの型 