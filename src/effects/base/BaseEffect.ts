/**
 * @file BaseEffect.ts
 * @brief エフェクトの基底クラス
 * @details
 * - 入出力ノードの管理
 * - エフェクトの有効/無効制御
 * - パラメータの管理
 * - エラー処理
 * - AudioContextとAudioEngineの両方に対応
 */

import { AudioEngine } from '@/core/AudioEngine';

export abstract class BaseEffect {
  protected input!: GainNode;
  protected output!: GainNode;
  protected isEnabled = false;
  protected isInitialized = false;
  protected parameters: Map<string, AudioParam> = new Map();
  protected context: AudioContext;

  constructor(audioEngineOrContext: AudioEngine | AudioContext) {
    if (!audioEngineOrContext) {
      throw new Error('音声エンジンまたはAudioContextが指定されていません');
    }

    try {
      if (audioEngineOrContext instanceof AudioEngine) {
        this.context = audioEngineOrContext.getContext();
      } else {
        this.context = audioEngineOrContext;
      }
      this.input = this.context.createGain();
      this.output = this.context.createGain();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`エフェクトの初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected checkState(): void {
    if (!this.isInitialized) {
      throw new Error('エフェクトが初期化されていません');
    }
  }

  public getInput(): GainNode {
    this.checkState();
    return this.input;
  }

  public getOutput(): GainNode {
    this.checkState();
    return this.output;
  }

  public abstract enable(): void;
  public abstract disable(): void;
  public abstract setParameter(param: string, value: number): void;
  public abstract getParameter(param: string): number;

  /**
   * エフェクトの有効状態を取得
   * @returns {boolean} エフェクトが有効かどうか
   */
  public isEffectEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * エフェクトのパラメータ一覧を取得
   * @returns {string[]} パラメータ名の配列
   */
  public getParameterNames(): string[] {
    return Array.from(this.parameters.keys());
  }

  public dispose(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.input.disconnect();
      this.output.disconnect();
      this.isInitialized = false;
      this.isEnabled = false;
    } catch (error) {
      throw new Error(`エフェクトの破棄に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 