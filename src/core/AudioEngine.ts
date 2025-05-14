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
 * - エフェクトチェーンとフィルターの管理
 * - サンプルのピッチ制御
 */

import { EffectChain } from '@/effects/EffectChain'
import { Filter } from '@/effects/Filter'
// BaseEffectはFilterが継承してるため、インポートが必須だが、ESLintのエラーが出るため無視する文
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { BaseEffect } from '@/effects/base/BaseEffect'

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
  private onPlaybackEndCallback: (() => void) | null = null;
  private activeSampleCount = 0;
  private effectChains: EffectChain[] = [];
  private filters: Filter[] = [];
  private samplePitches: Map<string, number> = new Map();
  private static readonly MIN_PITCH = 0.5;
  private static readonly MAX_PITCH = 2.0;
  private static readonly DEFAULT_PITCH = 1.0;

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
      
      // フィルターの初期化
      this.initFilters();
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

    // エフェクトチェーンを破棄
    this.effectChains.forEach(chain => {
      if (chain && typeof chain.dispose === 'function') {
        chain.dispose();
      }
    });
    this.effectChains = [];

    // フィルターを破棄
    this.filters.forEach(filter => {
      if (filter && typeof filter.dispose === 'function') {
        filter.dispose();
      }
    });
    this.filters = [];

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
   * サンプルのピッチを設定
   * @param {string} sampleId - サンプルID
   * @param {number} value - ノブの角度（-135から135）または直接のピッチ値（0.5から2.0）
   * @param {boolean} isDirectPitch - valueが直接のピッチ値かどうか
   * @throws {Error} 初期化されていない場合、または無効なピッチ値の場合
   */
  public setSamplePitch(sampleId: string, value: number, isDirectPitch = false): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    // サンプルの存在チェックを追加
    if (!this.sampleBuffers.has(sampleId)) {
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }

    let pitch: number;
    if (isDirectPitch) {
      // 直接のピッチ値の場合
      if (value < AudioEngine.MIN_PITCH || value > AudioEngine.MAX_PITCH) {
        throw new Error(`ピッチは${AudioEngine.MIN_PITCH}から${AudioEngine.MAX_PITCH}の範囲で指定してください`);
      }
      pitch = value;
    } else {
      // ノブの角度の場合
      const knobAngle = value;
      pitch = 1.0; // 基準値

      if (knobAngle > 0) {
        // 正の角度の場合：1.0から2.0までの範囲
        const positiveRange = 1.0; // 2.0 - 1.0
        const positiveStep = positiveRange / 135; // 1度あたりの変化量
        pitch = 1.0 + (knobAngle * positiveStep);
      } else if (knobAngle < 0) {
        // 負の角度の場合：0.5から1.0までの範囲
        const negativeRange = 0.5; // 1.0 - 0.5
        const negativeStep = negativeRange / 135; // 1度あたりの変化量
        pitch = 1.0 + (knobAngle * negativeStep);
      }
    }

    // 現在再生中のソースのピッチを更新
    const source = this.sampleSources.get(sampleId);
    if (source) {
      source.playbackRate.value = pitch;
    }

    // ピッチ値を保存
    this.samplePitches.set(sampleId, pitch);
  }

  /**
   * サンプルのピッチを取得
   * @param {string} sampleId - サンプルID
   * @returns {number} 現在のピッチ値
   * @throws {Error} 初期化されていない場合
   */
  public getSamplePitch(sampleId: string): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    // サンプルの存在チェックを追加
    if (!this.sampleBuffers.has(sampleId)) {
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }
    return this.samplePitches.get(sampleId) || AudioEngine.DEFAULT_PITCH;
  }

  /**
   * サンプルのピッチをリセット
   * @param {string} sampleId - サンプルID
   * @throws {Error} 初期化されていない場合
   */
  public resetSamplePitch(sampleId: string): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    // サンプルの存在チェックを追加
    if (!this.sampleBuffers.has(sampleId)) {
      throw new Error(`サンプル ${sampleId} が見つかりません`);
    }
    // 直接ピッチ値を1.0に設定
    this.setSamplePitch(sampleId, 1.0, true);
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
    source.playbackRate.value = this.getSamplePitch(sampleId);

    // ゲインノードを取得または作成
    let gain = this.sampleGains.get(sampleId);
    if (!gain) {
      gain = this.context.createGain();
      this.sampleGains.set(sampleId, gain);
    }

    // ノードを接続
    source.connect(gain);
    gain.connect(this.masterGain);

    // 再生開始
    const timing = this.sampleTimings.get(sampleId) || 0;
    source.start(this.context.currentTime + timing);
    this.sampleSources.set(sampleId, source);
    this.sampleStartTimes.set(sampleId, this.context.currentTime);

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
    } catch (error) {
      throw new Error(`サンプル ${sampleId} の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * 複数のサンプルを同時に再生
   * @param {string[]} sampleIds - 再生するサンプルIDの配列
   * @param {{ [sampleId: string]: number }} timings - 各サンプルのタイミング調整値（秒）
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSamples(sampleIds: string[], timings: { [sampleId: string]: number } = {}): void {
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
      source.playbackRate.value = this.getSamplePitch(sampleId);

      // ゲインノードを取得または作成
      let gain = this.sampleGains.get(sampleId);
      if (!gain) {
        gain = this.context.createGain();
        this.sampleGains.set(sampleId, gain);
      }

      // ノードを接続
      source.connect(gain);
      gain.connect(this.masterGain);

      // タイミングを設定
      const timing = timings[sampleId] || 0;
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

  /**
   * エフェクトチェーンを追加
   * @param {EffectChain} effectChain - 追加するエフェクトチェーン
   * @throws {Error} 初期化されていない場合
   */
  public addEffectChain(effectChain: EffectChain): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    this.effectChains.push(effectChain);
  }

  /**
   * フィルターを追加
   * @param {Filter} filter - 追加するフィルター
   * @throws {Error} 初期化されていない場合
   */
  public addFilter(filter: Filter): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    this.filters.push(filter);
  }

  /**
   * フィルターの初期化
   * @throws {Error} 初期化されていない場合
   */
  private initFilters(): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    try {
      // サンプル1,2,3とマスター用のフィルターを作成
      for (let i = 0; i < 4; i++) {
        const filter = new Filter(this.context);
        const effectChain = new EffectChain(this.context);
        effectChain.addEffect(filter as unknown as BaseEffect);
        this.filters.push(filter);
        this.effectChains.push(effectChain);
      }
      
      // マスターのEffectChainを出力に接続
      this.effectChains[3].getOutput().connect(this.context.destination);
      
      // サンプル1の出力をEffectChainに接続
      const sample1Gain = this.sampleGains.get('1');
      if (sample1Gain) {
        sample1Gain.disconnect();
        sample1Gain.connect(this.effectChains[0].getInput());
      }
    } catch (error) {
      throw new Error(`フィルターの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * フィルターの値を更新
   * @param {number} index - フィルターのインデックス
   * @param {number} angle - ノブの回転角度（-135度〜135度）
   * @throws {Error} 初期化されていない場合、またはフィルターが存在しない場合
   */
  public setFilterValue(index: number, angle: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.filters[index]) {
      throw new Error(`フィルター ${index} が見つかりません`);
    }

    try {
      this.filters[index].setKnobAngle(angle);
    } catch (error) {
      throw new Error(`フィルターの更新に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * フィルターをリセット
   * @param {number} index - フィルターのインデックス
   * @throws {Error} 初期化されていない場合、またはフィルターが存在しない場合
   */
  public resetFilter(index: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    if (!this.filters[index]) {
      throw new Error(`フィルター ${index} が見つかりません`);
    }

    try {
      this.filters[index].reset();
    } catch (error) {
      throw new Error(`フィルターのリセットに失敗しました: ${(error as Error).message}`);
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

      // サンプルの出力を対応するEffectChainに接続
      sampleGain.disconnect();
      sampleGain.connect(this.effectChains[parseInt(sampleId) - 1].getInput());
      
      // EffectChainの出力をマスターのEffectChainに接続
      this.effectChains[parseInt(sampleId) - 1].getOutput().connect(this.effectChains[3].getInput());
    } catch (error) {
      throw new Error(`サンプル ${sampleId} の接続に失敗しました: ${(error as Error).message}`);
    }
  }
} 