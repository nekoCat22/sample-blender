/**
 * @file EffectsManager.ts
 * @brief エフェクトの管理クラス
 * @details
 * - エフェクトの初期化と管理
 * - エフェクトの値の管理
 * - エフェクトの種類の管理
 * - AudioEngineからエフェクトの種類と値を受け取って、適切なエフェクトに適用する
 * - エフェクトのリセット機能
 * - エフェクトのリソース管理
 */

import { Filter } from '@/effects/Filter';
// BaseEffectはFilterが継承してるため、インポートが必須だが、ESLintのエラーが出るため無視する文
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { BaseEffect } from '@/effects/base/BaseEffect';

/**
 * エフェクトの種類を定義
 */
export type ChannelType = 'master' | 'channel1' | 'channel2' | 'channel3';

/**
 * エフェクトの管理クラス
 */
export class EffectsManager {
  private readonly effectTypes = {
    MASTER: 'master',
    CHANNEL1: 'channel1',
    CHANNEL2: 'channel2',
    CHANNEL3: 'channel3'
  } as const;

  private effects: Map<ChannelType, Filter>;
  private effectValues: Map<ChannelType, number>;

  /**
   * EffectsManagerのコンストラクタ
   * @param {AudioContext} audioContext - 音声コンテキスト
   * @throws {Error} 初期化に失敗した場合
   */
  constructor(private readonly audioContext: AudioContext) {
    this.effects = new Map();
    this.effectValues = new Map();
    this.initializeEffects();
  }

  /**
   * エフェクトの初期化
   * @throws {Error} 初期化に失敗した場合
   */
  private initializeEffects(): void {
    try {
      // マスターエフェクトの初期化
      const masterFilter = new Filter(this.audioContext);
      this.effects.set(this.effectTypes.MASTER, masterFilter);
      this.effectValues.set(this.effectTypes.MASTER, 0.5);

      // チャンネル1のエフェクトの初期化
      const channel1Filter = new Filter(this.audioContext);
      this.effects.set(this.effectTypes.CHANNEL1, channel1Filter);
      this.effectValues.set(this.effectTypes.CHANNEL1, 0.5);

      // チャンネル2のエフェクトの初期化
      const channel2Filter = new Filter(this.audioContext);
      this.effects.set(this.effectTypes.CHANNEL2, channel2Filter);
      this.effectValues.set(this.effectTypes.CHANNEL2, 0.5);

      // チャンネル3のエフェクトの初期化
      const channel3Filter = new Filter(this.audioContext);
      this.effects.set(this.effectTypes.CHANNEL3, channel3Filter);
      this.effectValues.set(this.effectTypes.CHANNEL3, 0.5);
    } catch (error) {
      throw new Error(`エフェクトの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * エフェクトの値の設定
   * @param {ChannelType} channelType - チャンネルタイプ
   * @param {number} value - 設定する値（0.0から1.0の範囲）
   * @throws {Error} 無効なチャンネルタイプの場合
   */
  public setEffectValue(channelType: ChannelType, value: number): void {
    if (!this.isValidChannelType(channelType)) {
      throw new Error(`無効なチャンネルタイプです: ${channelType}`);
    }

    const effect = this.effects.get(channelType);
    if (!effect) {
      throw new Error(`エフェクトが見つかりません: ${channelType}`);
    }

    try {
      effect.updateFilter(value);
      this.effectValues.set(channelType, value);
    } catch (error) {
      throw new Error(`エフェクトの値の設定に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * エフェクトの取得
   * @param {ChannelType} channelType - チャンネルタイプ
   * @returns {Filter} エフェクト
   * @throws {Error} 無効なチャンネルタイプの場合
   */
  public getEffect(channelType: ChannelType): Filter {
    if (!this.isValidChannelType(channelType)) {
      throw new Error(`無効なチャンネルタイプです: ${channelType}`);
    }

    const effect = this.effects.get(channelType);
    if (!effect) {
      throw new Error(`エフェクトが見つかりません: ${channelType}`);
    }

    return effect;
  }

  /**
   * チャンネルタイプの検証
   * @param {ChannelType} channelType - 検証するチャンネルタイプ
   * @returns {boolean} 有効な場合はtrue
   */
  private isValidChannelType(channelType: ChannelType): boolean {
    return Object.values(this.effectTypes).includes(channelType);
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    this.effects.forEach(effect => {
      if (effect && typeof effect.dispose === 'function') {
        effect.dispose();
      }
    });
    this.effects.clear();
    this.effectValues.clear();
  }
} 