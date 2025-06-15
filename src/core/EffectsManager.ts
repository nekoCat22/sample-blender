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
 * チャンネルの識別子を定義
 * 0: マスター
 * 1: チャンネル1
 * 2: チャンネル2
 * 3: チャンネル3
 */
export type ChannelId = 0 | 1 | 2 | 3;

/**
 * エフェクトの種類を定義
 */
export type EffectType = 'filter' | 'reverb' | 'delay' | 'distortion';

/**
 * エフェクトの管理クラス
 */
export class EffectsManager {
  private readonly channelIds = {
    MASTER: 0,
    CHANNEL1: 1,
    CHANNEL2: 2,
    CHANNEL3: 3
  } as const;

  private effects: Map<ChannelId, Map<EffectType, BaseEffect>>;
  private effectValues: Map<ChannelId, Map<EffectType, number>>;

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
      // 各チャンネルのエフェクトを初期化
      Object.values(this.channelIds).forEach(channelId => {
        const channelEffects = new Map<EffectType, BaseEffect>();
        const channelValues = new Map<EffectType, number>();

        // 各エフェクトタイプの初期化
        ['filter', 'reverb', 'delay', 'distortion'].forEach(effectType => {
          // 現在はFilterのみ実装されているため、すべてFilterで初期化
          const effect = new Filter(this.audioContext);
          channelEffects.set(effectType as EffectType, effect);
          channelValues.set(effectType as EffectType, 0.5);
        });

        this.effects.set(channelId, channelEffects);
        this.effectValues.set(channelId, channelValues);
      });
    } catch (error) {
      throw new Error(`エフェクトの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * エフェクトの値の設定
   * @param {ChannelId} channelId - チャンネル識別子
   * @param {EffectType} effectType - エフェクトタイプ
   * @param {number} value - 設定する値（0.0から1.0の範囲）
   * @throws {Error} 無効なチャンネル識別子またはエフェクトタイプの場合
   */
  public setEffectValue(channelId: ChannelId, effectType: EffectType, value: number): void {
    if (!this.isValidChannelId(channelId)) {
      throw new Error(`無効なチャンネル識別子です: ${channelId}`);
    }

    const channelEffects = this.effects.get(channelId);
    if (!channelEffects) {
      throw new Error(`チャンネルのエフェクトが見つかりません: ${channelId}`);
    }

    const effect = channelEffects.get(effectType);
    if (!effect) {
      throw new Error(`エフェクトが見つかりません: ${effectType}`);
    }

    try {
      effect.updateEffect(value);
      const channelValues = this.effectValues.get(channelId);
      if (channelValues) {
        channelValues.set(effectType, value);
      }
    } catch (error) {
      throw new Error(`エフェクトの値の設定に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * エフェクトの取得
   * @param {ChannelId} channelId - チャンネル識別子
   * @param {EffectType} effectType - エフェクトタイプ
   * @returns {BaseEffect} エフェクト
   * @throws {Error} 無効なチャンネル識別子またはエフェクトタイプの場合
   */
  public getEffect(channelId: ChannelId, effectType: EffectType): BaseEffect {
    if (!this.isValidChannelId(channelId)) {
      throw new Error(`無効なチャンネル識別子です: ${channelId}`);
    }

    const channelEffects = this.effects.get(channelId);
    if (!channelEffects) {
      throw new Error(`チャンネルのエフェクトが見つかりません: ${channelId}`);
    }

    const effect = channelEffects.get(effectType);
    if (!effect) {
      throw new Error(`エフェクトが見つかりません: ${effectType}`);
    }

    return effect;
  }

  /**
   * フィルターの値を設定
   * @param {ChannelId} channelId - チャンネル識別子
   * @param {number} value - 設定する値（0.0から1.0の範囲）
   * @throws {Error} 無効なチャンネル識別子の場合
   */
  public setFilterValue(channelId: ChannelId, value: number): void {
    this.setEffectValue(channelId, 'filter', value);
  }

  /**
   * チャンネル識別子の検証
   * @param {ChannelId} channelId - 検証するチャンネル識別子
   * @returns {boolean} 有効な場合はtrue
   */
  private isValidChannelId(channelId: ChannelId): boolean {
    return Object.values(this.channelIds).includes(channelId);
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    this.effects.forEach(channelEffects => {
      channelEffects.forEach(effect => {
        if (effect && typeof effect.dispose === 'function') {
          effect.dispose();
        }
      });
    });
    this.effects.clear();
    this.effectValues.clear();
  }
} 