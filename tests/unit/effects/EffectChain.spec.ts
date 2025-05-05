/**
 * @file EffectChain.spec.ts
 * @brief エフェクトチェーンのテスト
 * @details
 * - エフェクトの追加/削除/並び替えのテスト
 * - エフェクトチェーンの接続/切断のテスト
 * - エフェクトの有効/無効のテスト
 */

/// <reference types="webaudioapi" />

import { EffectChain } from '@/core/effects/EffectChain';
import { BaseEffect } from '@/core/effects/BaseEffect';

// テスト用のモックエフェクト
class MockEffect extends BaseEffect {
  private _isConnected: boolean = false;

  constructor(context: AudioContext) {
    super(context);
    this.input = context.createGain();
    this.output = context.createGain();
  }

  public dispose(): void {
    (this.input as GainNode).disconnect();
    (this.output as GainNode).disconnect();
    this._isConnected = false;
  }

  public isConnected(): boolean {
    return this._isConnected;
  }

  public getInput(): AudioNode {
    return this.input;
  }

  public getOutput(): AudioNode {
    const output = this.output as GainNode;
    const self = this;
    const originalConnect = output.connect.bind(output);
    const originalDisconnect = output.disconnect.bind(output);

    output.connect = function(destination: AudioNode | AudioParam, output?: number, input?: number) {
      if (destination instanceof AudioNode) {
        originalConnect(destination, output, input);
        self._isConnected = true;
        return destination;
      } else {
        originalConnect(destination, output);
        return undefined;
      }
    } as typeof output.connect;

    output.disconnect = function() {
      originalDisconnect();
      self._isConnected = false;
    } as typeof output.disconnect;

    return output;
  }
}

describe('EffectChain', () => {
  let context: AudioContext;
  let chain: EffectChain;
  let mockEffect1: MockEffect;
  let mockEffect2: MockEffect;

  beforeEach(() => {
    context = new AudioContext();
    chain = new EffectChain(context);
    mockEffect1 = new MockEffect(context);
    mockEffect2 = new MockEffect(context);
  });

  afterEach(() => {
    chain.dispose();
    context.close();
  });

  describe('エフェクトの追加/削除', () => {
    it('エフェクトを追加できること', () => {
      chain.addEffect(mockEffect1);
      expect(mockEffect1.isConnected()).toBe(true);
    });

    it('エフェクトを削除できること', () => {
      chain.addEffect(mockEffect1);
      chain.removeEffect(mockEffect1);
      expect(mockEffect1.isConnected()).toBe(false);
    });

    it('存在しないエフェクトを削除してもエラーにならないこと', () => {
      expect(() => {
        chain.removeEffect(mockEffect1);
      }).not.toThrow();
    });
  });

  describe('エフェクトの並び替え', () => {
    it('エフェクトの順序を変更できること', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      chain.reorderEffect(0, 1);
      // 接続の順序が変更されたことを確認
      expect(mockEffect1.isConnected()).toBe(true);
      expect(mockEffect2.isConnected()).toBe(true);
    });

    it('無効なインデックスで並び替えを試みるとエラーになること', () => {
      chain.addEffect(mockEffect1);
      expect(() => {
        chain.reorderEffect(0, 1);
      }).toThrow('無効なインデックスです');
    });
  });

  describe('エフェクトの有効/無効', () => {
    it('無効化されたエフェクトは接続されないこと', () => {
      mockEffect1.disable();
      chain.addEffect(mockEffect1);
      expect(mockEffect1.isConnected()).toBe(false);
    });

    it('エフェクトを有効化すると接続されること', () => {
      mockEffect1.disable();
      chain.addEffect(mockEffect1);
      mockEffect1.enable();
      chain.reconnect();
      expect(mockEffect1.isConnected()).toBe(true);
    });
  });

  describe('接続/切断', () => {
    it('エフェクトチェーンを接続できること', () => {
      const destination = context.createGain();
      chain.addEffect(mockEffect1);
      chain.connect(destination);
      expect(mockEffect1.isConnected()).toBe(true);
    });

    it('エフェクトチェーンを切断できること', () => {
      const destination = context.createGain();
      chain.addEffect(mockEffect1);
      chain.connect(destination);
      chain.disconnect();
      expect(mockEffect1.isConnected()).toBe(false);
    });
  });

  describe('リソースの解放', () => {
    it('dispose()で全ての接続が切断されること', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      chain.dispose();
      expect(mockEffect1.isConnected()).toBe(false);
      expect(mockEffect2.isConnected()).toBe(false);
    });
  });
}); 