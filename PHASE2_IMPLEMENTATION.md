# ET-AI フェーズ2実装完了レポート

**実装日**: 2025年11月16日
**実装範囲**: Firestore初期化・Cloud Functions・ナレッジ管理（Week 3-4相当）
**ステータス**: ✅ 完了

---

## 📋 実装概要

ET-AI実装詳細仕様書に基づき、**フェーズ2: Firestore初期化・Cloud Functions実装・ナレッジ管理**を完了しました。

このフェーズでは、Firebase Cloud Functionsを使用したファイル処理パイプライン、Voyage AIによる埋め込み生成、Firestore Vector Searchによるセマンティック検索、そして3層重複排除システムを実装しました。

---

## ✅ 実装済み項目

### 1. Firestore初期化

**ファイル**: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`

#### Firebase設定ファイル

- ✅ `firebase.json` - Cloud Functions、Firestore、Storageの統合設定
- ✅ プロジェクト構造の定義
- ✅ デプロイ設定

#### Firestoreセキュリティルール

- ✅ 全12コレクションの詳細なセキュリティルール
- ✅ @trias.co.jpドメイン制限の実装
- ✅ RBAC（admin/employee）の権限チェック
- ✅ データバリデーション（サイズ制限、型チェック）
- ✅ 所有権ベースのアクセス制御

**主要なルール**:
```javascript
// ユーザー: 自分のプロフィール更新可能、管理者は全員管理可能
allow update: if (isOwner(userId) && request.resource.data.role == resource.data.role) || isAdmin();

// プロジェクト: 管理者のみ作成・削除可能
allow create, delete: if isAdmin();

// チャンネル: 共有チャンネルは全員閲覧可能、個人チャンネルは作成者と指定ユーザーのみ
allow read: if isAdmin() || (isTriasEmail() && resource.data.visibility.type == 'shared') || ...

// ナレッジ: プロジェクトメンバーのみ閲覧可能
allow read: if isProjectMember(resource.data.projectId);
```

#### Firestoreインデックス

- ✅ 21個の複合インデックス作成
- ✅ Vector Searchインデックス（1024次元）
- ✅ クエリパフォーマンスの最適化

**主要なインデックス**:
- `knowledge` + `embedding` (Vector Search用、1024次元)
- `chats` + `channelId` + `createdAt` (チャット履歴用)
- `documents` + `projectId` + `uploadedAt` (ドキュメント一覧用)
- `error_logs` + `errorType` + `timestamp` (エラー監視用)

#### Cloud Storage セキュリティルール

- ✅ ファイルサイズ制限（5MB）
- ✅ ファイルタイプ制限（PDF/DOCX）
- ✅ プロジェクトベースのアクセス制御

### 2. Cloud Functions実装

**ディレクトリ**: `functions/src/`

#### プロジェクト構造

```
functions/
├── package.json              # 依存関係管理
├── tsconfig.json            # TypeScript設定
├── src/
│   ├── index.ts             # エントリーポイント
│   ├── fileProcessing.ts    # ファイル処理Cloud Function
│   ├── config/
│   │   └── firebase.ts      # Firebase Admin SDK設定
│   ├── types/
│   │   └── index.ts         # 型定義
│   └── services/
│       ├── pdfExtractor.ts         # PDF抽出サービス
│       ├── docxExtractor.ts        # DOCX抽出サービス
│       ├── textChunker.ts          # チャンキングサービス
│       ├── embeddingService.ts     # 埋め込み生成サービス
│       ├── vectorSearchService.ts  # Vector Searchサービス
│       └── deduplicationService.ts # 重複排除サービス
```

#### Cloud Functions一覧

| 関数名 | トリガー | 説明 |
|-------|---------|------|
| `processFileUpload` | Storage | ファイルアップロード時の自動処理 |
| `reprocessDocument` | HTTPS (Callable) | 手動再処理トリガー |
| `vectorSearch` | HTTPS (Callable) | セマンティック検索エンドポイント |
| `duplicateStats` | HTTPS (Callable) | 重複統計情報取得 |
| `healthCheck` | HTTPS (Request) | ヘルスチェック |

#### ファイル処理パイプライン

**ファイル**: `functions/src/fileProcessing.ts`

**処理フロー**:
1. ファイルバリデーション（タイプ・サイズチェック）
2. ステータス更新（`processing`）
3. テキスト抽出（PDF/DOCX）
4. 抽出テキストの保存
5. チャンク化（500トークン、50トークンオーバーラップ）
6. 埋め込み生成（Voyage AI）
7. ナレッジベースへの保存
8. 重複検出
9. ステータス更新（`completed` or `failed`）

**設定**:
- タイムアウト: 540秒（9分）
- メモリ: 2GB
- 最大ファイルサイズ: 5MB

### 3. テキスト抽出サービス

#### PDF抽出

**ファイル**: `functions/src/services/pdfExtractor.ts`

- ✅ pdf-parse ライブラリ使用
- ✅ マルチページPDF対応
- ✅ テキスト正規化（改行、空白）
- ✅ メタデータ抽出（ページ数、単語数）
- ✅ PDFバリデーション（マジックバイトチェック）

**機能**:
```typescript
// テキスト抽出
const text = await extractTextFromPDF(file);

