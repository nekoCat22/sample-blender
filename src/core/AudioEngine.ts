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
import { EffectsManager } from './EffectsManager'
import { PlaybackSettingManager } from './PlaybackSettingManager'
import { PITCH_MIN_RATE, PITCH_MAX_RATE, TIMING_MAX_DELAY_SECONDS, ChannelId } from './audioConstants'
// BaseEffectはFilterが継承してるため、インポートが必須だが、ESLintのエラーが出るため無視する文
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { BaseEffect } from '@/effects/base/BaseEffect'

export class AudioEngine {
  // 基本プロパティ
  private context: AudioContext;
  private masterGain!: GainNode;  // 初期化はinitMasterGainで行うので、!を使用
  private isInitialized = false;
  private isPlaying = false;
  private startTime = 0;
  private onPlaybackEndCallback: (() => void) | null = null;
  private activeSampleCount = 0;

  // サンプル関連のプロパティ
  private sampleBuffers: Map<ChannelId, AudioBuffer> = new Map();
  private sampleSources: Map<ChannelId, AudioBufferSourceNode> = new Map();
  private sampleGains: Map<ChannelId, GainNode> = new Map();
  private sampleStartTimes: Map<ChannelId, number> = new Map();
  private sampleTimings: Map<number, number> = new Map();
  private samplePitches: Map<number, number> = new Map();

  // エフェクト関連のプロパティ
  private effectChains: EffectChain[] = [];
  private effectsManager: EffectsManager;
  private playbackSettingsManager: PlaybackSettingManager;

  // ===== 初期化・破棄関連 =====

