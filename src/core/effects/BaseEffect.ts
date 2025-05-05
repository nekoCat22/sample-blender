/**
 * @file BaseEffect.ts
 * @brief オーディオエフェクトの基本クラス
 * @details
 * - すべてのエフェクトの基底クラス
 * - エフェクトの接続と切断を管理
 * - エフェクトの有効/無効を制御
 * - パラメータの基本操作を提供
 */

export abstract class BaseEffect {
  protected context: AudioContext;
  protected input!: AudioNode;
  protected output!: AudioNode;
  protected isEnabled: boolean = true;
  protected parameters: Map<string, AudioParam> = new Map();

  /**
   * エフェクトのコンストラクタ
   * @param {AudioContext} context - Web Audio APIのコンテキスト
   */
  constructor(context: AudioContext) {
    this.context = context;
  }

  /**
   * エフェクトを有効化
   */
  public enable(): void {
    this.isEnabled = true;
  }

  /**
   * エフェクトを無効化
   */
  public disable(): void {
    this.isEnabled = false;
  }

  /**
   * エフェクトの有効状態を取得
   * @returns {boolean} エフェクトが有効かどうか
   */
  public isEffectEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * エフェクトの入力ノードを取得
   * @returns {AudioNode} 入力ノード
   */
  public getInput(): AudioNode {
    return this.input;
  }

  /**
   * エフェクトの出力ノードを取得
   * @returns {AudioNode} 出力ノード
   */
  public getOutput(): AudioNode {
    return this.output;
  }

  /**
   * エフェクトのパラメータを設定
   * @param {string} paramName - パラメータ名
   * @param {number} value - パラメータ値
   * @throws {Error} パラメータが存在しない場合
   */
  public setParameter(paramName: string, value: number): void {
    const param = this.parameters.get(paramName);
    if (!param) {
      throw new Error(`パラメータ ${paramName} は存在しません`);
    }
    param.value = value;
  }

  /**
   * エフェクトのパラメータを取得
   * @param {string} paramName - パラメータ名
   * @returns {number} パラメータ値
   * @throws {Error} パラメータが存在しない場合
   */
  public getParameter(paramName: string): number {
    const param = this.parameters.get(paramName);
    if (!param) {
      throw new Error(`パラメータ ${paramName} は存在しません`);
    }
    return param.value;
  }

  /**
   * エフェクトのパラメータ一覧を取得
   * @returns {string[]} パラメータ名の配列
   */
  public getParameterNames(): string[] {
    return Array.from(this.parameters.keys());
  }

  /**
   * エフェクトを破棄
   */
  public dispose(): void {
    // 派生クラスで実装
  }
} 