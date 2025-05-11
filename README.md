# sample-blender
A web application for creating new audio samples by layering existing ones

## 要件定義
### 1. 基本機能  
    - プリセットサンプル（約500個）の管理と選択
    - オプショナルなユーザーサンプルのアップロード機能
    - 2-3サンプルの同時再生と時間差再生
    - 波形表示機能
    - 作成したサンプルのwavファイルダウンロード
### 2. オーディオ処理機能
    - エフェクト処理
    - ゲイン調整
    - フィルター処理
    - ADSR制御
    - ピッチ調整
    - タイミング調整機能
### 3. UI要素
    - サンプルリスト表示（検索/フィルター機能付き）
    - ノブ型のパラメーター調整UI
    - 波形ビジュアライザー
    - 直感的な操作インターフェース
### 4. 対応フォーマット
    -入力: wav, mp3
    -出力: wav
### 5. 技術要件
    - フロントエンドのみの構成（バックエンド不要）
    - ブラウザでの動作
    - TypeScriptによる型安全な実装
---

## 開発ステップ
### Phase 1: 基礎的なオーディオ再生機能

1. プロジェクトのセットアップ
    - 開発環境の構築
    - Vue.js + TypeScriptの基本構造作成
    - 必要なライブラリのインストール
2. 基本的なオーディオ機能
    - 単一サンプルの再生/停止
    - 波形表示の実装
    - 基本的なUI作成

### Phase 2: 複数サンプル処理

1. 3つのサンプル同時再生
2. 基本的なミキシング機能
3. タイミング調整機能

### Phase 3: オーディオ処理機能

1. ✅ ゲイン調整
2. ✅ フィルター実装
   - ✅ Filter.tsの基本構造作成
     - ✅ クラスの定義と必要なプロパティの設定
     - ✅ コンストラクタでWeb Audio APIのBiquadFilterNodeを初期化
     - ✅ 基本的な接続メソッド（input/output）の実装
     - ✅ エラー処理の実装
   - ✅ フィルターのバイパス機能実装
     - ✅ フィルターのON/OFF切り替えメソッド
     - ✅ 0度の時の動作確認
     - ✅ エラー処理の確認
   - ✅ カットオフ周波数の制御実装
     - ✅ 回転角度からカットオフ周波数への変換関数
     - ✅ カットオフ周波数の設定メソッド
     - ✅ エラー処理の確認
   - ✅ フィルター動作の実装
     - ✅ ローパスフィルター（負の角度）の動作確認
     - ✅ ハイパスフィルター（正の角度）の動作確認
     - ✅ エラー処理の確認
   - ✅ AudioEngineへの統合
     - ✅ Filterクラスのインスタンス化
     - ✅ オーディオチェーンへの接続
     - ✅ エラー処理の確認
   - ✅ UIとの連携
     - ✅ ノブの回転角度とフィルター制御の連携
     - ✅ 動作確認とデバッグ
3. ピッチ調整
4. ADSR実装

### Phase 4: UI/UX改善

1. サンプルリスト実装
2. ノブUIの実装
3. 波形表示の改善

### Phase 5: 最終機能

1. WAVエクスポート機能
2. サンプルアップロード機能
3. 全体的な動作確認とバグ修正

---

## 技術スタック
- Vue 3
- TypeScript
- Web Audio API
- WaveSurfer.js
- ESLint + Prettier

## 開発環境のセットアップ

### 必要条件
- Node.js (v14以上)
- npm (v6以上)

### インストール
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run serve

# ビルド
npm run build

# リント
npm run lint
```

### 型チェック
```bash
# TypeScriptの型チェック
npm run type-check
```

### テスト
```bash
# ユニットテストの実行
npm run test:unit
```

## プロジェクト構造
```
src/
  ├── components/     # Vueコンポーネント
  ├── types/         # TypeScript型定義
  ├── utils/         # ユーティリティ関数
  └── assets/        # 静的ファイル
```

## オーディオパス設計
### ディレクトリ構造
```
src/
  ├── core/          # コアオーディオ処理
  │   ├── AudioEngine.ts      # メインのオーディオエンジン
  │   ├── AudioContext.ts     # Web Audio APIのコンテキスト管理
  │   └── AudioNode.ts        # 基本的なオーディオノードのラッパー
  │
  ├── effects/       # オーディオエフェクト
  │   ├── Filter.ts           # フィルターエフェクト
  │   ├── Gain.ts            # ゲインコントロール
  │   ├── ADSR.ts            # ADSRエンベロープ
  │   └── Pitch.ts           # ピッチシフター
  │
  ├── types/         # 型定義
  │   └── audio.d.ts         # オーディオ関連の型定義
  │
  └── components/    # UIコンポーネント
      ├── Waveform.vue       # 波形表示コンポーネント
      ├── SampleList.vue     # サンプルリスト
      └── KnobControl.vue    # ノブコントロール
```

### オーディオパスの流れ
1. **入力処理**
   - サンプルファイルの読み込み
   - オーディオバッファへの変換
   - メモリ管理

2. **エフェクトチェーン**
   - ゲインコントロール
   - フィルター処理
   - ADSRエンベロープ
   - ピッチシフト

3. **出力処理**
   - マスターボリューム
   - 波形表示
   - WAVファイル出力

### 主要コンポーネントの役割
- **AudioEngine**: 全体のオーディオ処理を管理
- **AudioContext**: Web Audio APIのコンテキストを一元管理
- **AudioNode**: 基本的なオーディオノードのラッパー
- **エフェクト**: 各エフェクトを独立したクラスとして実装

### 設計の特徴
- モジュール性の高い設計
- プラグイン形式でのエフェクト追加が可能
- TypeScriptによる型安全な実装
- テスト容易性を考慮した構造

## カスタマイズ
設定の詳細については [Configuration Reference](https://cli.vuejs.org/config/) を参照してください。
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