  /**
   * AudioEngineのコンストラクタ
   * @param {PlaybackSettingManager} playbackSettingsManager - 再生設定を管理するマネージャー
   * @throws {Error} Web Audio APIがサポートされていない場合
   */
  constructor(playbackSettingsManager: PlaybackSettingManager) {
    try {
      // PlaybackSettingManagerの設定を先に行う
      this.playbackSettingsManager = playbackSettingsManager;

      // AudioContextの初期化
      this.context = new AudioContext();
      this.isInitialized = true;  // 初期化フラグを先に設定
      
      // EffectsManagerの初期化
      this.effectsManager = new EffectsManager(this.context);
      
      // エフェクトチェーンの初期化
      this.initEffectChains();

      // マスターゲインの初期化（PlaybackSettingManagerを使用するため、最後に実行）
      this.initMasterGain();
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
   * @param {ChannelId} channelId - チャンネルID
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public connectSampleToEffectChain(channelId: ChannelId): void {
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
  
      // マスターエフェクトチェーンの出力をマスターゲインに接続
      this.effectChains[0].getOutput().disconnect();
      this.effectChains[0].getOutput().connect(this.masterGain);
  
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
      // マスターゲインの初期値をPlaybackSettingManagerから取得
      this.masterGain.gain.value = this.playbackSettingsManager.getSetting(0, 'volume');
      // マスターゲインを出力に接続
      this.masterGain.connect(this.context.destination);
    } catch (error) {
      throw new Error(`マスターゲインの初期化に失敗しました: ${(error as Error).message}`);
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
      const masterFilter = this.effectsManager.getEffect(0, 'filter');
      if (masterFilter) {
        masterEffectChain.addEffect(masterFilter);
      }
      this.effectChains[0] = masterEffectChain;
  
      // チャンネル1用エフェクトチェーン
      const channel1EffectChain = new EffectChain(this.context);
      const channel1Filter = this.effectsManager.getEffect(1, 'filter');
      if (channel1Filter) {
        channel1EffectChain.addEffect(channel1Filter);
      }
      this.effectChains[1] = channel1EffectChain;
  
      // チャンネル2用エフェクトチェーン
      const channel2EffectChain = new EffectChain(this.context);
      const channel2Filter = this.effectsManager.getEffect(2, 'filter');
      if (channel2Filter) {
        channel2EffectChain.addEffect(channel2Filter);
      }
      this.effectChains[2] = channel2EffectChain;
  
      // チャンネル3用エフェクトチェーン
      const channel3EffectChain = new EffectChain(this.context);
      const channel3Filter = this.effectsManager.getEffect(3, 'filter');
      if (channel3Filter) {
        channel3EffectChain.addEffect(channel3Filter);
      }
      this.effectChains[3] = channel3EffectChain;
  
      // マスターのEffectChainの出力をマスターゲインに接続
      if (this.effectChains[0] && this.masterGain) {
        this.effectChains[0].getOutput().connect(this.masterGain);
      }
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
    if (!this.isInitialized) {
      return;
    }

    try {
      // エフェクトチェーンを破棄
      this.effectChains.forEach(chain => {
        if (chain !== undefined && typeof chain.dispose === 'function') {
          chain.dispose();
        }
      });
      this.effectChains = [];

      // EffectsManagerの破棄
      this.effectsManager.dispose();

      // 音声コンテキストを破棄する前に、すべての接続を切断
      this.masterGain.disconnect();
      
      // サンプルゲインの切断
      this.sampleGains.forEach(gain => gain.disconnect());
      this.sampleGains.clear();

      // サンプルソースの切断
      this.sampleSources.forEach(source => {
        try {
          source.disconnect();
        } catch (error) {
          // 既に切断されている場合は無視
        }
      });
      this.sampleSources.clear();

      // 音声コンテキストを破棄
      if (this.context.state !== 'closed') {
        await this.context.close();
      }

      // 初期化フラグをリセット
      this.isInitialized = false;

      // サンプルバッファをクリア
      this.sampleBuffers.clear();
    } catch (error) {
      throw new Error(`AudioEngineの破棄に失敗しました: ${(error as Error).message}`);
    }
  }

  // ===== サンプル管理 =====

  /**
   * サンプルを読み込み
   * @param {ChannelId} channelId - チャンネルID
   * @param {ArrayBuffer} audioData - 音声データ
   * @throws {Error} 初期化されていない場合、または音声データのデコードに失敗した場合
   */
  public async loadSample(channelId: ChannelId, audioData: ArrayBuffer): Promise<void> {
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
      if (error instanceof DOMException) {
        throw new Error(`音声データのデコードに失敗しました: ${error.message}`);
      }
      throw new Error(`チャンネル ${channelId} の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===== 再生の制御 =====

  /**
   * サンプルを再生
   * @param {ChannelId} channelId - チャンネルID
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSample(channelId: ChannelId): void {
    this.playSamples([channelId]);
  }

  /**
   * 複数のサンプルを同時に再生
   * @param {ChannelId[]} channelIds - 再生するチャンネルIDの配列
   * @throws {Error} 初期化されていない場合、またはサンプルが存在しない場合
   */
  public playSamples(channelIds: ChannelId[]): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }

    try {
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

        // ピッチの設定を取得して適用
        const normalizedPitch = this.playbackSettingsManager.getSetting(channelId, 'pitch');
        let playbackRate: number;
        if (normalizedPitch < 0.5) {
          // 0.0-0.5の範囲をPITCH_MIN_RATE-1.0の範囲に変換
          playbackRate = PITCH_MIN_RATE + (normalizedPitch * 2 * (1.0 - PITCH_MIN_RATE));
        } else if (normalizedPitch > 0.5) {
          // 0.5-1.0の範囲を1.0-PITCH_MAX_RATEの範囲に変換
          playbackRate = 1.0 + ((normalizedPitch - 0.5) * 2 * (PITCH_MAX_RATE - 1.0));
        } else {
          // 0.5の場合は1.0（通常速度）
          playbackRate = 1.0;
        }
        source.playbackRate.value = playbackRate;

        // ゲインノードを取得
        const gain = this.sampleGains.get(channelId);
        if (!gain) {
          throw new Error(`チャンネル ${channelId} のゲインノードが見つかりません`);
        }

        // ボリュームの設定を取得して適用
        const normalizedVolume = this.playbackSettingsManager.getSetting(channelId, 'volume');
        gain.gain.value = normalizedVolume;

        // 音声信号の接続
        source.connect(gain);  // ソース → ゲイン

        // サンプルをエフェクトチェーンに接続
        this.connectSampleToEffectChain(channelId);

        // タイミングの設定を取得して適用
        const normalizedTiming = this.playbackSettingsManager.getSetting(channelId, 'timing');
        const delaySeconds = normalizedTiming * TIMING_MAX_DELAY_SECONDS;
        const startTime = this.context.currentTime + delaySeconds;

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
    } catch (error) {
      // エラーが発生した場合は再生を停止し、状態をリセット
      this.stopAll();
      this.activeSampleCount = 0;
      this.isPlaying = false;
      throw error;
    }
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

  // ===== サンプルの音量の制御 =====

  /**
   * サンプルの音量を取得VUメータ用
   * @param {ChannelId} channelId - チャンネルID
   * @returns {number} 現在の音量値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public getSampleVolume(channelId: ChannelId): number {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.playbackSettingsManager.getSetting(channelId, 'volume');
  }

  // ===== マスターボリューム制御 =====

  /**
   * マスターボリュームを更新
   * @param {number} value - 新しいマスターボリューム値（0.0から1.0の範囲）
   * @throws {Error} 初期化されていない場合
   */
  public updateMasterVolume(value: number): void {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    // PlaybackSettingManagerに値を保存
    this.playbackSettingsManager.setSetting(0, 'volume', value);
    // マスターゲインの値を更新
    this.masterGain.gain.value = value;
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
    return this.playbackSettingsManager.getSetting(0, 'volume');
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
      // タイミングの設定を取得して適用
      const normalizedTiming = this.playbackSettingsManager.getSetting(channelId as ChannelId, 'timing');
      const delaySeconds = normalizedTiming * TIMING_MAX_DELAY_SECONDS;
      const progress = currentTime - startTime - delaySeconds;
      if (progress > maxProgress) {
        maxProgress = progress;
      }
    });

    return Math.max(0, maxProgress);
  }

  /**
   * サンプルの長さを取得
   * @param {ChannelId} channelId - チャンネルID
   * @returns {number} サンプルの長さ（秒）
   * @throws {Error} 初期化されていない場合
   */
  public getSampleDuration(channelId: ChannelId): number {
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

  // ===== エフェクトの制御 =====

  /**
   * EffectsManagerのインスタンスを取得
   * なんかeffectManagerのインスタンスはaudioengine内にカプセル化されてるから、それを変更するにはこのメソッドで公開しなきゃいけないんだって。きもいね。
   * @returns {EffectsManager} EffectsManagerのインスタンス
   * @throws {Error} 初期化されていない場合
   */
  public getEffectsManager(): EffectsManager {
    if (!this.isInitialized) {
      throw new Error('AudioEngineが初期化されていません');
    }
    return this.effectsManager;
  }
} 