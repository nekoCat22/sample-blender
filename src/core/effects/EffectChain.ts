/**
 * @file EffectChain.ts
 * @brief オーディオエフェクトチェーンを管理するクラス
 * @details
 * - 複数のエフェクトを順番に接続
 * - エフェクトの追加/削除/並び替え
 * - エフェクトの有効/無効の制御
 * - エフェクトチェーンの接続管理
 */

import { BaseEffect } from './BaseEffect';

export class EffectChain {
  private context: AudioContext;
  private effects: BaseEffect[] = [];
  private input: GainNode;
  private output: GainNode;
  private isConnected = false;

  /**
   * エフェクトチェーンのコンストラクタ
   * @param {AudioContext} context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    this.context = context;
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
   * エフェクトチェーンを接続
   * @param {AudioNode} destination - 接続先のノード
   */
  public connect(destination: AudioNode): void {
    if (this.isConnected) {
      this.disconnect();
    }
    this.output.connect(destination);
    this.isConnected = true;
  }

  /**
   * エフェクトチェーンを切断
   */
  public disconnect(): void {
    if (this.isConnected) {
      // すべてのノードの接続を切断
      this.input.disconnect();
      this.effects.forEach(effect => {
        effect.getInput().disconnect();
        effect.getOutput().disconnect();
      });
      this.output.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * エフェクトチェーンの入力ノードを取得
   * @returns {GainNode} 入力ノード
   */
  public getInput(): GainNode {
    return this.input;
  }

  /**
   * エフェクトチェーンの出力ノードを取得
   * @returns {GainNode} 出力ノード
   */
  public getOutput(): GainNode {
    return this.output;
  }

  /**
   * エフェクトチェーンを破棄
   */
  public dispose(): void {
    this.disconnect();
    this.effects.forEach(effect => effect.dispose());
    this.effects = [];
    this.input.disconnect();
    this.output.disconnect();
  }

  /**
   * エフェクトチェーンを再接続
   * @public
   */
  public reconnect(): void {
    // 既存の接続を切断
    this.input.disconnect();
    this.effects.forEach(effect => {
      effect.getInput().disconnect();
      effect.getOutput().disconnect();
    });
    this.output.disconnect();

    // 新しい接続を確立
    let currentNode: AudioNode = this.input;
    let hasEnabledEffects = false;

    // 有効なエフェクトを接続
    for (const effect of this.effects) {
      if (effect.isEffectEnabled()) {
        currentNode.connect(effect.getInput());
        currentNode = effect.getOutput();
        hasEnabledEffects = true;
      }
    }

    // 出力を接続
    if (hasEnabledEffects) {
      currentNode.connect(this.output);
    } else {
      this.input.connect(this.output);
    }
  }
} 