/**
 * @file Filter.ts
 * @brief オーディオフィルターの実装
 * @details
 * - ローパスフィルターとハイパスフィルターの実装
 * - ノブの回転角度に応じてフィルターの種類とカットオフ周波数を制御
 * - 0度の時はフィルターをバイパス
 * - 負の角度でローパス、正の角度でハイパスとして動作
 * @limitations
 * - カットオフ周波数は20Hz〜20000Hzの範囲に制限
 */

import { BaseEffect } from './base/BaseEffect';

export class Filter extends BaseEffect {
  private filter: BiquadFilterNode;
  private filterGain: GainNode;  // フィルターパス用のゲイン
  private bypassGain: GainNode;  // バイパスパス用のゲイン
  private knobAngle: number;  // ノブの回転角度（-135度〜135度）

  // 定数
  private readonly MIN_FREQUENCY = 20;    // 最低周波数（Hz）
  private readonly MAX_FREQUENCY = 20000; // 最高周波数（Hz）
  private readonly MIN_ANGLE = -135;      // 最小角度（度）
  private readonly MAX_ANGLE = 135;       // 最大角度（度）

  /**
   * @brief フィルターのコンストラクタ
   * @param context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    super(context);
    this.filter = this.context.createBiquadFilter();
    this.filterGain = this.context.createGain();
    this.bypassGain = this.context.createGain();
    this.knobAngle = 0;  // 初期値は0度（フィルターOFF）

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
    this.setEnabled(true);
  }

  /**
   * @brief フィルターを無効にする
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
   * @brief ノブの回転角度を設定
   * @param angle - ノブの回転角度（-135度〜135度）
   */
  setKnobAngle(angle: number): void {
    if (angle < this.MIN_ANGLE || angle > this.MAX_ANGLE) {
      throw new Error(`ノブの回転角度は${this.MIN_ANGLE}度から${this.MAX_ANGLE}度の範囲で指定してください`);
    }
    this.knobAngle = angle;
    this.updateFilter();
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
  getState(): { knobAngle: number; frequency: number; type: BiquadFilterType } {
    return {
      knobAngle: this.knobAngle,
      frequency: this.getParameter('frequency'),
      type: this.filter.type
    };
  }

  /**
   * @brief フィルターの設定をリセット
   */
  reset(): void {
    this.knobAngle = 0;
    this.filter.type = 'lowpass';
    this.setParameter('frequency', 1000);
    this.setParameter('Q', 1);
    this.setEnabled(false);  // リセット時にフィルターを無効にする
  }

  /**
   * @brief フィルターの設定を更新
   */
  private updateFilter(): void {
    if (this.knobAngle === 0) {
      // 0度の時はフィルターをバイパス
      this.setEnabled(false);
      return;
    }

    // フィルターを有効にする
    this.setEnabled(true);

    // 角度に応じてフィルターの種類を設定
    if (this.knobAngle < 0) {
      // 負の角度でローパス
      this.setFilterType('lowpass');
    } else {
      // 正の角度でハイパス
      this.setFilterType('highpass');
    }

    // 角度の絶対値に応じてカットオフ周波数を設定
    const normalizedAngle = Math.abs(this.knobAngle) / this.MAX_ANGLE;
    const frequency = this.MIN_FREQUENCY + (this.MAX_FREQUENCY - this.MIN_FREQUENCY) * normalizedAngle;
    this.setCutoffFrequency(frequency);
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