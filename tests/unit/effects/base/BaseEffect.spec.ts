/**
 * @file BaseEffect.spec.ts
 * @brief BaseEffectクラスのテスト
 * @details
 * - 初期化のテスト
 * - 入出力ノードの取得テスト
 * - エラー処理のテスト
 */

import { AudioEngine } from '@/core/AudioEngine';
import { BaseEffect } from '@/effects/base/BaseEffect';

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
  let audioEngine: AudioEngine;
  let effect: TestEffect;

  beforeEach(() => {
    audioEngine = new AudioEngine();
    effect = new TestEffect(audioEngine);
  });

  afterEach(async () => {
    await audioEngine.dispose();
  });

  describe('初期化', () => {
    it('正常に初期化できる', () => {
      expect(effect).toBeInstanceOf(TestEffect);
    });

    it('音声エンジンなしでは初期化できない', () => {
      expect(() => new TestEffect(null as unknown as AudioEngine)).toThrow();
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
      expect(effect['isEnabled']).toBe(true);
    });

    it('無効化できる', () => {
      effect.enable();
      effect.disable();
      expect(effect['isEnabled']).toBe(false);
    });
  });

  describe('エラー処理', () => {
    it('破棄後に操作するとエラーになる', async () => {
      await audioEngine.dispose();
      expect(() => effect.getInput()).toThrow('音声エンジンが破棄されています');
      expect(() => effect.getOutput()).toThrow('音声エンジンが破棄されています');
      expect(() => effect.enable()).toThrow('音声エンジンが破棄されています');
      expect(() => effect.disable()).toThrow('音声エンジンが破棄されています');
      expect(() => effect.setParameter('test', 0)).toThrow('音声エンジンが破棄されています');
      expect(() => effect.getParameter('test')).toThrow('音声エンジンが破棄されています');
    });

    it('二重破棄してもエラーにならない', async () => {
      await audioEngine.dispose();
      await expect(audioEngine.dispose()).resolves.not.toThrow();
    });
  });
}); 