/**
 * @file AudioEngine.ts
 * @brief Web Audio APIのラッパークラス
 * @details
 * - 音声コンテキストの管理
 * - マスターボリュームの制御
 * - サンプルの再生管理
 * - エラー処理の統一
 * - サンプルの再生タイミング制御
 * - 再生終了イベントの通知
 * - エフェクトチェーン
 * - サンプルのピッチ制御
 * - エフェクトの種類と値をEffectsManagerに渡す 
 */

import { EffectChain } from '@/effects/EffectChain'
import { EffectsManager, ChannelType } from './EffectsManager'
// BaseEffectはFilterが継承してるため、インポートが必須だが、ESLintのエラーが出るため無視する文
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { BaseEffect } from '@/effects/base/BaseEffect'

export class AudioEngine {
  // 定数定義
  private static readonly MAX_TIMING = 0.5;
  private static readonly MIN_PITCH = 0.0;
  private static readonly MAX_PITCH = 1.0;
  private static readonly DEFAULT_PITCH = 0.5;
  private static readonly MIN_PLAYBACK_RATE = 0.5;  // 最小再生速度（半速）
  private static readonly MAX_PLAYBACK_RATE = 2.0;  // 最大再生速度（2倍速）
  private static readonly DEFAULT_PLAYBACK_RATE = 1.0;  // デフォルト再生速度（通常速度）

  // 基本プロパティ
  private context: AudioContext;
  private masterGain!: GainNode;  // 初期化はinitMasterGainで行うので、!を使用
  private isInitialized = false;
  private isPlaying = false;
  private startTime = 0;
  private onPlaybackEndCallback: (() => void) | null = null;
  private activeSampleCount = 0;

  // サンプル関連のプロパティ
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private sampleSources: Map<string, AudioBufferSourceNode> = new Map();
  private sampleGains: Map<string, GainNode> = new Map();
  private sampleStartTimes: Map<string, number> = new Map();
  private sampleTimings: Map<string, number> = new Map();
  private samplePitches: Map<string, number> = new Map();

  // エフェクト関連のプロパティ
  private effectChains: EffectChain[] = [];
  private effectsManager: EffectsManager;

  // ===== 初期化・破棄関連 =====

  /**
   * AudioEngineのコンストラクタ
   * @throws {Error} Web Audio APIがサポートされていない場合
   */
  constructor() {
    try {
      this.context = new AudioContext();
      this.isInitialized = true;  // 初期化フラグを先に設定
      this.initMasterGain();
      
      // EffectsManagerの初期化
      this.effectsManager = new EffectsManager(this.context);
      
      // エフェクトチェーンの初期化
      this.initEffectChains();
    } catch (error: unknown) {
      throw new Error(`AudioEngineの初期化に失敗しました: ${(error as Error).message}`);
    }
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

    // エフェクトチェーンを破棄
    this.effectChains.forEach(chain => {
      if (chain && typeof chain.dispose === 'function') {
        chain.dispose();
      }
    });
    this.effectChains = [];

    // EffectsManagerの破棄
    this.effectsManager.dispose();

    // 音声コンテキストを破棄する前に、すべての接続を切断
    this.masterGain.disconnect();
    this.sampleGains.forEach(gain => gain.disconnect());

    // 音声コンテキストを破棄
    if (this.context.state !== 'closed') {
      await this.context.close();
    }

    // 初期化フラグをリセット
    this.isInitialized = false;
  }

  // ===== マスターボリューム制御 =====