// メタデータのみ抽出
const metadata = await extractPDFMetadata(file);
// { pageCount: 10, title: "...", author: "...", creationDate: ... }
```

#### DOCX抽出

**ファイル**: `functions/src/services/docxExtractor.ts`

- ✅ mammoth ライブラリ使用
- ✅ テキスト抽出とHTML変換
- ✅ 書式情報の保持（オプション）
- ✅ テキスト正規化
- ✅ メタデータ抽出（単語数、画像・表の検出）

**機能**:
```typescript
// プレーンテキスト抽出
const text = await extractTextFromDOCX(file);

// HTML付き抽出
const { text, html } = await extractTextFromDOCXWithFormatting(file);

// メタデータ抽出
const metadata = await extractDOCXMetadata(file);
// { wordCount: 500, hasImages: true, hasTables: false }
```

### 4. ドキュメントチャンキング

**ファイル**: `functions/src/services/textChunker.ts`

#### アルゴリズム

- ✅ センテンス境界の尊重（日本語・英語対応）
- ✅ トークン数推定（日本語: 0.7文字/トークン、英語: 4文字/トークン）
- ✅ オーバーラップによるコンテキスト保持
- ✅ 最小/最大チャンクサイズの制御

**デフォルト設定**:
```typescript
{
  maxChunkSize: 500,    // 最大500トークン
  overlapSize: 50,      // 50トークンのオーバーラップ
  minChunkSize: 100,    // 最小100トークン
}
```

**機能**:
```typescript
const chunks = await chunkText(extractedText, {
  maxChunkSize: 500,
  overlapSize: 50,
  minChunkSize: 100,
});

// 各チャンクには以下の情報が含まれる:
// {
//   chunkId: "chunk-0",
//   content: "チャンクの内容...",
//   startIndex: 0,
//   endIndex: 500,
//   tokenCount: 450
// }
```

### 5. Voyage AI 埋め込み生成

**ファイル**: `functions/src/services/embeddingService.ts`

#### Voyage AI統合

- ✅ `voyage-large-2` モデル（1024次元）
- ✅ バッチ処理（最大128テキスト/リクエスト）
- ✅ レート制限管理（300リクエスト/分）
- ✅ 自動リトライ（最大3回）
- ✅ キューイング（p-queue）

**API制限対策**:
- 同時実行数: 5
- レート制限: 300リクエスト/分
- 自動バッチング: 128テキスト/バッチ

**機能**:
```typescript
// 複数テキストの埋め込み生成
const embeddings = await generateEmbeddings(
  ["テキスト1", "テキスト2", ...],
  'document',  // 'document' または 'query'
  'voyage-large-2'
);

// 単一テキスト
const embedding = await generateEmbedding("検索クエリ", 'query');

// 類似度計算
const similarity = cosineSimilarity(embedding1, embedding2);
// 0.95 (95%類似)
```

### 6. Vector Search統合

**ファイル**: `functions/src/services/vectorSearchService.ts`

#### Firestore Vector Search

- ✅ `findNearest` クエリ使用
- ✅ コサイン類似度測定
- ✅ プロジェクト・カテゴリフィルタリング
- ✅ 類似度閾値フィルタリング（デフォルト0.7）
- ✅ 結果制限（デフォルト10件）

**検索機能**:
```typescript
const results = await searchSimilarKnowledge({
  projectId: 'project-123',
  queryText: '統合報告書の作成方法',
  limit: 10,
  threshold: 0.7,
  category: 'integrated-report', // オプション
});

