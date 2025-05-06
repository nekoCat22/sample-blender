# Sample Blender アーキテクチャ設計書

## 概要
このドキュメントは、Sample Blenderのアプリケーションアーキテクチャを定義するものです。
将来の拡張性を考慮し、音声処理とUIを分離した設計となっています。

## ディレクトリ構造
```
src/
  ├── core/                 # コアモジュール
  │   ├── AudioEngine.js    # Web Audio APIのラッパー
  │   ├── AudioProcessor.js # 音声処理の基本クラス
  │   └── types.js         # 型定義
  │
  ├── effects/             # エフェクトモジュール
  │   ├── base/
  │   │   └── BaseEffect.js # エフェクトの基底クラス（AudioContext/AudioEngine対応）
  │   ├── GainEffect.js    # ゲイン調整
  │   ├── FilterEffect.js  # フィルター
  │   ├── PitchEffect.js   # ピッチ調整
  │   └── ADSREffect.js    # ADSR
  │
  ├── components/          # UIモジュール
  │   ├── audio/
  │   │   ├── WaveformViewer.vue  # 波形表示
  │   │   ├── AudioControls.vue   # 再生制御
  │   │   └── VolumeMeter.vue     # 音量メーター
  │   ├── effects/
  │   │   ├── EffectRack.vue      # エフェクトラック
  │   │   └── EffectKnob.vue      # ノブUI
  │   └── samples/
  │       ├── SampleList.vue      # サンプルリスト
  │       └── SampleUploader.vue  # サンプルアップロード
  │
  └── store/               # ストアモジュール
      ├── modules/
      │   ├── audio.js     # 音声関連の状態管理
      │   ├── effects.js   # エフェクト関連の状態管理
      │   └── samples.js   # サンプル関連の状態管理
      └── index.js
```

## モジュール詳細

### 1. コアモジュール
#### AudioEngine.js
- Web Audio APIのラッパークラス
- 音声コンテキストの管理
- マスターボリュームの制御
- エフェクトチェーンの管理

#### AudioProcessor.js
- 音声処理の基本クラス
- バッファの管理
- 音声データの変換処理

### 2. エフェクトモジュール
#### BaseEffect.js
- エフェクトの基底クラス
- AudioContextとAudioEngineの両方に対応
- 入出力ノードの管理
- パラメータの制御
- エラー処理の統一
- 初期化状態の管理

#### 各エフェクトクラス
- GainEffect: ゲイン調整
- FilterEffect: フィルター処理
- PitchEffect: ピッチ調整
- ADSREffect: ADSRエンベロープ

### 3. UIモジュール
#### 音声関連コンポーネント
- WaveformViewer: 波形表示
- AudioControls: 再生制御
- VolumeMeter: 音量メーター

#### エフェクト関連コンポーネント
- EffectRack: エフェクトラック
- EffectKnob: ノブUI

#### サンプル関連コンポーネント
- SampleList: サンプルリスト
- SampleUploader: サンプルアップロード

### 4. ストアモジュール
#### 状態管理
- audio: 音声関連の状態
- effects: エフェクト関連の状態
- samples: サンプル関連の状態

## 実装方針

### 1. 音声処理
- Web Audio APIを直接使用
- エフェクトチェーンの動的な構築
- バッファの効率的な管理

### 2. UI実装
- コンポーネントの再利用性を重視
- レスポンシブデザイン
- アクセシビリティへの配慮

### 3. 状態管理
- Vuexを使用
- モジュール分割による管理
- 非同期処理の適切な処理

## 拡張性
- 新しいエフェクトの追加が容易
- UIコンポーネントの再利用が可能
- 状態管理の整理

## 保守性
- 各モジュールの責務が明確
- コードの重複が少ない
- デバッグがしやすい

## 実装ステップ
1. ✅ AudioEngineとBaseEffectの実装
2. 波形表示部分の分離
3. エフェクトチェーンの実装
4. UIコンポーネントの実装
5. 状態管理の実装

## テストに関する注意事項

### wavesurfer.jsのテスト制限
- wavesurfer.jsのモックは複雑なため、現時点ではテストを実装していません
- 主な理由：
  1. `URL.createObjectURL`のモックが必要
  2. `HTMLMediaElement`のメソッド（`load`, `pause`など）のモックが必要
  3. Web Audio APIのモックが必要
  4. 波形表示のためのCanvas操作のモックが必要

### 代替アプローチ
- 現時点では、以下の方法で品質を確保しています：
  1. 手動テストによる動作確認
  2. TypeScriptによる型チェック
  3. ESLintによるコード品質の確保
  4. コンポーネントの分割による責務の明確化

### 将来の改善計画
- wavesurfer.jsのモック実装
- テスト環境の整備
- ユニットテストの追加
- E2Eテストの導入 