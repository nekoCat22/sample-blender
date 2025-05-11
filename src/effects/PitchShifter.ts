/**
 * @file PitchShifter.ts
 * @brief ピッチシフターエフェクトの実装
 * @details
 * - 音声のピッチを変更するエフェクト
 * - OscillatorNodeを使用してピッチを制御
 * - ピッチの倍率を0.5〜2.0の範囲で調整可能
 * - エフェクトの有効/無効を切り替え可能
 */

import { BaseEffect } from './base/BaseEffect';

export class PitchShifter extends BaseEffect {
  private oscillator: OscillatorNode;
  private pitchGain: GainNode;
  private pitch: number;

  // 定数
  private readonly MIN_PITCH = 0.5;  // 最低ピッチ倍率
  private readonly MAX_PITCH = 2.0;  // 最高ピッチ倍率
  private readonly DEFAULT_PITCH = 1.0;  // デフォルトのピッチ倍率

  /**
   * @brief ピッチシフターのコンストラクタ
   * @param context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    super(context);
    this.oscillator = this.context.createOscillator();
    this.pitchGain = this.context.createGain();
    this.pitch = this.DEFAULT_PITCH;

    // パラメータの登録
    this.parameters.set('pitch', this.oscillator.frequency);

    // 初期接続設定
    this.setupConnections();
  }

  /**
   * @brief 入出力の接続を設定
   */
  private setupConnections(): void {
    // 入力 → ピッチシフター → 出力
    this.input.connect(this.oscillator);
    this.oscillator.connect(this.pitchGain);
    this.pitchGain.connect(this.output);

    // オシレーターを開始
    this.oscillator.start();
  }

  /**
   * @brief ピッチシフターを有効にする
   */
  public enable(): void {
    this.setEnabled(true);
  }

  /**
   * @brief ピッチシフターを無効にする
   */
  public disable(): void {
    this.setEnabled(false);
  }

  /**
   * @brief パラメータを設定
   * @param param - パラメータ名
   * @param value - パラメータ値
   */
  public setParameter(param: string, value: number): void {
    if (param === 'pitch') {
      this.setPitch(value);
    } else {
      throw new Error(`無効なパラメータ名です: ${param}`);
    }
  }

  /**
   * @brief パラメータを取得
   * @param param - パラメータ名
   * @returns パラメータ値
   */
  public getParameter(param: string): number {
    if (param === 'pitch') {
      return this.pitch;
    }
    throw new Error(`無効なパラメータ名です: ${param}`);
  }

  /**
   * @brief ピッチシフターの有効/無効を切り替え
   * @param enabled - ピッチシフターを有効にするかどうか
   */
  private setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.pitchGain.gain.value = enabled ? 1 : 0;
  }

  /**
   * @brief ピッチを設定
   * @param value - ピッチの倍率（0.5〜2.0）
   */
  public setPitch(value: number): void {
    if (value < this.MIN_PITCH || value > this.MAX_PITCH) {
      throw new Error(`ピッチは${this.MIN_PITCH}から${this.MAX_PITCH}の範囲で指定してください`);
    }
    this.pitch = value;
    this.oscillator.frequency.value = value;
  }

  /**
   * @brief ピッチシフターの状態を取得
   * @returns ピッチシフターの状態
   */
  public getState(): { pitch: number; enabled: boolean } {
    return {
      pitch: this.pitch,
      enabled: this.isEnabled
    };
  }

  /**
   * @brief ピッチシフターの設定をリセット
   */
  public reset(): void {
    this.pitch = this.DEFAULT_PITCH;
    this.oscillator.frequency.value = this.DEFAULT_PITCH;
    this.setEnabled(false);
  }

  /**
   * @brief ピッチシフターを破棄
   */
  public dispose(): void {
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.pitchGain.disconnect();
    super.dispose();
  }
} 