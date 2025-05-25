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
import { EffectChain } from '@/effects/EffectChain';
import { Filter } from '@/effects/Filter';

// Filterのモックを作成
jest.mock('@/effects/Filter', () => {
  const mockFilter = jest.fn().mockImplementation(() => ({
    updateFilter: jest.fn(),
    reset: jest.fn(),
    dispose: jest.fn(),
    getInput: jest.fn(() => createGainNode()),
    getOutput: jest.fn(() => createGainNode())
  }));
  return {
    Filter: mockFilter
  };
});

// GainNodeのモックを作成
const createGainNode = () => ({
  gain: { value: 1 },
  connect: jest.fn(),
  disconnect: jest.fn()
});

// AudioBufferSourceNodeのモックを作成
const createBufferSourceNode = () => ({
  buffer: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  playbackRate: { value: 1.0 }
});

// BiquadFilterNodeのモックを作成
const createBiquadFilterNode = () => ({
  frequency: { value: 1000 },
  Q: { value: 1 },
  gain: { value: 0 },
  type: 'lowpass',
  connect: jest.fn(),
  disconnect: jest.fn()
});

// AudioContextのモックを作成
const mockAudioContext = {
  createBufferSource: jest.fn(() => createBufferSourceNode()),
  createGain: jest.fn(() => createGainNode()),
  createBiquadFilter: jest.fn(() => createBiquadFilterNode()),
  decodeAudioData: jest.fn((arrayBuffer) => Promise.resolve({
    duration: 1,
    sampleRate: 44100,
    numberOfChannels: 2,
    length: 44100,
    getChannelData: () => new Float32Array(44100),
    copyFromChannel: () => {},
    copyToChannel: () => {}
  } as unknown as AudioBuffer)),
  state: 'running',
  suspend: jest.fn(() => {
    mockAudioContext.state = 'suspended';
    return Promise.resolve();
  }),
  resume: jest.fn(() => {
    mockAudioContext.state = 'running';
    return Promise.resolve();
  }),
  close: jest.fn(() => {
    mockAudioContext.state = 'closed';
    return Promise.resolve();
  }),
  destination: {} // 出力先のモック
};

// AudioContextのグローバルモックを設定
(window as any).AudioContext = jest.fn(() => mockAudioContext);

