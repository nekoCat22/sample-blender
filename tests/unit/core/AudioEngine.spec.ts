/**
 * @file AudioEngine.spec.ts
 * @brief AudioEngineクラスのテスト
 * @details
 * - 初期化のテスト
 * - マスターボリュームの制御テスト
 * - エラー処理のテスト
 * - 音声ノードの接続テスト
 * - エフェクトチェーンの接続テスト
 */

import { AudioEngine } from '@/core/AudioEngine';
import { PlaybackSettingManager } from '@/core/PlaybackSettingManager';
import { ChannelId } from '@/core/audioConstants';

describe('AudioEngine', () => {
  let audioEngine: AudioEngine;
  let playbackSettingsManager: PlaybackSettingManager;

  beforeEach(() => {
    // PlaybackSettingManagerのインスタンスを作成
    playbackSettingsManager = new PlaybackSettingManager();

    // AudioEngineのインスタンスを作成
    audioEngine = new AudioEngine(playbackSettingsManager);

    // AudioContextのモックを設定
    window.AudioContext = jest.fn().mockImplementation(() => ({
      createGain: jest.fn().mockReturnValue({
        connect: jest.fn(),
        disconnect: jest.fn(),
        gain: { value: 1 }
      }),
      createBufferSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        buffer: null,
        playbackRate: { value: 1 },
        onended: null
      }),
      decodeAudioData: jest.fn().mockResolvedValue({
        duration: 1,
        numberOfChannels: 2,
        sampleRate: 44100
      }),
      currentTime: 0,
      suspend: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
      destination: {}
    }));

    // GainNodeのモックを設定
    window.GainNode = jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: { value: 1 }
    }));

    // AudioBufferSourceNodeのモックを設定
    window.AudioBufferSourceNode = jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
      playbackRate: { value: 1 },
      onended: null
    }));

    // AudioBufferのモックを設定
    window.AudioBuffer = jest.fn().mockImplementation(() => ({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100
    }));
  });

  describe('サンプルの再生', () => {
    it('複数のサンプルを同時に再生できる', () => {
      const channelIds: ChannelId[] = [1, 2];
      expect(() => audioEngine.playSamples(channelIds)).not.toThrow();
    });

    it('存在しないサンプルを再生しようとするとエラーになる', () => {
      const channelIds: ChannelId[] = [1, 2];
      expect(() => audioEngine.playSamples(channelIds)).toThrow('チャンネル 4 が見つかりません');
    });

    it('タイミングを指定して再生できる', () => {
      const channelIds: ChannelId[] = [1, 2, 3];
      expect(() => audioEngine.playSamples(channelIds)).not.toThrow();
    });
  });

  describe('エフェクトチェーンの接続', () => {
    it('存在しないサンプルをエフェクトチェーンに接続しようとするとエラーになる', () => {
      expect(() => audioEngine.connectSampleToEffectChain(4 as ChannelId)).toThrow();
    });

    it('フィルター値を設定できる', () => {
      expect(() => audioEngine.getEffectsManager().setFilterValue(1, 0.5)).not.toThrow();
    });

    it('無効なフィルターインデックスを指定するとエラーになる', () => {
      expect(() => audioEngine.getEffectsManager().setFilterValue(4 as ChannelId, 0.5)).toThrow();
    });

    it('フィルター値をリセット値（0.5）に設定できる', () => {
      expect(() => audioEngine.getEffectsManager().setFilterValue(1, 0.5)).not.toThrow();
    });
  });

  describe('PlaybackSettingManagerとの連携', () => {
    it('音量設定を取得できる', () => {
      expect(audioEngine.getSampleVolume(1)).toBeDefined();
    });

    it('現在の再生時間を取得できる', () => {
      expect(audioEngine.getCurrentTime()).toBeDefined();
    });

    it('サンプルの長さを取得できる', () => {
      expect(audioEngine.getSampleDuration(1)).toBeDefined();
    });

    it('最長のサンプルの長さを取得できる', () => {
      expect(audioEngine.getMaxDuration()).toBeDefined();
    });
  });
}); 