// 結果:
// [
//   {
//     knowledge: { id: "...", content: "...", ... },
//     similarity: 0.92,
//     distance: 0.08
//   },
//   ...
// ]
```

### 7. 3層重複排除システム

**ファイル**: `functions/src/services/deduplicationService.ts`

#### 3つの検出レイヤー

**Layer 1: 完全一致検出**
- 方法: 正規化テキストの完全比較
- 閾値: 100%一致
- 用途: 同一ドキュメントの重複検出

**Layer 2: セマンティック検出**
- 方法: 埋め込みベクトルのコサイン類似度
- 閾値: 95%類似度
- 用途: 意味が同じで表現が異なるテキストの検出

**Layer 3: ファジー検出**
- 方法: Levenshtein距離
- 閾値: 85%類似度
- 用途: タイポやわずかな変更があるテキストの検出

#### 重複グループ管理

```typescript
// 重複検出
const duplicatesFound = await detectDuplicates(projectId, knowledgeIds);

// 重複統計
const stats = await getDuplicateStats(projectId);
// {
//   totalKnowledge: 1000,
//   uniqueKnowledge: 850,
//   duplicateGroups: 50,
//   totalDuplicates: 150,
//   exactMatches: 80,
//   semanticMatches: 50,
//   fuzzyMatches: 20
// }
```

**グループ構造**:
- 代表ナレッジ（`isRepresentative: true`）
- 重複ナレッジリスト
- 類似度スコア
- 検出方法（exact/semantic/fuzzy）

---

## 📁 ファイル構成

```
/home/user/ET-AI/
├── firebase.json                                    # Firebase設定
├── firestore.rules                                  # Firestoreセキュリティルール
├── firestore.indexes.json                          # Firestoreインデックス
├── storage.rules                                    # Storageセキュリティルール
├── functions/
│   ├── package.json                                # Cloud Functions依存関係
│   ├── tsconfig.json                               # TypeScript設定
│   ├── .gitignore                                  # Git除外設定
│   └── src/
│       ├── index.ts                                # エントリーポイント (117行)
│       ├── fileProcessing.ts                       # ファイル処理 (295行)
│       ├── config/
│       │   └── firebase.ts                         # Firebase設定 (169行)
│       ├── types/
│       │   └── index.ts                            # 型定義 (140行)
│       └── services/
│           ├── pdfExtractor.ts                     # PDF抽出 (130行)
│           ├── docxExtractor.ts                    # DOCX抽出 (175行)
│           ├── textChunker.ts                      # チャンキング (210行)
│           ├── embeddingService.ts                 # 埋め込み生成 (231行)
│           ├── vectorSearchService.ts              # Vector Search (254行)
│           └── deduplicationService.ts             # 重複排除 (349行)
└── PHASE2_IMPLEMENTATION.md                         # このファイル
```

**合計**: 約2,070行の新規TypeScriptコード

---

## 🔧 インストールされた依存関係

### Cloud Functions

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "pdf-parse": "^2.4.5",
    "mammoth": "^1.11.0",
    "voyageai": "^0.0.3",
    "p-queue": "^9.0.0",
    "p-retry": "^7.1.0",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/pdf-parse": "^1.1.4",
    "typescript": "~5.8.2",
    "firebase-functions-test": "^3.0.0"
  }
}
```

---

## 🚀 使用方法

### Cloud Functionsのデプロイ

```bash
# Cloud Functionsをビルド
cd functions
npm run build

# デプロイ
firebase deploy --only functions

# 特定の関数のみデプロイ
firebase deploy --only functions:processFileUpload
```

### ファイルアップロードの使用例

```typescript
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// 1. ドキュメントメタデータを作成
const documentRef = await addDoc(collection(db, 'documents'), {
  projectId: 'project-123',
  filename: file.name,
  originalName: file.name,
  contentType: file.type,
  size: file.size,
  uploadedBy: currentUser.uid,
  uploadedAt: serverTimestamp(),
  status: 'uploading',
});

// 2. Storageにアップロード（Cloud Functionが自動でトリガーされる）
const storageRef = ref(
  storage,
  `documents/${projectId}/${documentRef.id}`
);

await uploadBytes(storageRef, file);

// 3. 処理完了を待つ（Firestoreのstatusフィールドを監視）
const unsubscribe = onSnapshot(documentRef, (doc) => {
  const data = doc.data();
  if (data.status === 'completed') {
    console.log('処理完了!', data);
    unsubscribe();
  } else if (data.status === 'failed') {
    console.error('処理失敗:', data.errorMessage);
    unsubscribe();
  }
});
```

### Vector Searchの使用例

```typescript
import { httpsCallable } from 'firebase/functions';

const vectorSearch = httpsCallable(functions, 'vectorSearch');

const result = await vectorSearch({
  projectId: 'project-123',
  queryText: '人的資本経営の開示事例',
  limit: 10,
  threshold: 0.7,
  category: 'human-capital', // オプション
});

console.log('検索結果:', result.data.results);
// [
//   {
//     knowledge: { content: "...", metadata: { ... } },
//     similarity: 0.92,
//     distance: 0.08
//   },
//   ...
// ]
```

