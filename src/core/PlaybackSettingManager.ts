/**
 * @file PlaybackSettingManager.ts
 * @brief 再生設定を管理するクラス
 * @details
 * - 音量、タイミング、ピッチなどの再生設定を一元管理
 * - 各設定の値の範囲チェック
 * - 設定の保存と取得
 */

export type SettingType = 'volume' | 'timing' | 'pitch';

export class PlaybackSettingManager {
  // 定数定義
  private static readonly MAX_TIMING = 0.5;
  private static readonly MIN_PITCH = 0.0;
  private static readonly MAX_PITCH = 1.0;
  private static readonly DEFAULT_PITCH = 0.5;
  private static readonly MIN_PLAYBACK_RATE = 0.5;  // 最小再生速度（半速）
  private static readonly MAX_PLAYBACK_RATE = 2.0;  // 最大再生速度（2倍速）
  private static readonly DEFAULT_PLAYBACK_RATE = 1.0;  // デフォルト再生速度（通常速度）

  // 設定値を保持するMap
  private volumeSettings: Map<number, number> = new Map();
  private timingSettings: Map<number, number> = new Map();
  private pitchSettings: Map<number, number> = new Map();

  /**
   * 設定値を保存
   * @param {number} channelId - チャンネルID
   * @param {SettingType} type - 設定の種類
   * @param {number} value - 設定値
   * @throws {Error} 無効な設定値の場合
   */
  public setSetting(channelId: number, type: SettingType, value: number): void {
    switch (type) {
      case 'volume':
        this.setVolume(channelId, value);
        break;
      case 'timing':
        this.setTiming(channelId, value);
        break;
      case 'pitch':
        this.setPitch(channelId, value);
        break;
    }
  }

  /**
   * 設定値を取得
   * @param {number} channelId - チャンネルID
   * @param {SettingType} type - 設定の種類
   * @returns {number} 設定値
   */
  public getSetting(channelId: number, type: SettingType): number {
    switch (type) {
      case 'volume':
        return this.getVolume(channelId);
      case 'timing':
        return this.getTiming(channelId);
      case 'pitch':
        return this.getPitch(channelId);
    }
  }

  /**
   * 音量を設定
   * @param {number} channelId - チャンネルID
   * @param {number} value - 音量値（0.0から1.0の範囲）
   * @throws {Error} 無効な音量値の場合
   */
  private setVolume(channelId: number, value: number): void {
    if (value < 0 || value > 1) {
      throw new Error('音量は0.0から1.0の範囲で指定してください');
    }
    this.volumeSettings.set(channelId, value);
  }

  /**
   * 音量を取得
   * @param {number} channelId - チャンネルID
   * @returns {number} 音量値（0.0から1.0の範囲）
   */
  private getVolume(channelId: number): number {
    return this.volumeSettings.get(channelId) ?? 1.0;
  }

  /**
   * タイミングを設定
   * @param {number} channelId - チャンネルID
   * @param {number} value - タイミング値（0.0から1.0の範囲）
   * @throws {Error} 無効なタイミング値の場合
   */
  private setTiming(channelId: number, value: number): void {
    if (value < 0 || value > 1) {
      throw new Error('タイミングは0から1の範囲で指定してください');
    }
    // 0-1の値を0-0.5の範囲に変換
    const convertedTiming = value * PlaybackSettingManager.MAX_TIMING;
    this.timingSettings.set(channelId, convertedTiming);
  }

  /**
   * タイミングを取得
   * @param {number} channelId - チャンネルID
   * @returns {number} タイミング値（0.0から0.5秒の範囲）
   */
  private getTiming(channelId: number): number {
    return this.timingSettings.get(channelId) ?? 0;
  }

  /**
   * ピッチを設定
   * @param {number} channelId - チャンネルID
   * @param {number} value - ピッチ値（0.0から1.0の範囲）
   * @throws {Error} 無効なピッチ値の場合
   */
  private setPitch(channelId: number, value: number): void {
    if (value < PlaybackSettingManager.MIN_PITCH || value > PlaybackSettingManager.MAX_PITCH) {
      throw new Error(`ピッチ値は${PlaybackSettingManager.MIN_PITCH}から${PlaybackSettingManager.MAX_PITCH}の範囲で指定してください`);
    }

    let playbackRate: number;
    if (value < 0.5) {
      // 0.0-0.5の範囲を0.5-1.0の範囲に変換
      playbackRate = PlaybackSettingManager.MIN_PLAYBACK_RATE + (value * 2 * (PlaybackSettingManager.DEFAULT_PLAYBACK_RATE - PlaybackSettingManager.MIN_PLAYBACK_RATE));
    } else if (value > 0.5) {
      // 0.5-1.0の範囲を1.0-2.0の範囲に変換
      playbackRate = PlaybackSettingManager.DEFAULT_PLAYBACK_RATE + ((value - 0.5) * 2 * (PlaybackSettingManager.MAX_PLAYBACK_RATE - PlaybackSettingManager.DEFAULT_PLAYBACK_RATE));
    } else {
      // 0.5の場合はデフォルト値
      playbackRate = PlaybackSettingManager.DEFAULT_PLAYBACK_RATE;
    }

    this.pitchSettings.set(channelId, playbackRate);
  }

  /**
   * ピッチを取得
   * @param {number} channelId - チャンネルID
   * @returns {number} ピッチレート（0.5から2.0の範囲）
   */
  private getPitch(channelId: number): number {
    return this.pitchSettings.get(channelId) ?? PlaybackSettingManager.DEFAULT_PLAYBACK_RATE;
  }
} 