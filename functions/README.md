# ET-AI Cloud Functions

Firebase Cloud Functions for ET-AI backend services.

## 機能一覧

### チャット処理
- **processChat**: Claude APIを使用したチャット処理（RAG統合、3層プロンプトキャッシング）

### Firestoreトリガー
- **onChatApproved**: 承認されたチャットを自動的にナレッジベースに追加（3層重複排除）
- **onChatModified**: チャット修正から学習パターンを抽出

### ファイル処理
- **processFileUpload**: PDF/DOCX のアップロードと処理
- **reprocessDocument**: ドキュメントの再処理

### ベクトル検索
- **vectorSearch**: セマンティック検索
- **duplicateStats**: 重複統計情報の取得

### コスト監視
- **checkBudgets**: 予算チェックとアラート（1時間ごと）
- **generateDailyCostReport**: 日次コストレポート生成（毎日9:00 JST）
- **cleanupOldCostRecords**: 古いコストレコードのクリーンアップ（毎週日曜2:00）

## セットアップ

### 1. 依存関係のインストール

```bash
cd functions
npm install
```

### 2. 環境変数の設定

#### ローカル開発環境

```bash
# .env.example をコピー
cp .env.example .env

# .env ファイルを編集して API キーを設定
# ANTHROPIC_API_KEY=sk-ant-...
# VOYAGE_API_KEY=pa-...
```

#### 本番環境（Firebase Functions）

```bash
# Anthropic API Key の設定
firebase functions:config:set anthropic.api_key="sk-ant-your-api-key-here"

# Voyage AI API Key の設定（embeddingService で使用）
firebase functions:config:set voyage.api_key="pa-your-voyage-api-key-here"

# 設定を確認
firebase functions:config:get
```

### 3. Firestore インデックスの作成

```bash
# インデックスをデプロイ
firebase deploy --only firestore:indexes

# または Firebase Console で手動作成
# https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes
```

### 4. Firestore Vector Search の有効化

Firebase Console で Vector Search を有効化する必要があります：

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. プロジェクトを選択
3. Firestore Database → Settings
4. "Enable Vector Search" をクリック

## ビルド

```bash
npm run build
```

TypeScript ファイルが `lib/` ディレクトリにコンパイルされます。

## ローカルテスト

```bash
# Firebase Emulator を起動
npm run serve

# または
firebase emulators:start --only functions,firestore
```

## デプロイ

### 全ての関数をデプロイ

```bash
npm run deploy

# または
firebase deploy --only functions
```

### 特定の関数のみデプロイ

```bash
# チャット処理関数のみ
firebase deploy --only functions:processChat

# トリガー関数のみ
firebase deploy --only functions:onChatApproved,functions:onChatModified
```

## アーキテクチャ

### ディレクトリ構造

```
functions/
├── src/
│   ├── api/              # HTTP Callable Functions
│   │   └── processChat.ts
│   ├── triggers/         # Firestore Triggers
│   │   ├── onChatApproved.ts
│   │   └── onChatModified.ts
│   ├── services/         # ビジネスロジック
│   │   ├── claudeService.ts
│   │   ├── embeddingService.ts
│   │   ├── vectorSearchService.ts
│   │   └── deduplicationService.ts
│   ├── prompts/          # プロンプト管理
│   │   └── buildPrompt.ts
│   ├── security/         # セキュリティ
│   │   └── validation.ts
│   ├── config/           # 設定
│   │   └── firebase.ts
│   ├── types/            # TypeScript型定義
│   │   └── index.ts
│   ├── index.ts          # エントリーポイント
│   ├── fileProcessing.ts
│   └── scheduledCostMonitoring.ts
├── lib/                  # ビルド出力（gitignore）
├── node_modules/         # 依存関係（gitignore）
├── .env                  # 環境変数（gitignore）
├── .env.example          # 環境変数テンプレート
├── firestore.indexes.json # Firestoreインデックス定義
├── package.json
├── tsconfig.json
└── README.md
```

### 主要な設計パターン

