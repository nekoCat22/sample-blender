/**
 * @file EffectsManager.spec.ts
 * @brief EffectsManagerクラスのテスト
 * @details
 * - エフェクトの初期化テスト
 * - エフェクトの値の設定テスト
 * - エフェクトの取得テスト
 * - エラー処理のテスト
 */

import { EffectsManager, ChannelType } from '@/core/EffectsManager';
import { Filter } from '@/effects/Filter';

// Filterのモックを作成
jest.mock('@/effects/Filter', () => {
  const mockFilter = jest.fn().mockImplementation(() => ({
    updateFilter: jest.fn(),
    dispose: jest.fn()
  }));
  return {
    Filter: mockFilter
  };
});

// AudioContextのモックを作成
const mockAudioContext = {
  createGain: jest.fn(() => ({
    gain: { value: 1 },
    connect: jest.fn(),
    disconnect: jest.fn()
  }))
};

describe('EffectsManager', () => {
  let effectsManager: EffectsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    effectsManager = new EffectsManager(mockAudioContext as unknown as AudioContext);
  });

  afterEach(() => {
    effectsManager.dispose();
  });

  describe('初期化', () => {
    it('正常に初期化できる', () => {
      expect(effectsManager).toBeInstanceOf(EffectsManager);
    });

    it('各チャンネルのエフェクトが初期化される', () => {
      const channelTypes: ChannelType[] = ['master', 'channel1', 'channel2', 'channel3'];
      channelTypes.forEach(channelType => {
        expect(() => effectsManager.getEffect(channelType)).not.toThrow();
      });
    });
  });

  describe('エフェクトの値の設定', () => {
    it('エフェクトの値を設定できる', () => {
      const channelTypes: ChannelType[] = ['master', 'channel1', 'channel2', 'channel3'];
      channelTypes.forEach(channelType => {
        expect(() => effectsManager.setEffectValue(channelType, 0.5)).not.toThrow();
      });
    });

    it('エフェクトの値をリセット値（0.5）に設定できる', () => {
      const channelTypes: ChannelType[] = ['master', 'channel1', 'channel2', 'channel3'];
      channelTypes.forEach(channelType => {
        expect(() => effectsManager.setEffectValue(channelType, 0.5)).not.toThrow();
      });
    });

    it('無効なチャンネルタイプを指定するとエラーになる', () => {
      expect(() => effectsManager.setEffectValue('invalid' as ChannelType, 0.5)).toThrow();
    });
  });

  describe('エフェクトの取得', () => {
    it('エフェクトを取得できる', () => {
      const channelTypes: ChannelType[] = ['master', 'channel1', 'channel2', 'channel3'];
      channelTypes.forEach(channelType => {
        const effect = effectsManager.getEffect(channelType);
        expect(effect).toBeDefined();
        expect(effect.updateFilter).toBeDefined();
        expect(effect.dispose).toBeDefined();
      });
    });

    it('無効なチャンネルタイプを指定するとエラーになる', () => {
      expect(() => effectsManager.getEffect('invalid' as ChannelType)).toThrow();
    });
  });

  describe('リソースの解放', () => {
    it('disposeを呼び出してもエラーにならない', () => {
      expect(() => effectsManager.dispose()).not.toThrow();
    });

    it('二重でdisposeを呼び出してもエラーにならない', () => {
      effectsManager.dispose();
      expect(() => effectsManager.dispose()).not.toThrow();
    });
  });
}); 