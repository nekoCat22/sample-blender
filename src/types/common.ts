/**
 * @file common.ts
 * @brief 共通で使用する型定義
 */

/**
 * ノブの種類
 */
export type Knob = number | 'master' | 'timing2' | 'timing3';

/**
 * エラー情報
 */
export interface Error {
  message: string;
  error: Error;
} 