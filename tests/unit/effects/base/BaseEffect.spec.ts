/**
 * @file BaseEffect.spec.ts
 * @brief BaseEffectクラスのテスト
 * @details
 * - 初期化のテスト
 * - 入出力ノードの取得テスト
 * - エラー処理のテスト
 */

import { BaseEffect } from '@/effects/base/BaseEffect';

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

// テスト用の具象クラス
class TestEffect extends BaseEffect {
  public enable(): void {
    this.checkState();
    this.isEnabled = true;
  }

  public disable(): void {
    this.checkState();
    this.isEnabled = false;
  }

  public setParameter(param: string, value: number): void {
    this.checkState();
    // テスト用の実装
  }

  public getParameter(param: string): number {
    this.checkState();
    return 0; // テスト用の実装
  }
}

describe('BaseEffect', () => {
  let context: AudioContext;
  let effect: TestEffect;

  beforeEach(() => {
    context = new MockAudioContext() as unknown as AudioContext;
    effect = new TestEffect(context);
  });

  afterEach(() => {
    effect.dispose();
  });

  describe('初期化', () => {
    it('正常に初期化できる', () => {
      expect(effect).toBeInstanceOf(TestEffect);
    });

    it('AudioContextなしでは初期化できない', () => {
      expect(() => new TestEffect(null as unknown as AudioContext)).toThrow();
    });
  });

  describe('入出力ノード', () => {
    it('入力ノードを取得できる', () => {
      const input = effect.getInput();
      expect(input).toBeDefined();
      expect(input).toHaveProperty('connect');
      expect(input).toHaveProperty('disconnect');
    });

    it('出力ノードを取得できる', () => {
      const output = effect.getOutput();
      expect(output).toBeDefined();
      expect(output).toHaveProperty('connect');
      expect(output).toHaveProperty('disconnect');
    });
  });

  describe('エフェクトの制御', () => {
    it('有効化できる', () => {
      effect.enable();
      expect(effect.isEffectEnabled()).toBe(true);
    });

    it('無効化できる', () => {
      effect.enable();
      effect.disable();
      expect(effect.isEffectEnabled()).toBe(false);
    });
  });

  describe('エラー処理', () => {
    it('破棄後に操作するとエラーになる', () => {
      effect.dispose();
      expect(() => effect.getInput()).toThrow('エフェクトが初期化されていません');
      expect(() => effect.getOutput()).toThrow('エフェクトが初期化されていません');
      expect(() => effect.enable()).toThrow('エフェクトが初期化されていません');
      expect(() => effect.disable()).toThrow('エフェクトが初期化されていません');
      expect(() => effect.setParameter('test', 0)).toThrow('エフェクトが初期化されていません');
      expect(() => effect.getParameter('test')).toThrow('エフェクトが初期化されていません');
    });

    it('二重破棄してもエラーにならない', () => {
      effect.dispose();
      expect(() => effect.dispose()).not.toThrow();
    });
  });
}); 