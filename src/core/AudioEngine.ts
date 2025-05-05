/**
 * @file AudioEngine.ts
 * @brief Web Audio APIのラッパークラス
 * @details
 * - 音声コンテキストの管理
 * - マスターボリュームの制御
 * - エフェクトチェーンの管理
 * - エラー処理の統一
 */

export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private isInitialized: boolean = false;

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
    // 音声コンテキストを破棄
    if (this.context.state !== 'closed') {
      await this.context.close();
    }
    // 初期化フラグをリセット
    this.isInitialized = false;
  }
} 