### 重複統計の取得

```typescript
const duplicateStats = httpsCallable(functions, 'duplicateStats');

const result = await duplicateStats({
  projectId: 'project-123',
});

console.log('重複統計:', result.data.stats);
// {
//   totalKnowledge: 1000,
//   uniqueKnowledge: 850,
//   duplicateGroups: 50,
//   totalDuplicates: 150,
//   exactMatches: 80,
//   semanticMatches: 50,
//   fuzzyMatches: 20
// }
```

---

## 🔐 セキュリティ機能

### Firestoreセキュリティルール

1. **ドメイン制限**: @trias.co.jp のみ許可
2. **RBAC**: admin/employeeロールに基づく権限制御
3. **データバリデーション**: サイズ制限、型チェック
4. **所有権チェック**: ユーザーは自分のデータのみ編集可能

### Storageセキュリティルール

1. **ファイルサイズ制限**: 5MB
2. **ファイルタイプ制限**: PDF/DOCXのみ
3. **プロジェクトベースのアクセス制御**
4. **ファイルの不変性**: アップロード後は更新不可

### Cloud Functions

1. **認証必須**: すべてのCallable Functionsで認証チェック
2. **エラーハンドリング**: 詳細なエラーログとユーザーフレンドリーなメッセージ
3. **タイムアウト設定**: 長時間実行の防止
4. **メモリ制限**: リソース使用の最適化

---

## 📊 パフォーマンス最適化

### ファイル処理

- **タイムアウト**: 540秒（9分）
- **メモリ**: 2GB
- **並列処理**: バッチ処理で複数チャンクを同時処理

### 埋め込み生成

- **バッチサイズ**: 128テキスト/リクエスト
- **レート制限**: 300リクエスト/分
- **同時実行**: 5リクエスト同時実行
- **自動リトライ**: 失敗時に最大3回リトライ

### Vector Search

- **インデックス**: Firestore Vector Searchインデックス使用
- **フィルタリング**: プロジェクト・カテゴリで事前フィルタ
- **結果制限**: デフォルト10件、最大100件

### 重複排除

- **段階的検出**: 完全一致 → セマンティック → ファジー
- **早期終了**: 完全一致が見つかれば他の検出をスキップ
- **バッチ更新**: Firestore batched writesで効率的に更新

---

## ⚠️ 注意事項と制約

### Voyage AI API

- **APIキー**: 環境変数 `VOYAGE_API_KEY` に設定必要
- **レート制限**: 300リクエスト/分、1Mトークン/分
- **コスト**: $0.00012/1Kトークン（voyage-large-2）

### Cloud Functions

- **タイムアウト**: 最大9分（HTTP: 最大60分）
- **メモリ**: デフォルト256MB、最大8GB
- **コールドスタート**: 初回実行時に数秒の遅延

### Firestore

- **書き込み制限**: 1秒あたり10,000書き込み/データベース
- **読み取り制限**: 1秒あたり50,000読み取り/データベース
- **Vector Search**: インデックス構築に数分〜数時間かかる場合あり

### Storage

- **ファイルサイズ**: 最大5MB（現在の設定）
- **同時アップロード**: 制限なし（ただしFirebase Storageの制限に従う）

---

## 🔄 次のステップ（フェーズ3）

### 優先度高

1. **フロントエンド統合**
   - ファイルアップロードUI
   - Vector Search UI
   - 重複管理UI

2. **Claude API統合拡張**
   - Vector Searchとの連携
   - ナレッジベース活用
   - 学習パターン抽出

3. **テスト実装**
   - Unit tests（Jest）
   - Integration tests
   - E2E tests

### 優先度中

4. **監視・ログ**
   - Cloud Logging統合
   - Error Reporting
   - Performance Monitoring

5. **コスト管理**
   - 使用量ダッシュボード
   - 予算アラート
   - コスト最適化

### 優先度低

6. **環境分離**
   - dev/staging/production環境
   - 環境変数管理

7. **CI/CD**
   - GitHub Actions設定
   - 自動テスト
   - 自動デプロイ

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-16 | 2.0.0 | フェーズ2実装完了 |

---

## 📞 サポート

実装に関する質問や問題が発生した場合:

1. このドキュメントを参照
2. `functions/src/` 内のコメントを確認
3. Firebase公式ドキュメントを参照
4. チームメンバーに問い合わせ

---

**フェーズ2実装完了 ✅**
次のフェーズへ進む準備が整いました。