#### 1. 3層プロンプトキャッシング

Claude API の Prompt Caching を活用し、コストを90%削減：

- **Layer 1**: コア制約（不変、常にキャッシュ）
- **Layer 2**: IR専門知識（月次更新）
- **Layer 3**: プロジェクト固有知識（RAGで動的取得）

#### 2. RAG（Retrieval Augmented Generation）

ユーザーの質問に関連するナレッジを自動取得してプロンプトに統合：

1. ユーザーメッセージを受信
2. ベクトル検索で関連ナレッジを取得（類似度 70% 以上）
3. システムプロンプトに統合
4. Claude API に送信

#### 3. 3層重複排除

ナレッジベースの品質を保つため、3段階で重複をチェック：

1. **完全一致チェック**: 既存コンテンツと完全に一致
2. **高類似度チェック**: ベクトル類似度 95% 以上
3. **既存エントリの更新**: 使用回数をインクリメント

#### 4. 学習パターン抽出

チャット修正から5種類のパターンを学習：

- **vocabulary**: 用語の好み（例: "会社" → "当社"）
- **structure**: 文章構造の改善（箇条書き化など）
- **emphasis**: 強調方法（数値追加、詳細化など）
- **tone**: トーン変更（推測 → 断定）
- **length**: 長さ調整（簡潔化、詳細化）

#### 5. キュー管理

Firestore ベースの永続キューで同時実行を制御：

- 最大5件の同時処理
- キュー状態の永続化
- 複数インスタンス間での同期

## セキュリティ

### 4層防御戦略

1. **入力長チェック**: 5-10,000文字
2. **危険パターン検出**: プロンプトインジェクション防止
3. **特殊文字率チェック**: 30%未満
4. **出力検証**: 禁止フレーズ、異常な繰り返しの検出

### アクセス制御

- すべての HTTP Callable Functions は認証必須
- プロジェクトメンバーシップのチェック
- Firestore Security Rules で追加の保護層

## コスト管理

### 監視機能

- リアルタイムのトークン使用量記録
- プロジェクトごとのコスト追跡
- キャッシュヒット率の測定
- 予算アラート（閾値超過時）

### コスト最適化

1. **プロンプトキャッシング**: 90% コスト削減
2. **バッチ処理**: Firestore 書き込みの最適化
3. **非同期処理**: 非クリティカルな処理を非同期化

## トラブルシューティング

### ビルドエラー

```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install

# TypeScript のバージョン確認
npm list typescript
```

### デプロイエラー

```bash
# Firebase CLI のバージョン確認
firebase --version

# ログインし直す
firebase logout
firebase login

# プロジェクトを確認
firebase projects:list
firebase use YOUR_PROJECT_ID
```

### 環境変数が読み込まれない

```bash
# ローカル開発: .env ファイルがあるか確認
ls -la .env

# 本番環境: Functions の設定を確認
firebase functions:config:get

# 設定をローカルにダウンロード
firebase functions:config:get > .runtimeconfig.json
```

### Firestore インデックスエラー

エラーメッセージに表示されるリンクをクリックして、Firebase Console でインデックスを作成してください。または：

```bash
firebase deploy --only firestore:indexes
```

## 開発ガイドライン

### コーディング規約

- TypeScript の strict モードを使用
- すべての関数にコメントを記載
- エラーハンドリングは必須
- ログは structured logging を使用

### テスト

```bash
# ユニットテストの実行（実装予定）
npm test

# カバレッジレポート
npm run test:coverage
```

### ログの確認

```bash
# リアルタイムログ
firebase functions:log

# 特定の関数のログ
firebase functions:log --only processChat

# エラーのみ
firebase functions:log --only-failures
```

## 参考リンク

- [Firebase Functions ドキュメント](https://firebase.google.com/docs/functions)
- [Anthropic API ドキュメント](https://docs.anthropic.com/)
- [Voyage AI ドキュメント](https://docs.voyageai.com/)
- [Firestore Vector Search](https://firebase.google.com/docs/firestore/vector-search)

## ライセンス

Private