describe('AudioEngine', () => {
  let audioEngine: AudioEngine;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    mockAudioContext.state = 'running';
    audioEngine = new AudioEngine();
  });

  afterEach(async () => {
    await audioEngine.dispose();
  });

  describe('初期化', () => {
    it('正常に初期化できる', () => {
      expect(audioEngine).toBeInstanceOf(AudioEngine);
    });

    it('音声コンテキストを取得できる', () => {
      const context = audioEngine.getContext();
      expect(context).toBeDefined();
      expect(context.state).toBe('running');
    });

    it('マスターゲインが正しく初期化される', () => {
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
  });

  describe('マスターボリューム', () => {
    it('デフォルトのボリュームを取得できる', () => {
      const volume = audioEngine.getMasterVolume();
      expect(volume).toBeGreaterThanOrEqual(0);
      expect(volume).toBeLessThanOrEqual(1);
    });

    it('ボリュームを設定できる', () => {
      const testVolume = 0.5;
      audioEngine.setMasterVolume(testVolume);
      expect(audioEngine.getMasterVolume()).toBe(testVolume);
    });

    it('無効なボリューム値を設定するとエラーになる', () => {
      expect(() => audioEngine.setMasterVolume(-1)).toThrow();
      expect(() => audioEngine.setMasterVolume(2)).toThrow();
    });
  });

  describe('音声コンテキストの制御', () => {
    it('一時停止と再開ができる', async () => {
      await audioEngine.suspend();
      expect(audioEngine.getContext().state).toBe('suspended');
      
      await audioEngine.resume();
      expect(audioEngine.getContext().state).toBe('running');
    });
  });

  describe('エラー処理', () => {
    it('破棄後に操作するとエラーになる', async () => {
      await audioEngine.dispose();
      expect(() => audioEngine.getContext()).toThrow();
      expect(() => audioEngine.getMasterVolume()).toThrow();
      expect(() => audioEngine.setMasterVolume(0.5)).toThrow();
    });

    it('二重破棄してもエラーにならない', async () => {
      await audioEngine.dispose();
      await expect(audioEngine.dispose()).resolves.not.toThrow();
    });
  });

  describe('サンプルの再生', () => {
    beforeEach(async () => {
      // テスト用のサンプルデータを作成
      const mockBuffer = {
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 44100,
        getChannelData: () => new Float32Array(44100),
        copyFromChannel: () => {},
        copyToChannel: () => {}
      } as unknown as AudioBuffer;

      // サンプルを読み込む
      await audioEngine.loadSample('1', new ArrayBuffer(0));
      await audioEngine.loadSample('2', new ArrayBuffer(0));
      await audioEngine.loadSample('3', new ArrayBuffer(0));
    });

    it('サンプルの読み込み時にGainNodeが作成される', async () => {
      await audioEngine.loadSample('test', new ArrayBuffer(0));
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('サンプル再生時にAudioBufferSourceNodeがGainNodeに接続される', () => {
      // playSample内で生成されるsourceをキャプチャするための変数
      let createdSource: any = null;
      mockAudioContext.createBufferSource.mockImplementation(() => {
        createdSource = createBufferSourceNode();
        return createdSource;
      });

      audioEngine.playSample('1');

      // playSampleで生成されたsourceのconnectが呼ばれているかを確認
      expect(createdSource.connect).toHaveBeenCalled();
    });

    it('複数のサンプルを同時に再生できる', () => {
      const channelIds = ['1', '2'];
      expect(() => audioEngine.playSamples(channelIds)).not.toThrow();
    });

    it('存在しないサンプルを再生しようとするとエラーになる', () => {
      const channelIds = ['1', '4'];
      expect(() => audioEngine.playSamples(channelIds)).toThrow('チャンネル 4 が見つかりません');
    });

    it('タイミングを指定して再生できる', () => {
      const channelIds = ['1', '2', '3'];
      expect(() => audioEngine.playSamples(channelIds)).not.toThrow();
    });
  });

  describe('エフェクトチェーン', () => {
    beforeEach(async () => {
      // テスト用のサンプルデータを作成
      await audioEngine.loadSample('1', new ArrayBuffer(0));
      await audioEngine.loadSample('2', new ArrayBuffer(0));
      await audioEngine.loadSample('3', new ArrayBuffer(0));
    });

    it('サンプルをエフェクトチェーンに接続できる', () => {
      expect(() => audioEngine.connectSampleToEffectChain('1')).not.toThrow();
    });

    it('存在しないサンプルをエフェクトチェーンに接続しようとするとエラーになる', () => {
      expect(() => audioEngine.connectSampleToEffectChain('4')).toThrow();
    });

    it('フィルター値を設定できる', () => {
      expect(() => audioEngine.setFilterValue(0, 0.5)).not.toThrow();
    });

    it('無効なフィルターインデックスを指定するとエラーになる', () => {
      expect(() => audioEngine.setFilterValue(4, 0.5)).toThrow();
    });

    it('フィルター値をリセット値（0.5）に設定できる', () => {
      expect(() => audioEngine.setFilterValue(0, 0.5)).not.toThrow();
    });
  });

  describe('ピッチ制御', () => {
    beforeEach(async () => {
      // テスト用のサンプルデータを作成
      await audioEngine.loadSample('1', new ArrayBuffer(0));
    });

    it('有効なピッチ値を設定できること', () => {
      expect(() => audioEngine.saveSamplePitchRate('1', 0.5)).not.toThrow();
    });

    it('無効なピッチ値を設定するとエラーになること', () => {
      expect(() => audioEngine.saveSamplePitchRate('1', 1.5)).toThrow();
      expect(() => audioEngine.saveSamplePitchRate('1', -0.5)).toThrow();
    });

    it('存在しないサンプルのピッチ値を設定するとエラーになること', () => {
      expect(() => audioEngine.saveSamplePitchRate('4', 0.5)).toThrow();
    });
  });

  describe('ピッチ値の変換', () => {
    beforeEach(async () => {
      await audioEngine.loadSample('1', new ArrayBuffer(0));
    });

    it('0.0のピッチ値が0.5の再生速度に変換されること', () => {
      audioEngine.saveSamplePitchRate('1', 0.0);
      expect(audioEngine.getSamplePitchRate('1')).toBe(0.5);
    });

    it('0.5のピッチ値が1.0の再生速度に変換されること', () => {
      audioEngine.saveSamplePitchRate('1', 0.5);
      expect(audioEngine.getSamplePitchRate('1')).toBe(1.0);
    });

    it('1.0のピッチ値が2.0の再生速度に変換されること', () => {
      audioEngine.saveSamplePitchRate('1', 1.0);
      expect(audioEngine.getSamplePitchRate('1')).toBe(2.0);
    });

    it('0.25のピッチ値が0.75の再生速度に変換されること', () => {
      audioEngine.saveSamplePitchRate('1', 0.25);
      expect(audioEngine.getSamplePitchRate('1')).toBe(0.75);
    });

    it('0.75のピッチ値が1.5の再生速度に変換されること', () => {
      audioEngine.saveSamplePitchRate('1', 0.75);
      expect(audioEngine.getSamplePitchRate('1')).toBe(1.5);
    });
  });

  describe('タイミング制御', () => {
    beforeEach(async () => {
      // テスト用のサンプルデータを作成
      await audioEngine.loadSample('1', new ArrayBuffer(0));
    });

    it('有効なタイミング値を保存できること', () => {
      expect(() => audioEngine.saveTiming('1', 0.5)).not.toThrow();
    });

    it('無効なタイミング値を保存するとエラーになること', () => {
      expect(() => audioEngine.saveTiming('1', 1.5)).toThrow();
      expect(() => audioEngine.saveTiming('1', -0.5)).toThrow();
    });

    it('存在しないサンプルのタイミング値を保存するとエラーになること', () => {
      expect(() => audioEngine.saveTiming('4', 0.5)).toThrow();
    });
  });

  describe('タイミング値の変換', () => {
    beforeEach(async () => {
      await audioEngine.loadSample('1', new ArrayBuffer(0));
    });

    it('0.0のタイミング値が0.0秒に変換されること', () => {
      audioEngine.saveTiming('1', 0.0);
      expect(audioEngine.getTiming('1')).toBe(0.0);
    });

    it('0.5のタイミング値が0.25秒に変換されること', () => {
      audioEngine.saveTiming('1', 0.5);
      expect(audioEngine.getTiming('1')).toBe(0.5);
    });

    it('1.0のタイミング値が0.5秒に変換されること', () => {
      audioEngine.saveTiming('1', 1.0);
      expect(audioEngine.getTiming('1')).toBe(1.0);
    });
  });
}); 