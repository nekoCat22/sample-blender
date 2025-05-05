/**
 * @file GainEffect.ts
 * @brief ゲインエフェクトクラス
 * @details
 * - 音量の調整（0.0から1.0）
 * - ミュート機能
 * - デフォルト値へのリセット機能
 */

import { AudioEngine } from '@/core/AudioEngine';
import { BaseEffect } from './base/BaseEffect';

export class GainEffect extends BaseEffect {
  private static readonly DEFAULT_GAIN = 0.5;
  private gain: number = GainEffect.DEFAULT_GAIN;

  constructor(audioEngine: AudioEngine) {
    super(audioEngine);
    this.input.connect(this.output);
    this.setGain(this.gain);
    this.isEnabled = true;
  }

  public enable(): void {
    this.checkState();
    if (!this.isEnabled) {
      this.setGain(this.gain);
      this.isEnabled = true;
    }
  }

  public disable(): void {
    this.checkState();
    if (this.isEnabled) {
      this.setGain(0);
      this.isEnabled = false;
    }
  }

  public setParameter(param: string, value: number): void {
    this.checkState();
    if (param !== 'gain') {
      throw new Error('無効なパラメータです: ' + param);
    }
    if (value < 0 || value > 1) {
      throw new Error('ゲインは0から1の間で指定してください');
    }
    this.gain = value;
    if (this.isEnabled) {
      this.setGain(this.gain);
    }
  }

  public getParameter(param: string): number {
    this.checkState();
    if (param !== 'gain') {
      throw new Error('無効なパラメータです: ' + param);
    }
    return this.gain;
  }

  public reset(): void {
    this.checkState();
    this.gain = GainEffect.DEFAULT_GAIN;
    if (this.isEnabled) {
      this.setGain(this.gain);
    }
  }

  private setGain(value: number): void {
    if (this.output && this.output.gain) {
      this.output.gain.value = value;
    }
  }
} 