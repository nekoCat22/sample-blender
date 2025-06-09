/**
 * @file Filter.ts
 * @brief オーディオフィルターの実装
 * @details
 * - ローパスフィルターとハイパスフィルターの実装
 * - 0-1の値に応じてフィルターの種類とカットオフ周波数を制御
 * - 0.45-0.55の範囲ではフィルターをバイパス
 * - 0-0.45でローパス、0.55-1.0でハイパスとして動作
 * - 周波数の変化は対数カーブを使用
 * @limitations
 * - カットオフ周波数は20Hz〜20000Hzの範囲に制限
 */

import { BaseEffect } from './base/BaseEffect';

export class Filter extends BaseEffect {
  private filter: BiquadFilterNode;
  private filterGain: GainNode;  // フィルターパス用のゲイン
  private bypassGain: GainNode;  // バイパスパス用のゲイン
  private filterValue: number;  // フィルター値（0-1）

  // 定数
  private readonly MIN_FREQUENCY = 20;    // 最低周波数（Hz）
  private readonly MAX_FREQUENCY = 20000; // 最高周波数（Hz）
  private readonly BYPASS_MIN = 0.45;     // バイパス範囲の最小値
  private readonly BYPASS_MAX = 0.55;     // バイパス範囲の最大値

  /**
   * @brief バイパス範囲を取得
   * @returns バイパス範囲
   */
  public getBypassRange(): { min: number; max: number } {
    return { min: this.BYPASS_MIN, max: this.BYPASS_MAX };
  }

  /**
   * @brief フィルターのコンストラクタ
   * @param context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    super(context);
    this.filter = this.context.createBiquadFilter();
    this.filterGain = this.context.createGain();
    this.bypassGain = this.context.createGain();
    this.filterValue = 0.5;  // 初期値は0.5（フィルターOFF）

    // フィルターの初期設定
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 1;

    // パラメータの登録
    this.parameters.set('frequency', this.filter.frequency);
    this.parameters.set('Q', this.filter.Q);

    // 初期接続設定
    this.setupConnections();
  }

  /**
   * @brief 入出力の接続を設定
   */
  private setupConnections(): void {
    // フィルターパス: input → filter → filterGain → output
    this.input.connect(this.filter);
    this.filter.connect(this.filterGain);
    this.filterGain.connect(this.output);

    // バイパスパス: input → bypassGain → output
    this.input.connect(this.bypassGain);
    this.bypassGain.connect(this.output);

    // 初期状態ではバイパスを有効化
    this.filterGain.gain.value = 0;
    this.bypassGain.gain.value = 1;
  }

  /**
   * @brief フィルターを有効にする
   */
  public enable(): void {
    this.checkState();
    this.isEnabled = true;
    this.filterGain.gain.setTargetAtTime(1, this.context.currentTime, 0.01);
    this.bypassGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
  }

  /**
   * @brief フィルターを無効にする
   */
  public disable(): void {
    this.checkState();
    this.isEnabled = false;
    this.filterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.01);
    this.bypassGain.gain.setTargetAtTime(1, this.context.currentTime, 0.01);
  }

  /**
   * @brief パラメータを設定
   * @param param - パラメータ名
   * @param value - パラメータ値
   */
  public setParameter(param: string, value: number): void {
    this.checkState();
    const audioParam = this.parameters.get(param);
    if (!audioParam) {
      throw new Error(`無効なパラメータ名です: ${param}`);
    }
    audioParam.value = value;
  }

  /**
   * @brief パラメータを取得
   * @param param - パラメータ名
   * @returns パラメータ値
   */
  public getParameter(param: string): number {
    this.checkState();
    const audioParam = this.parameters.get(param);
    if (!audioParam) {
      throw new Error(`無効なパラメータ名です: ${param}`);
    }
    return audioParam.value;
  }

  /**
   * @brief フィルターの有効/無効を切り替え
   * @param enabled - フィルターを有効にするかどうか
   */
  private setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      // フィルターを有効化
      this.filterGain.gain.value = 1;
      this.bypassGain.gain.value = 0;
    } else {
      // バイパスを有効化
      this.filterGain.gain.value = 0;
      this.bypassGain.gain.value = 1;
    }
  }

  /**
   * @brief フィルターの設定を更新
   * @param value - フィルター値（0-1）
   */
  public updateEffect(value: number): void {
    this.checkState();
    if (value < 0 || value > 1) {
      throw new Error('フィルター値は0から1の範囲で指定してください');
    }
    this.filterValue = value;

    if (this.filterValue >= this.BYPASS_MIN && this.filterValue <= this.BYPASS_MAX) {
      // バイパス範囲内ではフィルターをバイパス
      this.setEnabled(false);
      return;
    }

    // フィルターを有効にする
    this.setEnabled(true);

    if (this.filterValue < this.BYPASS_MIN) {
      // 0-0.45の範囲：ローパスフィルター
      this.setFilterType('lowpass');
      // 0-0.45の範囲を0-1に正規化
      const normalizedValue = this.filterValue / this.BYPASS_MIN;
      // 対数カーブを適用して周波数を計算
      const logValue = Math.pow(10, normalizedValue * 3);
      const frequency = this.MIN_FREQUENCY + (this.MAX_FREQUENCY - this.MIN_FREQUENCY) * (logValue - 1) / 999;
      this.setCutoffFrequency(frequency);
    } else {
      // 0.55-1.0の範囲：ハイパスフィルター
      this.setFilterType('highpass');
      // 0.55-1.0の範囲を0-1に正規化
      const normalizedValue = (this.filterValue - this.BYPASS_MAX) / (1 - this.BYPASS_MAX);
      // 対数カーブを適用して周波数を計算
      const logValue = Math.pow(10, normalizedValue * 3);
      const frequency = this.MIN_FREQUENCY + (this.MAX_FREQUENCY - this.MIN_FREQUENCY) * (logValue - 1) / 999;
      this.setCutoffFrequency(frequency);
    }
  }

  /**
   * @brief カットオフ周波数を設定
   * @param frequency - カットオフ周波数（Hz）
   */
  setCutoffFrequency(frequency: number): void {
    if (frequency < this.MIN_FREQUENCY || frequency > this.MAX_FREQUENCY) {
      throw new Error(`カットオフ周波数は${this.MIN_FREQUENCY}Hzから${this.MAX_FREQUENCY}Hzの範囲で指定してください`);
    }
    this.setParameter('frequency', frequency);
  }

  /**
   * @brief フィルターの種類を設定
   * @param type - フィルターの種類
   */
  setFilterType(type: BiquadFilterType): void {
    this.filter.type = type;
  }

  /**
   * @brief フィルターの状態を取得
   * @returns フィルターの状態
   */
  getState(): { filterValue: number; frequency: number; type: BiquadFilterType } {
    return {
      filterValue: this.filterValue,
      frequency: this.getParameter('frequency'),
      type: this.filter.type
    };
  }

  /**
   * @brief フィルターの設定をリセット
   */
  reset(): void {
    this.filterValue = 0.5;
    this.filter.type = 'lowpass';
    this.setParameter('frequency', 1000);
    this.setParameter('Q', 1);
    this.setEnabled(false);  // リセット時にフィルターを無効にする
  }

  /**
   * @brief フィルターを破棄
   */
  dispose(): void {
    this.filter.disconnect();
    this.filterGain.disconnect();
    this.bypassGain.disconnect();
    super.dispose();
  }
} 