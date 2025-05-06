/**
 * @file AudioEngine.ts
 * @brief Web Audio APIのラッパークラス
 * @details
 * - 音声コンテキストの管理
 * - マスターボリュームの制御
 * - エフェクトチェーンの管理
 * - エラー処理の統一
 * - サンプルの再生タイミング制御
 */

import { EffectChain } from '@/effects/EffectChain';
import { Filter } from '@/effects/Filter';

export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private isInitialized = false;
  private sampleTimings: Map<string, number> = new Map();
  private static readonly MAX_TIMING = 0.5;
  private isPlaying = false;
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private sampleSources: Map<string, AudioBufferSourceNode> = new Map();
  private sampleGains: Map<string, GainNode> = new Map();
  private startTime = 0;
  private sampleStartTimes: Map<string, number> = new Map();
  private effectChains: Map<string, EffectChain> = new Map();

  /**
   * AudioEngineのコンストラクタ
   * @throws {Error} Web Audio APIがサポートされていない場合
   */
  constructor() {
    try {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.isInitialized = true;
    } catch (error: unknown) {
      throw new Error(`AudioEngineの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * 音声コンテキストを取得
   * @returns {AudioContext} 音声コンテキスト
   * @throws {Error} 初期化されていない場合
   */
  public getContext(): AudioContext {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.context;
  }

  /**
   * マスターボリュームを設定
   * @param {number} volume - 0.0から1.0の範囲の音量値
   * @throws {Error} 初期化されていない場合、または無効な音量値の場合
   */
  public setMasterVolume(volume: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (volume < 0 || volume > 1) {
      throw new Error('音量は0.0から1.0の範囲で指定してください');
    }
    this.masterGain.gain.value = volume;
  }

  /**
   * マスターボリュームを取得
   * @returns {number} 現在のマスターボリューム値
   * @throws {Error} 初期化されていない場合
   */
  public getMasterVolume(): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.masterGain.gain.value;
  }

  /**
   * 音声ノードをマスターボリュームに接続
   * @param {AudioNode} node - 接続する音声ノード
   * @throws {Error} 初期化されていない場合
   */
  public connectToMaster(node: AudioNode): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    node.connect(this.masterGain);
  }

  /**
   * 音声コンテキストを一時停止
   * @throws {Error} 初期化されていない場合
   */
  public async suspend(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    await this.context.suspend();
  }

  /**
   * 音声コンテキストを再開
   * @throws {Error} 初期化されていない場合
   */
  public async resume(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    await this.context.resume();
  }

  /**
   * 音声コンテキストを破棄
   * @throws {Error} 初期化されていない場合
   */
  public async dispose(): Promise<void> {
    // 既に破棄されている場合は何もしない
    if (!this.isInitialized) {
      return;
    }
    // 音声コンテキストを破棄する前に、すべての接続を切断
    this.masterGain.disconnect();
    this.sampleGains.forEach(gain => gain.disconnect());
    // エフェクトチェーンの破棄を追加
    this.effectChains.forEach(chain => chain.dispose());
    this.effectChains.clear();
    // 音声コンテキストを破棄
    if (this.context.state !== 'closed') {
      await this.context.close();
    }
    // 初期化フラグをリセット
    this.isInitialized = false;
  }

  /**
   * サンプルの再生タイミングを設定
   * @param {string} sampleId - サンプルID
   * @param {number} timing - 0.0から0.5秒の範囲のタイミング値
   * @throws {Error} 初期化されていない場合、または無効なタイミング値の場合
   */
  public setTiming(sampleId: string, timing: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (timing < 0 || timing > AudioEngine.MAX_TIMING) {
      throw new Error(`タイミングは0から${AudioEngine.MAX_TIMING}秒の間で指定してください`);
    }
    this.sampleTimings.set(sampleId, timing);
  }

  /**
   * サンプルの再生タイミングを取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 現在のタイミング値
   * @throws {Error} 初期化されていない場合
   */
  public getTiming(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.sampleTimings.get(sampleId) || 0;
  }

  /**
   * サンプルの再生タイミングをリセット
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public resetTiming(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    this.sampleTimings.set(sampleId, 0);
  }

  /**
   * サンプルの音量を設定
   * @param {string} sampleId - サンプルID
   * @param {number} volume - 0.0から1.0の範囲の音量値
   * @throws {Error} 初期化されていない場合、または無効な音量値の場合
   */
  public setSampleVolume(sampleId: string, volume: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (volume < 0 || volume > 1) {
      throw new Error('音量は0.0から1.0の範囲で指定してください');
    }
    const gain = this.sampleGains.get(sampleId);
    if (gain) {
      gain.gain.value = volume;
    }
  }

  /**
   * サンプルの音量を取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 現在の音量値
   * @throws {Error} 初期化されていない場合
   */
  public getSampleVolume(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const gain = this.sampleGains.get(sampleId);
    return gain ? gain.gain.value : 0;
  }

  /**
   * 現在の再生時間を取得
   * @returns {number} 現在の再生時間（秒）
   * @throws {Error} 初期化されていない場合
   */
  public getCurrentTime(): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.isPlaying) {
      return 0;
    }

    // 各サンプルの再生開始時間を考慮して、最も進んでいる時間を返す
    const currentTime = this.context.currentTime;
    let maxProgress = 0;

    this.sampleStartTimes.forEach((startTime, sampleId) => {
      const timing = this.sampleTimings.get(sampleId) || 0;
      const progress = currentTime - startTime - timing;
      if (progress > maxProgress) {
        maxProgress = progress;
      }
    });

    return Math.max(0, maxProgress);
  }

  /**
   * サンプルを再生
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSample(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const buffer = this.sampleBuffers.get(sampleId);
    if (!buffer) {
      throw new Error(`サンプル${sampleId}が見つかりません`);
    }

    // 既存のソースを停止
    const existingSource = this.sampleSources.get(sampleId);
    if (existingSource) {
      try {
        existingSource.stop();
      } catch (error) {
        // 既に停止している場合は無視
        console.warn(`サンプル${sampleId}の停止に失敗しました: ${(error as Error).message}`);
      }
    }

    // 新しいソースを作成
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    // ゲインノードを作成または取得
    let gain = this.sampleGains.get(sampleId);
    if (!gain) {
      gain = this.context.createGain();
      this.sampleGains.set(sampleId, gain);
    }

    // 接続
    source.connect(gain);
    gain.connect(this.masterGain);
    this.sampleSources.set(sampleId, source);

    // タイミングを考慮して再生
    const timing = this.sampleTimings.get(sampleId) || 0;
    if (timing > 0) {
      setTimeout(() => {
        source.start();
        if (!this.isPlaying) {
          this.startTime = this.context.currentTime;
          this.isPlaying = true;
        }
        this.sampleStartTimes.set(sampleId, this.context.currentTime);
      }, timing * 1000);
    } else {
      source.start();
      if (!this.isPlaying) {
        this.startTime = this.context.currentTime;
        this.isPlaying = true;
      }
      this.sampleStartTimes.set(sampleId, this.context.currentTime);
    }
  }

  /**
   * すべてのサンプルを停止
   * @throws {Error} 初期化されていない場合
   */
  public stopAll(): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    this.sampleSources.forEach(source => {
      try {
        source.stop();
      } catch (error) {
        // 既に停止している場合は無視
      }
    });
    this.sampleSources.clear();
    this.sampleStartTimes.clear();
    this.isPlaying = false;
    this.startTime = 0;
  }

  /**
   * サンプルを読み込み
   * @param {string} sampleId - サンプルID
   * @param {ArrayBuffer} audioData - 音声データ
   * @throws {Error} 初期化されていない場合、または音声データの読み込みに失敗した場合
   */
  public async loadSample(sampleId: string, audioData: ArrayBuffer): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    try {
      const buffer = await this.context.decodeAudioData(audioData);
      this.sampleBuffers.set(sampleId, buffer);
    } catch (error) {
      throw new Error(`サンプル${sampleId}の読み込みに失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * サンプルの再生時間を取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 再生時間（秒）
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public getSampleDuration(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const buffer = this.sampleBuffers.get(sampleId);
    if (!buffer) {
      throw new Error(`サンプル${sampleId}が見つかりません`);
    }
    return buffer.duration;
  }

  /**
   * すべてのサンプルの最大再生時間を取得
   * @returns {number} 最大再生時間（秒）
   * @throws {Error} 初期化されていない場合
   */
  public getMaxDuration(): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return Math.max(
      ...Array.from(this.sampleBuffers.values()).map(buffer => buffer.duration)
    );
  }

  /**
   * サンプル用のエフェクトチェーンを作成
   * @param {string} sampleId - サンプルID
   * @returns {EffectChain} 作成されたエフェクトチェーン
   * @throws {Error} 初期化されていない場合
   */
  public createEffectChain(sampleId: string): EffectChain {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const chain = new EffectChain(this.context);
    this.effectChains.set(sampleId, chain);
    return chain;
  }

  /**
   * サンプルのエフェクトチェーンを取得
   * @param {string} sampleId - サンプルID
   * @returns {EffectChain | undefined} エフェクトチェーン
   * @throws {Error} 初期化されていない場合
   */
  public getEffectChain(sampleId: string): EffectChain | undefined {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.effectChains.get(sampleId);
  }

  /**
   * サンプルのエフェクトチェーンを削除
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public removeEffectChain(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const chain = this.effectChains.get(sampleId);
    if (chain) {
      chain.dispose();
      this.effectChains.delete(sampleId);
    }
  }

  /**
   * サンプルのフィルター角度を設定
   * @param {string} sampleId - サンプルID
   * @param {number} angle - フィルターノブの回転角度（-135度〜135度）
   * @throws {Error} 初期化されていない場合、または無効な角度値の場合
   */
  public setFilterAngle(sampleId: string, angle: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (angle < -135 || angle > 135) {
      throw new Error('フィルター角度は-135度から135度の範囲で指定してください');
    }
    const chain = this.getEffectChain(sampleId);
    if (chain) {
      const filter = chain.getFilter();
      if (filter) {
        filter.setKnobAngle(angle);
      }
    }
  }

  /**
   * サンプルのフィルター角度を取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 現在のフィルター角度
   * @throws {Error} 初期化されていない場合
   */
  public getFilterAngle(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const chain = this.getEffectChain(sampleId);
    if (chain) {
      const filter = chain.getFilter();
      if (filter) {
        return filter.getState().knobAngle;
      }
    }
    return 0;
  }

  /**
   * サンプルのフィルターをリセット
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public resetFilter(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const chain = this.getEffectChain(sampleId);
    if (chain) {
      const filter = chain.getFilter();
      if (filter) {
        filter.reset();
      }
    }
  }

  /**
   * サンプルにフィルターを追加
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public addFilter(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const chain = this.getEffectChain(sampleId);
    if (chain) {
      const filter = new Filter(this.context);
      chain.addEffect(filter);
    }
  }

  /**
   * サンプルからフィルターを削除
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public removeFilter(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const chain = this.getEffectChain(sampleId);
    if (chain) {
      const filter = chain.getFilter();
      if (filter) {
        chain.removeEffect(filter);
      }
    }
  }
} 