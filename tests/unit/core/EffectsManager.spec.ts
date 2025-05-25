/**
 * @file EffectsManager.spec.ts
 * @brief EffectsManagerクラスのテスト
 * @details
 * - エフェクトの初期化テスト
 * - エフェクトの値の設定テスト
 * - エフェクトの取得テスト
 * - エラー処理のテスト
 */

import { EffectsManager } from '@/core/EffectsManager';
import { ChannelType, EffectType } from '@/core/EffectsManager';
import { Filter } from '@/effects/Filter';

// Filterのモックを作成
jest.mock('@/effects/Filter', () => {
  const mockFilter = jest.fn().mockImplementation(() => ({
    updateEffect: jest.fn(),
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
  let mockContext: AudioContext;

  beforeEach(() => {
    mockContext = new AudioContext();
    effectsManager = new EffectsManager(mockContext);
  });

  afterEach(() => {
    effectsManager.dispose();
  });

  describe('初期化', () => {
    it('正常に初期化できる', () => {
      expect(effectsManager).toBeDefined();
    });
  });

  describe('getEffect', () => {
    it('有効なチャンネルタイプとエフェクトタイプを指定するとエフェクトを取得できる', () => {
      const channelTypes: ChannelType[] = [0, 1, 2, 3];
      const effectTypes: EffectType[] = ['filter', 'reverb', 'delay', 'distortion'];
      channelTypes.forEach(channelType => {
        effectTypes.forEach(effectType => {
          expect(() => effectsManager.getEffect(channelType, effectType)).not.toThrow();
        });
      });
    });

    it('無効なチャンネルタイプを指定するとエラーになる', () => {
      expect(() => effectsManager.getEffect(4 as ChannelType, 'filter')).toThrow();
    });

    it('無効なエフェクトタイプを指定するとエラーになる', () => {
      expect(() => effectsManager.getEffect(0, 'invalid' as EffectType)).toThrow();
    });
  });

  describe('setEffectValue', () => {
    it('有効なチャンネルタイプとエフェクトタイプを指定すると値を設定できる', () => {
      const channelTypes: ChannelType[] = [0, 1, 2, 3];
      const effectTypes: EffectType[] = ['filter', 'reverb', 'delay', 'distortion'];
      channelTypes.forEach(channelType => {
        effectTypes.forEach(effectType => {
          expect(() => effectsManager.setEffectValue(channelType, effectType, 0.5)).not.toThrow();
        });
      });
    });

    it('無効なチャンネルタイプを指定するとエラーになる', () => {
      expect(() => effectsManager.setEffectValue(4 as ChannelType, 'filter', 0.5)).toThrow();
    });

    it('無効なエフェクトタイプを指定するとエラーになる', () => {
      expect(() => effectsManager.setEffectValue(0, 'invalid' as EffectType, 0.5)).toThrow();
    });
  });

  describe('dispose', () => {
    it('正常に破棄できる', () => {
      expect(() => effectsManager.dispose()).not.toThrow();
    });
  });
}); 