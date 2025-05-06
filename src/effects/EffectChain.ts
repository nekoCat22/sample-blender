/**
 * @file EffectChain.ts
 * @brief オーディオエフェクトチェーンを管理するクラス
 * @details
 * - 複数のエフェクトを順番に接続
 * - エフェクトの追加/削除/並び替え
 * - エフェクトの有効/無効の制御
 * - エフェクトチェーンの接続管理
 */

import { BaseEffect } from '@/effects/base/BaseEffect';

export class EffectChain {
  private effects: BaseEffect[] = [];
  private input: GainNode;
  private output: GainNode;
  private isConnected = false;

  /**
   * エフェクトチェーンのコンストラクタ
   * @param {AudioContext} context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();
  }

  /**
   * エフェクトを追加
   * @param {BaseEffect} effect - 追加するエフェクト
   */
  public addEffect(effect: BaseEffect): void {
    this.effects.push(effect);
    this.reconnect();
  }

  /**
   * エフェクトを削除
   * @param {BaseEffect} effect - 削除するエフェクト
   */
  public removeEffect(effect: BaseEffect): void {
    const index = this.effects.indexOf(effect);
    if (index !== -1) {
      this.effects.splice(index, 1);
      effect.dispose();
      this.reconnect();
    }
  }

  /**
   * エフェクトの順序を変更
   * @param {number} fromIndex - 移動元のインデックス
   * @param {number} toIndex - 移動先のインデックス
   */
  public reorderEffect(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.effects.length ||
        toIndex < 0 || toIndex >= this.effects.length) {
      throw new Error('無効なインデックスです');
    }
    const effect = this.effects[fromIndex];
    this.effects.splice(fromIndex, 1);
    this.effects.splice(toIndex, 0, effect);
    this.reconnect();
  }

  /**
   * エフェクトチェーンを再接続
   */
  private reconnect(): void {
    if (this.isConnected) {
      this.disconnect();
    }

    let currentNode = this.input;
    for (const effect of this.effects) {
      if (effect.isEffectEnabled()) {
        currentNode.connect(effect.getInput());
        currentNode = effect.getOutput();
      }
    }
    currentNode.connect(this.output);
    this.isConnected = true;
  }

  /**
   * エフェクトチェーンを切断
   */
  private disconnect(): void {
    this.input.disconnect();
    for (const effect of this.effects) {
      effect.getInput().disconnect();
      effect.getOutput().disconnect();
    }
    this.isConnected = false;
  }

  /**
   * エフェクトチェーンを破棄
   */
  public dispose(): void {
    this.disconnect();
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
  }
} 