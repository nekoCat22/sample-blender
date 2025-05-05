/**
 * @file BaseEffect.ts
 * @brief エフェクトの基底クラス
 * @details
 * - 入出力ノードの管理
 * - エフェクトの有効/無効制御
 * - パラメータの管理
 * - エラー処理
 */

import { AudioEngine } from '@/core/AudioEngine';

export abstract class BaseEffect {
  protected input!: GainNode;
  protected output!: GainNode;
  protected isEnabled: boolean = false;
  protected isInitialized: boolean = false;

  constructor(protected audioEngine: AudioEngine) {
    if (!audioEngine) {
      throw new Error('音声エンジンが指定されていません');
    }

    try {
      const context = audioEngine.getContext();
      this.input = context.createGain();
      this.output = context.createGain();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`エフェクトの初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected checkState(): void {
    try {
      this.audioEngine.getContext();
    } catch (error) {
      this.dispose();
      throw new Error('音声エンジンが破棄されています');
    }

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