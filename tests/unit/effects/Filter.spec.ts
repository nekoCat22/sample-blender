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
  let context: AudioContext;
  let filter: Filter;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    filter = new Filter(context);
  });

  afterEach(() => {
    filter.dispose();
    context.close();
  });

  describe('初期化', () => {
    it('フィルターが正しく初期化されること', () => {
      expect(filter).toBeDefined();
      expect(filter.isEffectEnabled()).toBe(false);
      expect(filter.getState().knobAngle).toBe(0);
      expect(filter.getState().frequency).toBe(1000);
      expect(filter.getState().type).toBe('lowpass');
    });
  });

  describe('有効/無効', () => {
    it('フィルターを有効にできること', () => {
      filter.enable();
      expect(filter.isEffectEnabled()).toBe(true);
    });

    it('フィルターを無効にできること', () => {
      filter.enable();
      filter.disable();
      expect(filter.isEffectEnabled()).toBe(false);
    });
  });

  describe('ノブの回転角度', () => {
    it('有効な角度を設定できること', () => {
      filter.setKnobAngle(45);
      expect(filter.getState().knobAngle).toBe(45);
    });

    it('無効な角度を設定するとエラーになること', () => {
      expect(() => filter.setKnobAngle(200)).toThrow();
      expect(() => filter.setKnobAngle(-200)).toThrow();
    });

    it('0度の時はフィルターが無効になること', () => {
      filter.enable();
      filter.setKnobAngle(0);
      expect(filter.isEffectEnabled()).toBe(false);
    });

    it('負の角度でローパスフィルターになること', () => {
      filter.setKnobAngle(-45);
      expect(filter.getState().type).toBe('lowpass');
    });

    it('正の角度でハイパスフィルターになること', () => {
      filter.setKnobAngle(45);
      expect(filter.getState().type).toBe('highpass');
    });
  });

  describe('カットオフ周波数', () => {
    it('有効な周波数を設定できること', () => {
      filter.setCutoffFrequency(1000);
      expect(filter.getState().frequency).toBe(1000);
    });

    it('無効な周波数を設定するとエラーになること', () => {
      expect(() => filter.setCutoffFrequency(10)).toThrow();
      expect(() => filter.setCutoffFrequency(30000)).toThrow();
    });

    it('角度に応じて周波数が変化すること', () => {
      filter.setKnobAngle(45);
      const frequency1 = filter.getState().frequency;
      filter.setKnobAngle(90);
      const frequency2 = filter.getState().frequency;
      expect(frequency2).toBeGreaterThan(frequency1);
    });
  });

  describe('リセット', () => {
    it('フィルターをリセットできること', () => {
      filter.setKnobAngle(45);
      filter.setCutoffFrequency(2000);
      filter.reset();
      expect(filter.getState().knobAngle).toBe(0);
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