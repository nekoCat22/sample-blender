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
  private sampleBuffers: Map<number, AudioBuffer> = new Map();
  private sampleSources: Map<number, AudioBufferSourceNode> = new Map();
  private sampleGains: Map<number, GainNode> = new Map();
  private sampleStartTimes: Map<number, number> = new Map();
  private sampleTimings: Map<number, number> = new Map();
  private samplePitches: Map<number, number> = new Map();

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

  // ===== 音声経路初期化と接続 =====

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
   * サンプルをエフェクトチェーンに接続
   * @param {number} channelId - チャンネルID
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public connectSampleToEffectChain(channelId: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
  
    try {
      const sampleGain = this.sampleGains.get(channelId);
      if (!sampleGain) {
        throw new Error(`チャンネル ${channelId} が見つかりません`);
      }
  
      let effectChainIndex: number;
  
      if (channelId === 1) {
        effectChainIndex = 1; // チャンネル1はインデックス 1
      } else if (channelId === 2) {
        effectChainIndex = 2; // チャンネル2はインデックス 2
      } else if (channelId === 3) {
        effectChainIndex = 3; // チャンネル3はインデックス 3
      } else {
        console.warn(`不明な channelId: ${channelId}`);
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
      throw new Error(`チャンネル ${channelId} の接続に失敗しました: ${(error as Error).message}`);
    }
  }

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
      masterEffectChain.addEffect(this.effectsManager.getEffect(0, 'filter'));
      this.effectChains[0] = masterEffectChain;
  
      // チャンネル1用エフェクトチェーン
      const channel1EffectChain = new EffectChain(this.context);
      channel1EffectChain.addEffect(this.effectsManager.getEffect(1, 'filter'));
      this.effectChains[1] = channel1EffectChain;
  
      // チャンネル2用エフェクトチェーン
      const channel2EffectChain = new EffectChain(this.context);
      channel2EffectChain.addEffect(this.effectsManager.getEffect(2, 'filter'));
      this.effectChains[2] = channel2EffectChain;
  
      // チャンネル3用エフェクトチェーン
      const channel3EffectChain = new EffectChain(this.context);
      channel3EffectChain.addEffect(this.effectsManager.getEffect(3, 'filter'));
      this.effectChains[3] = channel3EffectChain;

      // マスターのEffectChainの出力をマスターゲインに接続
      this.effectChains[0].getOutput().connect(this.masterGain);
    } catch (error) {
      throw new Error(`エフェクトチェーンの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  // ===== 破棄関連 =====

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

  // ===== サンプル管理 =====

  /**
   * サンプルを読み込み
   * @param {number} channelId - チャンネルID
   * @param {ArrayBuffer} audioData - 音声データ
   */
  public async loadSample(channelId: number, audioData: ArrayBuffer): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    try {
      const buffer = await this.context.decodeAudioData(audioData);
      this.sampleBuffers.set(channelId, buffer);

      // ゲインノードを作成
      const gain = this.context.createGain();
      this.sampleGains.set(channelId, gain);

      // サンプルをエフェクトチェーンに接続
      this.connectSampleToEffectChain(channelId);
    } catch (error) {
      throw new Error(`チャンネル ${channelId} の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===== 再生の制御 =====

  /**
   * サンプルを再生
   * @param {number} channelId - チャンネルID
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSample(channelId: number): void {
    this.playSamples([channelId]);
  }

  /**
   * 複数のサンプルを同時に再生
   * @param {number[]} channelIds - 再生するチャンネルIDの配列
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSamples(channelIds: number[]): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    // 既存の再生を停止
    this.stopAll();

    // アクティブなサンプル数をリセット
    this.activeSampleCount = channelIds.length;

    // 各サンプルを再生
    channelIds.forEach(channelId => {
      const buffer = this.sampleBuffers.get(channelId);
      if (!buffer) {
        throw new Error(`チャンネル ${channelId} が見つかりません`);
      }

      // 新しいソースを作成
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = this.getSamplePitchRate(channelId);

      // ゲインノードを取得
      const gain = this.sampleGains.get(channelId);
      if (!gain) {
        throw new Error(`チャンネル ${channelId} のゲインノードが見つかりません`);
      }

      // 既存の接続を切断してから新しい接続を作成
      gain.disconnect();
      source.connect(gain);
      // サンプルをエフェクトチェーンに再接続
      this.connectSampleToEffectChain(channelId);

      // タイミングを設定（既に0-0.5の範囲に変換済みの値を使用）
      const timing = this.sampleTimings.get(channelId) || 0;
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
      this.sampleSources.set(channelId, source);
      this.sampleStartTimes.set(channelId, startTime);
    });

    // 再生状態を更新
    this.isPlaying = true;
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

  /**
   * 再生終了時のコールバックを設定
   * @param {() => void} callback - 再生終了時に呼び出されるコールバック関数
   */
  public setOnPlaybackEnd(callback: () => void): void {
    this.onPlaybackEndCallback = callback;
  }  

  // ===== 各パラメータ制御 =====

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

  // ===== サンプルの音量の制御 =====

  /**
   * サンプルの音量を設定
   * @param {number} channelId - チャンネルID
   * @param {number} volume - 0.0から1.0の範囲の音量値
   * @throws {Error} 初期化されていない場合、または無効な音量値の場合
   */
  public setSampleVolume(channelId: number, volume: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (volume < 0 || volume > 1) {
      throw new Error('音量は0.0から1.0の範囲で指定してください');
    }
    const gain = this.sampleGains.get(channelId);
    if (gain) {
      gain.gain.value = volume;
    }
  }
  
  // ===== タイミング制御 =====

  /**
   * サンプルの再生タイミングを保存
   * @param {number} channelId - チャンネルID
   * @param {number} timing - 0.0から1.0の範囲のタイミング値（内部で0.0から0.5秒に変換）
   * @throws {Error} 初期化されていない場合、または無効なタイミング値の場合
   */
  public saveTiming(channelId: number, timing: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (timing < 0 || timing > 1) {
      throw new Error('タイミングは0から1の範囲で指定してください');
    }
    // 0-1の値を0-0.5の範囲に変換
    const convertedTiming = timing * AudioEngine.MAX_TIMING;
    this.sampleTimings.set(channelId, convertedTiming);
  }

  /**
   * サンプルの再生タイミングを取得
   * @param {number} channelId - チャンネルID
   * @returns {number} 現在のタイミング値（0.0から0.5秒の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public getTiming(channelId: number): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.sampleTimings.get(channelId) || 0;
  }

  // ===== ピッチ制御 =====

  /**
   * サンプルのピッチレートを保存
   * @param {number} channelId - チャンネルID
   * @param {number} value - ピッチ値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合、または無効なピッチ値の場合
   */
  public saveSamplePitchRate(channelId: number, value: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.sampleBuffers.has(channelId)) {
      throw new Error(`チャンネル ${channelId} が見つかりません`);
    }
    if (value < AudioEngine.MIN_PITCH || value > AudioEngine.MAX_PITCH) {
      throw new Error(`ピッチ値は${AudioEngine.MIN_PITCH}から${AudioEngine.MAX_PITCH}の範囲で指定してください`);
    }

    let playbackRate: number;
    if (value < 0.5) {
      // 0.0-0.5の範囲を0.5-1.0の範囲に変換
      playbackRate = AudioEngine.MIN_PLAYBACK_RATE + (value * 2 * (AudioEngine.DEFAULT_PLAYBACK_RATE - AudioEngine.MIN_PLAYBACK_RATE));
    } else if (value > 0.5) {
      // 0.5-1.0の範囲を1.0-2.0の範囲に変換
      playbackRate = AudioEngine.DEFAULT_PLAYBACK_RATE + ((value - 0.5) * 2 * (AudioEngine.MAX_PLAYBACK_RATE - AudioEngine.DEFAULT_PLAYBACK_RATE));
    } else {
      // 0.5の場合はデフォルト値
      playbackRate = AudioEngine.DEFAULT_PLAYBACK_RATE;
    }

    this.samplePitches.set(channelId, playbackRate);
  }

  /**
   * サンプルのピッチレートを取得
   * @param {number} channelId - チャンネルID
   * @returns {number} 現在のピッチレート（0.5から2.0の範囲）
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public getSamplePitchRate(channelId: number): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.sampleBuffers.has(channelId)) {
      throw new Error(`チャンネル ${channelId} が見つかりません`);
    }
    return this.samplePitches.get(channelId) ?? AudioEngine.DEFAULT_PLAYBACK_RATE;
  }

  // ===== エフェクト管理 =====

  /**
   * フィルターの値を更新
   * @param {number} channelId - チャンネルID
   * @param {number} value - 0.0から1.0の範囲の値
   * @throws {Error} 初期化されていない場合、またはフィルターが存在しない場合
   */
  public setFilterValue(channelId: number, value: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    try {
      this.effectsManager.setEffectValue(channelId as ChannelType, 'filter', value);
    } catch (error) {
      throw new Error(`フィルターの更新に失敗しました: ${(error as Error).message}`);
    }
  }

  // ===== UIの表示・メーター更新用メソッド =====

  /**
   * マスターボリュームを取得
   * @returns {number} 現在のマスターボリューム値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public getMasterVolume(): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.masterGain.gain.value;
  }

  /**
   * サンプルの音量を取得
   * @param {number} channelId - チャンネルID
   * @returns {number} 現在の音量値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public getSampleVolume(channelId: number): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const gain = this.sampleGains.get(channelId);
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

    this.sampleStartTimes.forEach((startTime, channelId) => {
      const timing = this.sampleTimings.get(channelId) || 0;
      const progress = currentTime - startTime - timing;
      if (progress > maxProgress) {
        maxProgress = progress;
      }
    });

    return Math.max(0, maxProgress);
  }

  /**
   * サンプルの長さを取得
   * @param {number} channelId - チャンネルID
   * @returns {number} サンプルの長さ（秒）
   * @throws {Error} 初期化されていない場合
   */
  public getSampleDuration(channelId: number): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    const buffer = this.sampleBuffers.get(channelId);
    return buffer ? buffer.duration : 0;
  }

  /**
   * 最長のサンプルの長さを取得
   * @returns {number} 最長のサンプルの長さ（秒）
   * @throws {Error} 初期化されていない場合
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
} 