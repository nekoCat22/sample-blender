/**
 * @file GainEffect.spec.ts
 * @brief GainEffectクラスのテスト
 * @details
 * - 初期化のテスト
 * - ゲイン制御のテスト
 * - エラー処理のテスト
 */

import { GainEffect } from '@/effects/GainEffect';

// AudioContextのモック
class MockAudioContext {
  createGain() {
    return {
      gain: { value: 1 },
      disconnect: jest.fn(),
      connect: jest.fn()
    };
  }
}

describe('GainEffect', () => {
  let context: AudioContext;
  let effect: GainEffect;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    effect = new GainEffect(context);
  });

  afterEach(() => {
    effect.dispose();
  });

  describe('初期化', () => {
    it('デフォルトのゲイン値で初期化される', () => {
      expect(effect.getParameter('gain')).toBe(0.5);
    });

    it('初期状態で有効になっている', () => {
      expect(effect.isEffectEnabled()).toBe(true);
    });
  });

  describe('ゲイン制御', () => {
    it('ゲインを設定できる', () => {
      effect.setParameter('gain', 0.8);
      expect(effect.getParameter('gain')).toBe(0.8);
    });

    it('無効化するとゲインが0になる', () => {
      effect.setParameter('gain', 0.8);
      effect.disable();
      expect(effect.getParameter('gain')).toBe(0.8);
    });

    it('再度有効化すると元のゲイン値に戻る', () => {
      effect.setParameter('gain', 0.8);
      effect.disable();
      effect.enable();
      expect(effect.getParameter('gain')).toBe(0.8);
    });

    it('リセットするとデフォルト値に戻る', () => {
      effect.setParameter('gain', 0.8);
      effect.reset();
      expect(effect.getParameter('gain')).toBe(0.5);
    });
  });

  describe('エラー処理', () => {
    it('無効なパラメータ名でエラーになる', () => {
      expect(() => effect.setParameter('invalid', 0.5)).toThrow('無効なパラメータです');
      expect(() => effect.getParameter('invalid')).toThrow('無効なパラメータです');
    });

    it('範囲外のゲイン値でエラーになる', () => {
      expect(() => effect.setParameter('gain', -0.1)).toThrow('ゲインは0から1の間で指定してください');
      expect(() => effect.setParameter('gain', 1.1)).toThrow('ゲインは0から1の間で指定してください');
    });

    it('破棄後の操作でエラーになる', () => {
      effect.dispose();
      expect(() => effect.setParameter('gain', 0.5)).toThrow('エフェクトが初期化されていません');
      expect(() => effect.getParameter('gain')).toThrow('エフェクトが初期化されていません');
      expect(() => effect.reset()).toThrow('エフェクトが初期化されていません');
    });
  });
}); 