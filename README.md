# ET-AI - Ethics & Transparency Engine

株式会社トリアスのIRコンサルティング業務を支援する専門AIアシスタント

## 🎯 プロジェクト概要

ET-AIは、統合報告書作成を支援するAIアシスタントシステムです。Claude API（Anthropic）を活用し、3層プロンプトキャッシングによる90%のコスト削減を実現しています。

### 主要機能

- **3層プロンプトキャッシング**: 月間コストを90%削減
- **Vector Search**: Voyage AI統合による高精度な意味検索
- **3層重複排除システム**: Exact/Semantic/Fuzzy matching
- **RBAC認証**: @trias.co.jpドメイン制限 + Admin/Employee roles
- **Apple HIG準拠UI**: TailwindCSSによるモダンなデザイン

## 🚀 セットアップ

### 必要要件

- Node.js 20+
- npm 9+
- Firebase プロジェクト
- Anthropic API キー
- Voyage AI API キー

### インストール

```bash
# 依存関係のインストール
npm install

# Cloud Functions の依存関係
cd functions && npm install && cd ..
```

### 環境変数設定

`.env.local` ファイルを作成し、以下を設定：

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Anthropic API
VITE_ANTHROPIC_API_KEY=sk-ant-xxx

# Voyage AI API
VITE_VOYAGE_API_KEY=pa-xxx
```

### 開発サーバー起動

```bash
npm run dev
```

サーバーは http://localhost:3000 で起動します。

## 🧪 テスト

### テスト実行

```bash
# 全テスト実行
npm test

# Watch モード
npm run test:watch

# カバレッジレポート生成
npm run test:coverage
```

### テストカバレッジ目標

| カテゴリ | 目標 | 現状 |
|---------|------|------|
| **utils/** | 70%+ | 27% |
| **services/** | 70%+ | 進行中 |
| **components/** | 70%+ | 9% |
| **全体** | **70%+** | **8.6%** |

### テストファイル構成

```
__tests__/
├── components/
│   └── VectorSearch.test.tsx
├── functions/
│   └── textChunker.test.ts
├── prompts/
│   └── core-constraints.test.ts
├── services/
│   ├── authService.test.ts
│   └── claudeService.test.ts
└── utils/
    ├── errorHandling.test.ts
    └── validators.test.ts
```

## 🏗️ ビルド

### プロダクションビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

### バンドルサイズ最適化

- React/ReactDOM: 別チャンクに分割
- Firebase: Vendor chunkに分離
- UIコンポーネント: 独立したチャンク
- 目標サイズ: < 500 kB (現在: 536 kB)

## 📦 デプロイ

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## 🔒 セキュリティ

### ドメイン制限

- 登録可能メールアドレス: `@trias.co.jp` のみ
- Firebase Security Rulesで強制

### RBAC (Role-Based Access Control)

| 機能 | Admin | Employee |
|-----|-------|----------|
| プロジェクト作成 | ✅ | ❌ |
| プロジェクト削除 | ✅ | ❌ |
| システムプロンプト更新 | ✅ | ❌ |
| チャット承認 | ✅ | ✅ |
| ナレッジ追加 | ✅ | ✅ |

### プロンプトインジェクション対策

- 入力検証パターンマッチング
- 出力検証（禁止ワードチェック）
- セキュリティイベントログ

## 📚 ドキュメント

- [フェーズ1実装詳細](./PHASE1_IMPLEMENTATION.md)
- [フェーズ2実装詳細](./PHASE2_IMPLEMENTATION.md)
- [フェーズ3実装詳細](./PHASE3_IMPLEMENTATION.md)
- [フェーズ4実装詳細](./PHASE4_IMPLEMENTATION.md)
- [Apple HIG実装](./APPLE_HIG_IMPLEMENTATION.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [貢献ガイドライン](./CONTRIBUTING.md)

## 🤝 貢献

貢献を歓迎します！詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

### 開発フロー

1. Feature branchを作成
2. 変更を実装
3. テストを追加/更新
4. `npm test` でテスト通過を確認
5. Pull Requestを作成

## 📊 技術スタック

### Frontend

- React 19+ with TypeScript
- TailwindCSS (Apple HIG準拠)
- Firebase SDK (Auth, Firestore, Storage, Functions)
- Anthropic SDK (Claude API)

### Backend

- Firebase Cloud Functions (Node.js 20)
- Firestore (NoSQL Database)
- Firebase Storage
- Voyage AI (Embeddings)

### Testing

- Jest + Testing Library
- Firebase Functions Test
- 目標カバレッジ: 70%

### CI/CD

- GitHub Actions
- Automated testing on PR
- Deployment to Firebase

## 📝 ライセンス

Copyright © 2025 株式会社トリアス. All rights reserved.

## 🔗 関連リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [Voyage AI](https://www.voyageai.com/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
