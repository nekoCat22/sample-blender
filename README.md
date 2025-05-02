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
---

## 開発ステップ
### Phase 1: 基礎的なオーディオ再生機能

1. プロジェクトのセットアップ
    - 開発環境の構築
    - Vue.jsの基本構造作成
    - 必要なライブラリのインストール
2. 基本的なオーディオ機能
    - 単一サンプルの再生/停止
    - 波形表示の実装
    - 基本的なUI作成

### Phase 2: 複数サンプル処理

1. 2つのサンプル同時再生
2. 基本的なミキシング機能
3. タイミング調整機能

### Phase 3: オーディオ処理機能

1. ゲイン調整
2. フィルター実装
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

## Project setup
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


