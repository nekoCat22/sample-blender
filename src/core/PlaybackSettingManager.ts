/**
 * @file PlaybackSettingManager.ts
 * @brief 再生設定を管理するクラス
 * @details
 * - 音量、タイミング、ピッチなどの再生設定を一元管理
 * - 各設定の値の範囲チェック（0.0から1.0の範囲）
 * - 設定の保存と取得
 * - デフォルト値の管理
 */

import { CHANNEL_IDS, ChannelId, VOLUME_DEFAULT, PITCH_DEFAULT_RATE } from './audioConstants';

export type SettingType = 'volume' | 'timing' | 'pitch';

export class PlaybackSettingManager {
  // 設定値を保持するMap
  private volumeSettings: Map<ChannelId, number> = new Map();
  private timingSettings: Map<ChannelId, number> = new Map();
  private pitchSettings: Map<ChannelId, number> = new Map();

  /**
   * コンストラクタ
   * @description デフォルトのチャンネルに対して初期値を設定
   */
  constructor() {
    // 各チャンネルのデフォルト値を設定
    CHANNEL_IDS.forEach(channelId => {
      this.volumeSettings.set(channelId, VOLUME_DEFAULT);
      this.timingSettings.set(channelId, 0.0);
      this.pitchSettings.set(channelId, PITCH_DEFAULT_RATE);
    });
  }

  /**
   * 設定値を保存
   * @param {ChannelId} channelId - チャンネルID
   * @param {SettingType} type - 設定の種類
   * @param {number} value - 設定値（0.0から1.0の範囲）
   * @throws {Error} 無効な設定値の場合
   */
  public setSetting(channelId: ChannelId, type: SettingType, value: number): void {
    // 値の範囲チェック
    if (value < 0.0 || value > 1.0) {
      throw new Error(`${type}の値は0.0から1.0の範囲で指定してください`);
    }

    switch (type) {
      case 'volume':
        this.volumeSettings.set(channelId, value);
        break;
      case 'timing':
        this.timingSettings.set(channelId, value);
        break;
      case 'pitch':
        this.pitchSettings.set(channelId, value);
        break;
    }
  }

  /**
   * 設定値を取得
   * @param {ChannelId} channelId - チャンネルID
   * @param {SettingType} type - 設定の種類
   * @returns {number} 設定値（0.0から1.0の範囲）
   */
  public getSetting(channelId: ChannelId, type: SettingType): number {
    let value: number | undefined;
    let defaultValue: number;

    switch (type) {
      case 'volume':
        value = this.volumeSettings.get(channelId);
        defaultValue = VOLUME_DEFAULT;
        break;
      case 'timing':
        value = this.timingSettings.get(channelId);
        defaultValue = 0.0;
        break;
      case 'pitch':
        value = this.pitchSettings.get(channelId);
        defaultValue = PITCH_DEFAULT_RATE;
        break;
    }

    if (value === undefined) {
      console.warn(`チャンネル ${channelId} の${type}設定が見つかりません。デフォルト値を使用します。`);
      return defaultValue;
    }

    return value;
  }

  /**
   * すべての設定をクリア
   * @description すべての設定をデフォルト値にリセット
   */
  public clearSettings(): void {
    // 各チャンネルの設定をクリア
    CHANNEL_IDS.forEach(channelId => {
      this.volumeSettings.set(channelId, VOLUME_DEFAULT);
      this.timingSettings.set(channelId, 0.0);
      this.pitchSettings.set(channelId, PITCH_DEFAULT_RATE);
    });
  }
} 