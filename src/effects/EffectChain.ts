/**
 * @file EffectChain.ts
 * @brief オーディオエフェクトチェーンを管理するクラス
 * @details
 * - 複数のエフェクトを順番に接続
 * - エフェクトの追加/削除/並び替え
 * - エフェクトの有効/無効の制御は各エフェクトのバイパス機能を使用
 * - エフェクトチェーンは静的な接続を維持
 */

import { BaseEffect } from './base/BaseEffect';
import { Filter } from './Filter';

export class EffectChain {
  private effects: BaseEffect[] = [];
  private input: GainNode;
  private output: GainNode;

  /**
   * エフェクトチェーンのコンストラクタ
   * @param {AudioContext} context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();
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
   * エフェクトを追加
   * @param {BaseEffect} effect - 追加するエフェクト
   */
  public addEffect(effect: BaseEffect): void {
    this.effects.push(effect);
    this.connectEffect(effect);
  }

  /**
   * エフェクトを削除
   * @param {BaseEffect} effect - 削除するエフェクト
   */
  public removeEffect(effect: BaseEffect): void {
    const index = this.effects.indexOf(effect);
    if (index !== -1) {
      this.disconnectEffect(effect);
      this.effects.splice(index, 1);
      effect.dispose();
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

    // 一旦全ての接続を切断
    this.disconnectAll();

    // エフェクトの順序を変更
    const effect = this.effects[fromIndex];
    this.effects.splice(fromIndex, 1);
    this.effects.splice(toIndex, 0, effect);

    // 新しい順序で再接続
    this.connectAll();
  }

  /**
   * フィルターエフェクトを取得
   * @returns {Filter | undefined} フィルターエフェクト
   */
  public getFilter(): Filter | undefined {
    const filter = this.effects.find(effect => effect.constructor.name === 'Filter');
    return filter instanceof Filter ? filter : undefined;
  }

  /**
   * エフェクトを接続
   * @param {BaseEffect} effect - 接続するエフェクト
   */
  private connectEffect(effect: BaseEffect): void {
    const index = this.effects.indexOf(effect);
    if (index === -1) return;

    if (index === 0) {
      // 最初のエフェクトの場合
      this.input.connect(effect.getInput());
    } else {
      // 前のエフェクトに接続
      this.effects[index - 1].getOutput().connect(effect.getInput());
    }

    if (index === this.effects.length - 1) {
      // 最後のエフェクトの場合
      effect.getOutput().connect(this.output);
    }
  }

  /**
   * エフェクトの接続を切断
   * @param {BaseEffect} effect - 切断するエフェクト
   */
  private disconnectEffect(effect: BaseEffect): void {
    const index = this.effects.indexOf(effect);
    if (index === -1) return;

    if (index === 0) {
      this.input.disconnect(effect.getInput());
    } else {
      this.effects[index - 1].getOutput().disconnect(effect.getInput());
    }

    if (index === this.effects.length - 1) {
      effect.getOutput().disconnect(this.output);
    }
  }

  /**
   * 全てのエフェクトを接続
   */
  private connectAll(): void {
    if (this.effects.length === 0) {
      this.input.connect(this.output);
      return;
    }

    this.input.connect(this.effects[0].getInput());
    for (let i = 0; i < this.effects.length - 1; i++) {
      this.effects[i].getOutput().connect(this.effects[i + 1].getInput());
    }
    this.effects[this.effects.length - 1].getOutput().connect(this.output);
  }

  /**
   * 全てのエフェクトの接続を切断
   */
  private disconnectAll(): void {
    this.input.disconnect();
    for (const effect of this.effects) {
      effect.getInput().disconnect();
      effect.getOutput().disconnect();
    }
  }

  /**
   * エフェクトチェーンを破棄
   */
  public dispose(): void {
    this.disconnectAll();
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects = [];
  }
} 