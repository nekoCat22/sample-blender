/**
 * @file BaseEffect.ts
 * @brief エフェクトの基底クラス
 * @details
 * - エフェクトの基本機能を提供
 * - 入出力の管理
 * - パラメータの制御
 * - エラー処理の統一
 */

export abstract class BaseEffect {
  protected input: GainNode;
  protected output: GainNode;
  protected isInitialized: boolean = false;

  /**
   * BaseEffectのコンストラクタ
   * @param {AudioContext} context - 音声コンテキスト
   * @throws {Error} 初期化に失敗した場合
   */
  constructor(protected context: AudioContext) {
    try {
      this.input = this.context.createGain();
      this.output = this.context.createGain();
      this.isInitialized = true;
    } catch (error: unknown) {
      throw new Error(`エフェクトの初期化に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * エフェクトの入力ノードを取得
   * @returns {GainNode} 入力ノード
   * @throws {Error} 初期化されていない場合
   */
  public getInput(): GainNode {
    if (!this.isInitialized) {
      throw new Error('エフェクトが初期化されていません');
    }
    return this.input;
  }

  /**
   * エフェクトの出力ノードを取得
   * @returns {GainNode} 出力ノード
   * @throws {Error} 初期化されていない場合
   */
  public getOutput(): GainNode {
    if (!this.isInitialized) {
      throw new Error('エフェクトが初期化されていません');
    }
    return this.output;
  }

  /**
   * エフェクトを有効化
   * @throws {Error} 初期化されていない場合
   */
  public abstract enable(): void;

  /**
   * エフェクトを無効化
   * @throws {Error} 初期化されていない場合
   */
  public abstract disable(): void;

  /**
   * エフェクトのパラメータを設定
   * @param {string} param - パラメータ名
   * @param {number} value - パラメータ値
   * @throws {Error} 初期化されていない場合、または無効なパラメータの場合
   */
  public abstract setParameter(param: string, value: number): void;

  /**
   * エフェクトのパラメータを取得
   * @param {string} param - パラメータ名
   * @returns {number} パラメータ値
   * @throws {Error} 初期化されていない場合、または無効なパラメータの場合
   */
  public abstract getParameter(param: string): number;

  /**
   * エフェクトを破棄
   * @throws {Error} 初期化されていない場合
   */
  public dispose(): void {
    if (!this.isInitialized) {
      throw new Error('エフェクトが初期化されていません');
    }
    this.input.disconnect();
    this.output.disconnect();
    this.isInitialized = false;
  }
} 