  /**
   * マスターボリュームを設定
   * @param {number} value - マスターボリューム値（0.0 から 1.0）
   * @throws {Error} 初期化されていない場合、または値が範囲外の場合
   */
  public setMasterVolume(value: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (value < 0 || value > 1) {
      throw new Error('マスターボリュームは0.0から1.0の範囲で指定してください');
    }
    this.masterGain.gain.value = value;
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

  // ===== サンプル管理 =====

  /**
   * サンプルを読み込み
   * @param {string} sampleId - サンプルID
   * @param {ArrayBuffer} audioData - 音声データ
   */
  public async loadSample(sampleId: string, audioData: ArrayBuffer): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    try {
      const buffer = await this.context.decodeAudioData(audioData);
      this.sampleBuffers.set(sampleId, buffer);

      // ゲインノードを作成
      const gain = this.context.createGain();
      this.sampleGains.set(sampleId, gain);

      // サンプルをエフェクトチェーンに接続
      this.connectSampleToEffectChain(sampleId);
    } catch (error) {
      throw new Error(`サンプル ${sampleId} の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }

    // 既存のソースを停止
    const existingSource = this.sampleSources.get(sampleId);
    if (existingSource) {
      existingSource.stop();
      existingSource.disconnect();
    }

    // 新しいソースを作成
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = this.getSamplePitchRate(sampleId);

    // ゲインノードを取得
    const gain = this.sampleGains.get(sampleId);
    if (!gain) {
      throw new Error(`サンプル ${sampleId} のゲインノードが見つかりません`);
    }

    // 既存の接続を切断してから新しい接続を作成
    gain.disconnect();
    source.connect(gain);
    // サンプルをエフェクトチェーンに再接続
    this.connectSampleToEffectChain(sampleId);

    // 再生開始
    const timing = this.sampleTimings.get(sampleId) || 0;
    source.start(this.context.currentTime + timing);
    this.sampleSources.set(sampleId, source);
    this.sampleStartTimes.set(sampleId, this.context.currentTime);

    // 再生状態を更新
    this.isPlaying = true;
  }

  /**
   * 複数のサンプルを同時に再生
   * @param {string[]} sampleIds - 再生するサンプルIDの配列
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSamples(sampleIds: string[]): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    // 既存の再生を停止
    this.stopAll();

    // アクティブなサンプル数をリセット
    this.activeSampleCount = sampleIds.length;

    // 各サンプルを再生
    sampleIds.forEach(sampleId => {
      const buffer = this.sampleBuffers.get(sampleId);
      if (!buffer) {
        throw new Error(`サンプル ${sampleId} が見つかりません`);
      }

      // 新しいソースを作成
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.getSamplePitchRate(sampleId);

      // ゲインノードを取得
      const gain = this.sampleGains.get(sampleId);
      if (!gain) {
        throw new Error(`サンプル ${sampleId} のゲインノードが見つかりません`);
      }

      // 既存の接続を切断してから新しい接続を作成
      gain.disconnect();
      source.connect(gain);
      // サンプルをエフェクトチェーンに再接続
      this.connectSampleToEffectChain(sampleId);

      // タイミングを設定（既に0-0.5の範囲に変換済みの値を使用）
      const timing = this.sampleTimings.get(sampleId) || 0;
      const startTime = this.context.currentTime + timing;

      // 再生終了時のイベントを設定
      source.onended = () => {
        this.activeSampleCount--;
        if (this.activeSampleCount === 0 && this.onPlaybackEndCallback) {
          this.onPlaybackEndCallback();
        }
      };

      // 再生開始
      source.start(startTime);
      this.sampleSources.set(sampleId, source);
      this.sampleStartTimes.set(sampleId, startTime);
    });

    // 再生状態を更新
    this.isPlaying = true;
  }

  /**
   * すべてのサンプルを停止
   */
  public stopAll(): void {
    this.sampleSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (error) {
        // 既に停止している場合は無視
      }
    });
    this.sampleSources.clear();
    this.sampleStartTimes.clear();
    this.isPlaying = false;
  }

  // ===== タイミング制御 =====

  /**
   * サンプルの再生タイミングを設定
   * @param {string} sampleId - サンプルID
   * @param {number} timing - 0.0から1.0の範囲のタイミング値（内部で0.0から0.5秒に変換）
   * @throws {Error} 初期化されていない場合、または無効なタイミング値の場合
   */
  public setTiming(sampleId: string, timing: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (timing < 0 || timing > 1) {
      throw new Error('タイミングは0から1の範囲で指定してください');
    }
    // 0-1の値を0-0.5の範囲に変換
    const convertedTiming = timing * AudioEngine.MAX_TIMING;
    this.sampleTimings.set(sampleId, convertedTiming);
  }

  /**
   * サンプルの再生タイミングを取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 現在のタイミング値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public getTiming(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    // 0-0.5の値を0-1の範囲に変換して返す
    const timing = this.sampleTimings.get(sampleId) || 0;
    return timing / AudioEngine.MAX_TIMING;
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

  // ===== ピッチ制御 =====

  /**
   * サンプルのピッチレートを保存
   * @param {string} sampleId - サンプルID
   * @param {number} value - ピッチ値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合、または無効なピッチ値の場合
   */
  public saveSamplePitchRate(sampleId: string, value: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.sampleBuffers.has(sampleId)) {
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }
    if (value < AudioEngine.MIN_PITCH || value > AudioEngine.MAX_PITCH) {
      throw new Error(`ピッチ値は${AudioEngine.MIN_PITCH}から${AudioEngine.MAX_PITCH}の範囲で指定してください`);
    }

    // 0-1の値を0.5-2.0の範囲に変換
    const playbackRate = AudioEngine.MIN_PLAYBACK_RATE + 
      (value * (AudioEngine.MAX_PLAYBACK_RATE - AudioEngine.MIN_PLAYBACK_RATE));
    this.samplePitches.set(sampleId, playbackRate);
  }

  /**
   * サンプルのピッチレートを取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 現在のピッチレート（0.5から2.0の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public getSamplePitchRate(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.sampleBuffers.has(sampleId)) {
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }
    return this.samplePitches.get(sampleId) ?? AudioEngine.DEFAULT_PLAYBACK_RATE;
  }

  /**
   * サンプルのピッチレートをリセット
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public resetSamplePitchRate(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.sampleBuffers.has(sampleId)) {
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }
    this.saveSamplePitchRate(sampleId, AudioEngine.DEFAULT_PITCH);
  }

  // ===== エフェクトチェーン管理 =====

  /**
   * フィルターの値を更新
   * @param {number} keyNumber - フィルターのインデックス
   * @param {number} value - 0.0から1.0の範囲の値
   * @throws {Error} 初期化されていない場合、またはフィルターが存在しない場合
   */
  public setFilterValue(keyNumber: number, value: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    let channelType: ChannelType;
    switch (keyNumber) {
      case 0:
        channelType = 'master';
        break;
      case 1:
        channelType = 'channel1';
        break;
      case 2:
        channelType = 'channel2';
        break;
      case 3:
        channelType = 'channel3';
        break;
      default:
        throw new Error(`無効なフィルターインデックスです: ${keyNumber}`);
    }

    try {
      this.effectsManager.setEffectValue(channelType, value);
    } catch (error) {
      throw new Error(`フィルターの更新に失敗しました: ${(error as Error).message}`);
    }
  }

  // ===== ユーティリティ関数 =====

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
   * サンプルの長さを取得
   * @param {string} sampleId - サンプルID
   * @returns {number} サンプルの長さ（秒）
   */
  public getSampleDuration(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const buffer = this.sampleBuffers.get(sampleId);
    return buffer ? buffer.duration : 0;
  }

  /**
   * 最長のサンプルの長さを取得
   * @returns {number} 最長のサンプルの長さ（秒）
   */
  public getMaxDuration(): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    let maxDuration = 0;
    this.sampleBuffers.forEach(buffer => {
      if (buffer.duration > maxDuration) {
        maxDuration = buffer.duration;
      }
    });
    return maxDuration;
  }

  /**
   * 再生終了時のコールバックを設定
   * @param {() => void} callback - 再生終了時に呼び出されるコールバック関数
   */
  public setOnPlaybackEnd(callback: () => void): void {
    this.onPlaybackEndCallback = callback;
  }

  /**
   * サンプルのゲインノードを取得
   * @param {string} sampleId - サンプルID
   * @returns {GainNode | undefined} ゲインノード
   * @throws {Error} 初期化されていない場合
   */
  public getSampleGain(sampleId: string): GainNode | undefined {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.sampleGains.get(sampleId);
  }

  // ===== プライベートメソッド =====

  /**
   * マスターゲインの初期化と接続
   * @throws {Error} 初期化に失敗した場合
   */
  private initMasterGain(): void {
    try {
      this.masterGain = this.context.createGain();
      // マスターゲインを出力に接続
      this.connectMasterGainToOutput();
    } catch (error) {
      throw new Error(`マスターゲインの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * マスターゲインを出力に接続
   * @throws {Error} 初期化されていない場合
   */
  private connectMasterGainToOutput(): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    try {
      this.masterGain.disconnect();
      this.masterGain.connect(this.context.destination);
    } catch (error) {
      throw new Error(`マスターゲインの接続に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * エフェクトチェーンの初期化
   * @throws {Error} 初期化に失敗した場合
   */
  private initEffectChains(): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
  
    try {
      // マスター用エフェクトチェーン
      const masterEffectChain = new EffectChain(this.context);
      masterEffectChain.addEffect(this.effectsManager.getEffect('master') as unknown as BaseEffect);
      this.effectChains[0] = masterEffectChain;
  
      // チャンネル1用エフェクトチェーン
      const channel1EffectChain = new EffectChain(this.context);
      channel1EffectChain.addEffect(this.effectsManager.getEffect('channel1') as unknown as BaseEffect);
      this.effectChains[1] = channel1EffectChain;
  
      // チャンネル2用エフェクトチェーン
      const channel2EffectChain = new EffectChain(this.context);
      channel2EffectChain.addEffect(this.effectsManager.getEffect('channel2') as unknown as BaseEffect);
      this.effectChains[2] = channel2EffectChain;
  
      // チャンネル3用エフェクトチェーン
      const channel3EffectChain = new EffectChain(this.context);
      channel3EffectChain.addEffect(this.effectsManager.getEffect('channel3') as unknown as BaseEffect);
      this.effectChains[3] = channel3EffectChain;

      // マスターのEffectChainの出力をマスターゲインに接続
      this.effectChains[0].getOutput().connect(this.masterGain);
    } catch (error) {
      throw new Error(`エフェクトチェーンの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * サンプルをエフェクトチェーンに接続
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public connectSampleToEffectChain(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
  
    try {
      const sampleGain = this.sampleGains.get(sampleId);
      if (!sampleGain) {
        throw new Error(`サンプル ${sampleId} が見つかりません`);
      }
  
      const sampleNumber = parseInt(sampleId, 10);
      let effectChainIndex: number;
  
      if (sampleNumber === 1) {
        effectChainIndex = 1; // サンプル1はインデックス 1
      } else if (sampleNumber === 2) {
        effectChainIndex = 2; // サンプル2はインデックス 2
      } else if (sampleNumber === 3) {
        effectChainIndex = 3; // サンプル3はインデックス 3
      } else {
        console.warn(`不明な sampleId: ${sampleId}`);
        return;
      }
  
      if (!this.effectChains[effectChainIndex]) {
        throw new Error(`エフェクトチェーン ${effectChainIndex} が見つかりません`);
      }
      if (!this.effectChains[0]) {
        throw new Error('マスターエフェクトチェーンが見つかりません');
      }
  
      // サンプルの出力を対応するEffectChainに接続
      sampleGain.disconnect();
      sampleGain.connect(this.effectChains[effectChainIndex].getInput());
  
      // EffectChainの出力をマスターのEffectChainに接続
      this.effectChains[effectChainIndex].getOutput().disconnect();
      this.effectChains[effectChainIndex].getOutput().connect(this.effectChains[0].getInput());
  
    } catch (error) {
      throw new Error(`サンプル ${sampleId} の接続に失敗しました: ${(error as Error).message}`);
    }
  }
} 