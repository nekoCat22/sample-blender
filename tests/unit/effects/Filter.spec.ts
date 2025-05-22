/**
 * @file Filter.spec.ts
 * @brief フィルターエフェクトのテスト
 * @details
 * - フィルターの初期化
 * - フィルターの有効/無効
 * - ノブの回転角度の設定
 * - カットオフ周波数の設定
 * - フィルターの種類の設定
 * - フィルターの状態の取得
 * - フィルターのリセット
 * - フィルターの破棄
 */

import { Filter } from '@/effects/Filter';

// AudioContextのモック
class MockAudioContext {
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 1000 },
      Q: { value: 1 },
      disconnect: jest.fn(),
      connect: jest.fn()
    };
  }

  createGain() {
    return {
      gain: { value: 1 },
      disconnect: jest.fn(),
      connect: jest.fn()
    };
  }

  close() {
    // 何もしない
  }
}

describe('Filter', () => {
  let filter: Filter;
  let context: AudioContext;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    filter = new Filter(context);
  });

  afterEach(() => {
    context.close();
  });

  describe('初期化', () => {
    it('フィルターが正しく初期化されること', () => {
      expect(filter).toBeDefined();
      expect(filter.isEffectEnabled()).toBe(false);
      expect(filter.getState().filterValue).toBe(0.5);
      expect(filter.getState().frequency).toBe(1000);
      expect(filter.getState().type).toBe('lowpass');
    });
  });

  describe('フィルター値', () => {
    it('有効な値を設定できること', () => {
      filter.updateFilter(0.8);
      expect(filter.getState().filterValue).toBe(0.8);
    });

    it('無効な値を設定するとエラーになること', () => {
      expect(() => filter.updateFilter(1.5)).toThrow();
      expect(() => filter.updateFilter(-0.5)).toThrow();
    });

    it('バイパス範囲内ではフィルターが無効になること', () => {
      filter.enable();
      filter.updateFilter(0.5);
      expect(filter.isEffectEnabled()).toBe(false);
    });

    it('0-0.45の範囲でローパスフィルターになること', () => {
      filter.updateFilter(0.3);
      expect(filter.getState().type).toBe('lowpass');
    });

    it('0.55-1.0の範囲でハイパスフィルターになること', () => {
      filter.updateFilter(0.8);
      expect(filter.getState().type).toBe('highpass');
    });
  });

  describe('周波数', () => {
    it('値に応じて周波数が変化すること', () => {
      filter.updateFilter(0.6);
      const frequency1 = filter.getState().frequency;
      filter.updateFilter(0.8);
      const frequency2 = filter.getState().frequency;
      expect(frequency2).toBeGreaterThan(frequency1);
    });
  });

  describe('リセット', () => {
    it('フィルターをリセットできること', () => {
      filter.updateFilter(0.8);
      filter.setCutoffFrequency(2000);
      filter.reset();
      expect(filter.getState().filterValue).toBe(0.5);
      expect(filter.getState().frequency).toBe(1000);
      expect(filter.getState().type).toBe('lowpass');
      expect(filter.isEffectEnabled()).toBe(false);
    });
  });

  describe('パラメータ', () => {
    it('パラメータを設定できること', () => {
      filter.setParameter('Q', 2);
      expect(filter.getParameter('Q')).toBe(2);
    });

    it('無効なパラメータを設定するとエラーになること', () => {
      expect(() => filter.setParameter('invalid', 1)).toThrow();
    });

    it('無効なパラメータを取得するとエラーになること', () => {
      expect(() => filter.getParameter('invalid')).toThrow();
    });
  });
}); 