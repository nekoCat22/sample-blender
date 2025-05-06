# コンポーネント移行計画

## 1. 現在のコンポーネント構造

```
src/
  components/
    AudioPlayer.vue        # オーディオプレーヤーのUI
  core/
    AudioEngine.ts         # オーディオ処理の中心（タイミング制御を含む）
  effects/
    base/
      BaseEffect.ts        # エフェクトの基底クラス
    EffectChain.ts         # エフェクトチェーンの管理
    Filter.ts             # フィルターエフェクト
    GainEffect.ts         # ゲインエフェクト
  contexts/               # Reactコンテキスト
  hooks/                  # カスタムフック
  types/                  # 型定義
  assets/                 # 静的ファイル
```

## 2. 移行後のコンポーネント構造

```
src/
  components/
    AudioPlayer.vue        # オーディオプレーヤーのUI
    Knob/                  # ノブのUIコンポーネント
      Knob.vue
      Knob.test.ts
    Waveform/             # 波形表示のUIコンポーネント
      Waveform.vue
      Waveform.test.ts
    VolumeMeter/          # 音量メーターのUIコンポーネント
      VolumeMeter.vue
      VolumeMeter.test.ts
  effects/                # 実際のエフェクト処理のロジック
    base/
      BaseEffect.ts
    EffectChain.ts
    Filter.ts
    GainEffect.ts
  core/
    AudioEngine.ts         # オーディオ処理の中心（タイミング制御を含む）
  effects/
    base/
      BaseEffect.ts        # エフェクトの基底クラス
    EffectChain.ts         # エフェクトチェーンの管理
    Filter.ts             # フィルターエフェクト
    GainEffect.ts         # ゲインエフェクト
  contexts/               # Reactコンテキスト
  hooks/                  # カスタムフック
  stores/
    knob.ts              # ノブの状態管理
    waveform.ts          # 波形表示の状態管理
    volumeMeter.ts       # 音量メーターの状態管理
  types/
    effect.ts             # エフェクト関連の型定義
    knob.ts              # ノブ関連の型定義
  utils/
    error.ts              # エラー処理のユーティリティ
  styles/
    components/
      _knob.scss         # ノブのスタイル
      _waveform.scss     # 波形表示のスタイル
      _volumeMeter.scss  # 音量メーターのスタイル
```

## 3. 移行の優先順位

### フェーズ1: 基本コンポーネントの移行
1. コンポーネント構造の移行
   - `components/effects/`ディレクトリの作成
   - 既存のコンポーネントの移行
   - 型定義の移行
   - ストアの移行

2. `Knob`コンポーネント
   - ノブの基本機能
   - ゲインとタイミングの両方に対応
   - ドラッグ操作の実装
   - 値の範囲と回転角度の設定
   - 状態管理の実装

3. `Waveform`コンポーネント
   - 波形表示の基本機能
   - WaveSurferの初期化と設定
   - エラー処理の実装
   - 状態管理の実装

4. `VolumeMeter`コンポーネント
   - 音量レベルの表示
   - 警告域の表示（-12dB, -6dB）
   - アニメーション効果
   - 状態管理の実装

## 4. 各コンポーネントの移行手順

### 4.1 コンポーネントの移行手順
1. 型定義の作成
2. ストアの作成
3. コンポーネントの分割
4. PropsとEmitsの定義
5. テストの作成
6. スタイルの定義
7. エラー処理の実装

### 4.2 テストの移行手順
1. 単体テストの作成
2. 統合テストの作成
3. テストカバレッジの確認

### 4.3 エラー処理の移行手順
1. エラー型の定義
2. エラーハンドリングの実装
3. エラーメッセージの統一
4. エラー状態の管理

## 5. 移行の注意点

### 5.1 型安全性
- 全てのコンポーネントでTypeScriptを使用
- 型定義の徹底
- コンパイル時のエラー検出

### 5.2 テスト
- 全てのコンポーネントにテストを実装
- テストカバレッジの維持
- リグレッションテストの実施

### 5.3 エラー処理
- エラー状態の明確化
- エラーメッセージの統一
- エラーリカバリーの実装

### 5.4 パフォーマンス
- コンポーネントの最適化
- メモリリークの防止
- レンダリングの最適化

## 6. 移行のタイムライン

### フェーズ1: 基本コンポーネントの移行（2週間）
- Week 1 Day 1: コンポーネント構造の移行
- Week 1 Day 2: `Knob`の移行
- Week 1 Day 3: `Waveform`の移行
- Week 1 Day 4: `VolumeMeter`の移行
- Week 1 Day 5: テストとデバッグ
- Week 2 Day 1-5: 統合テストとデバッグ

## 7. 移行後の検証

### 7.1 機能検証
- 全ての機能が正常に動作すること
- エラー処理が適切に機能すること
- パフォーマンスが維持されていること

### 7.2 テスト検証
- テストカバレッジが維持されていること
- 全てのテストが成功すること
- リグレッションテストが成功すること

### 7.3 コード品質検証
- コードの可読性が維持されていること
- 型安全性が確保されていること
- エラー処理が適切に実装されていること 