/**
 * @file AudioEngine.spec.ts
 * @brief AudioEngineクラスのテスト
 * @details
 * - 初期化のテスト
 * - マスターボリュームの制御テスト
 * - エラー処理のテスト
 */

import { AudioEngine } from '@/core/AudioEngine';

describe('AudioEngine', () => {
  let audioEngine: AudioEngine;

  beforeEach(() => {
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
}); 