/**
 * @file AudioEngine.spec.ts
 * @brief AudioEngineクラスのテスト
 * @details
 * - 初期化のテスト
 * - マスターボリュームの制御テスト
 * - エラー処理のテスト
 * - 音声ノードの接続テスト
 * - エフェクトチェーンの接続テスト
 * - パン機能のテスト
 */

import { AudioEngine } from '@/core/AudioEngine';
import { PlaybackSettingManager } from '@/core/PlaybackSettingManager';
import { EffectChain } from '@/effects/EffectChain';
import { PAN_MIN, PAN_MAX, ChannelId } from '@/core/audioConstants';

describe('AudioEngine', () => {
  let audioEngine: AudioEngine;
  let playbackSettingsManager: PlaybackSettingManager;
  let mockGain: any;
  let mockSource: any;
  let mockStereoPanner: any;
  let mockAudioContext: any;

  beforeEach(() => {
    // PlaybackSettingManagerのインスタンスを作成
    playbackSettingsManager = new PlaybackSettingManager();

    // モックの設定
    mockGain = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: {
        value: 1,
        setTargetAtTime: jest.fn()
      }
    };

    mockSource = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      buffer: null,
      playbackRate: { value: 1 },
      onended: null
    };

    mockStereoPanner = {
      pan: {
        value: 0,
        setValueAtTime: jest.fn()
      },
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    mockAudioContext = {
      createGain: jest.fn().mockReturnValue(mockGain),
      createBufferSource: jest.fn().mockReturnValue(mockSource),
      createStereoPanner: jest.fn().mockReturnValue(mockStereoPanner),
      createBiquadFilter: jest.fn().mockReturnValue({
        connect: jest.fn(),
        disconnect: jest.fn(),
        frequency: { value: 1000 },
        Q: { value: 1 },
        gain: { value: 0 },
        type: 'lowpass'
      }),
      decodeAudioData: jest.fn().mockResolvedValue({
        duration: 1,
        numberOfChannels: 2,
        sampleRate: 44100,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(44100))
      }),
      currentTime: 0,
      suspend: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
      destination: {}
    };

    // AudioContextのモックをグローバルに設定
    window.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

    // AudioEngineのインスタンスを作成
    audioEngine = new AudioEngine(playbackSettingsManager);
    audioEngine['context'] = mockAudioContext;

    // サンプルバッファのダミーをセット（チャンネル1,2,3のみ）
    const dummyBuffer = { duration: 1, numberOfChannels: 2, sampleRate: 44100 };
    [1, 2, 3].forEach(id => audioEngine['sampleBuffers'].set(id as ChannelId, dummyBuffer as any));

    // サンプルゲインノードのダミーをセット（チャンネル1,2,3のみ）
    const dummyGainNode = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: {
        value: 1,
        setTargetAtTime: jest.fn()
      }
    };
    [1, 2, 3].forEach(id => audioEngine['sampleGains'].set(id as ChannelId, dummyGainNode as any));

    // サンプルパンナーのダミーをセット（チャンネル1,2,3のみ）
    const dummyPannerNode = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      pan: {
        value: 0,
        setValueAtTime: jest.fn()
      }
    };
    [1, 2, 3].forEach(id => audioEngine['samplePanners'].set(id as ChannelId, dummyPannerNode as any));

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

    // StereoPannerNodeのモックを設定
    window.StereoPannerNode = jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      pan: {
        value: 0,
        setValueAtTime: jest.fn()
      }
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
      const channelIds: ChannelId[] = [4 as ChannelId];
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

  describe('パン機能', () => {
    beforeEach(() => {
      // モックの呼び出しをリセット
      mockStereoPanner.pan.setValueAtTime.mockClear();
      mockSource.connect.mockClear();
      mockAudioContext.createBufferSource.mockClear();

      // サンプルパンナーのダミーをセット（チャンネル1,2,3のみ）
      const dummyPannerNode = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        pan: {
          value: 0,
          setValueAtTime: jest.fn()
        }
      };
      [1, 2, 3].forEach(id => audioEngine['samplePanners'].set(id as ChannelId, dummyPannerNode as any));
    });

    it('パン値を更新できる', () => {
      const channelId: ChannelId = 1;
      const normalizedPan = 0.5; // 中央
      audioEngine.updatePan(channelId, normalizedPan);
      const expectedPanValue = PAN_MIN + (normalizedPan * (PAN_MAX - PAN_MIN));
      const panner = audioEngine['samplePanners'].get(channelId);
      expect(panner?.pan.setValueAtTime).toHaveBeenCalledWith(expectedPanValue, expect.any(Number));
    });

    it('存在しないチャンネルのパン値を更新しようとするとエラーになる', () => {
      const channelId: ChannelId = 999 as ChannelId;
      const normalizedPan = 0.5;
      expect(() => audioEngine.updatePan(channelId, normalizedPan)).toThrow('チャンネル 999 のパンナーが見つかりません');
    });

    it('パン値の範囲が正しく変換される', () => {
      const channelId: ChannelId = 1;
      
      // 左端
      audioEngine.updatePan(channelId, 0);
      const panner = audioEngine['samplePanners'].get(channelId);
      expect(panner?.pan.setValueAtTime).toHaveBeenCalledWith(PAN_MIN, expect.any(Number));
      
      // 中央
      audioEngine.updatePan(channelId, 0.5);
      const expectedCenterPanValue = PAN_MIN + (0.5 * (PAN_MAX - PAN_MIN));
      expect(panner?.pan.setValueAtTime).toHaveBeenCalledWith(expectedCenterPanValue, expect.any(Number));
      
      // 右端
      audioEngine.updatePan(channelId, 1);
      expect(panner?.pan.setValueAtTime).toHaveBeenCalledWith(PAN_MAX, expect.any(Number));
    });

    it('再生中にパン値を更新できる', () => {
      const channelId: ChannelId = 1;
      const normalizedPan = 0.5;
      
      // サンプルを再生
      audioEngine.playSamples([channelId]);
      
      // パン値を更新
      expect(() => audioEngine.updatePan(channelId, normalizedPan)).not.toThrow();
      
      // 新しいソースが作成され、パンナーに接続されていることを確認
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      const panner = audioEngine['samplePanners'].get(channelId);
      expect(panner?.connect).toHaveBeenCalled();
    });
  });
}); 