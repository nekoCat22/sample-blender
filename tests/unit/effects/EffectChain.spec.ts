/**
 * @file EffectChain.spec.ts
 * @brief EffectChainクラスのテスト
 * @details
 * - エフェクトの追加/削除テスト
 * - 接続/切断テスト
 * - エフェクトの有効/無効テスト
 */

import { BaseEffect } from '@/effects/base/BaseEffect';
import { EffectChain } from '@/effects/EffectChain';

// AudioContextの型定義
declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

// テスト用の具象クラス
class TestEffect extends BaseEffect {
  constructor(context: AudioContext) {
    super(context);
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
  }

  public setParameter(param: string, value: number): void {
    // テスト用の実装
  }

  public getParameter(param: string): number {
    return 0; // テスト用の実装
  }
}

describe('EffectChain', () => {
  let context: AudioContext;
  let effectChain: EffectChain;
  let effect1: TestEffect;
  let effect2: TestEffect;

  beforeEach(() => {
    // jsdomのAudioContextを使用
    context = new (window.AudioContext || window.webkitAudioContext)();
    effectChain = new EffectChain(context);
    effect1 = new TestEffect(context);
    effect2 = new TestEffect(context);
  });

  afterEach(() => {
    effectChain.dispose();
  });

  it('エフェクトを追加できること', () => {
    effectChain.addEffect(effect1);
    effectChain.addEffect(effect2);
    
    // エフェクトが追加されたことを確認
    const effects = (effectChain as any).effects;
    expect(effects).toContain(effect1);
    expect(effects).toContain(effect2);
    expect(effects.length).toBe(2);
  });

  it('エフェクトを削除できること', () => {
    effectChain.addEffect(effect1);
    effectChain.removeEffect(effect1);
    
    // エフェクトが削除されたことを確認
    const effects = (effectChain as any).effects;
    expect(effects).not.toContain(effect1);
    expect(effects.length).toBe(0);
  });

  it('エフェクトの有効/無効が反映されること', () => {
    effectChain.addEffect(effect1);
    
    // エフェクトを有効化
    effect1.enable();
    expect(effect1.isEffectEnabled()).toBe(true);
    
    // エフェクトを無効化
    effect1.disable();
    expect(effect1.isEffectEnabled()).toBe(false);
  });

  it('エフェクトチェーンを破棄できること', () => {
    effectChain.addEffect(effect1);
    effectChain.dispose();
    
    // エフェクトチェーンが破棄されたことを確認
    const effects = (effectChain as any).effects;
    expect(effects.length).toBe(0);
    // エフェクトが無効になっていることを確認
    expect(effect1.isEffectEnabled()).toBe(false);
  });
}); 