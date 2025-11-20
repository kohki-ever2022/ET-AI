# 大量文章（長文チャット）処理ガイド

## 概要

統合報告書のような大量文章（2万〜3万文字）をFirestoreで効率的に保存・取得する仕組みのドキュメントです。

Firestoreの1ドキュメント制限（1MB）を回避するため、5000文字ごとにチャンク化してサブコレクションに保存します。

## アーキテクチャ

### コレクション構造

```
chats/{chatId}
  ├── (メインドキュメント)
  │   ├── id: string
  │   ├── userMessage: string
  │   ├── aiResponse: string (長文の場合は空文字列)
  │   ├── isLongForm: boolean
  │   ├── totalCharCount: number
  │   ├── totalChunks: number
  │   └── chunksCollectionPath: string
  └── chunks/{chunkIndex}
      ├── chatId: string
      ├── chunkIndex: number (0, 1, 2, ...)
      ├── totalChunks: number
      ├── content: string (最大5000文字)
      ├── charCount: number
      └── createdAt: Timestamp
```

### チャンク化戦略

**基準:**
- **通常チャット**: 5000文字以下 → 1ドキュメントに全文を保存
- **長文チャット**: 5000文字超 → チャンク化してサブコレクションに保存

**チャンクサイズ:**
- 1チャンク = 最大5000文字
- Firestoreの1ドキュメント制限（1MB ≈ 50万文字）を考慮した安全なサイズ

**例:**
- 2万文字の文章 → 4チャンク（5000文字 × 4）
- 3万文字の文章 → 6チャンク（5000文字 × 6）
- 10万文字の文章 → 20チャンク（5000文字 × 20）

## 使用方法

### 1. 長文チャットの保存

```typescript
import { saveLongFormChat } from '../services/longFormChatService';

// 統合報告書（2万文字）を保存
const integratedReport = `...2万文字の統合報告書...`;

await saveLongFormChat({
  chatId: 'chat123',
  projectId: 'project456',
  channelId: 'channel789',
  userId: 'user001',
  userMessage: '2024年度の統合報告書を作成してください',
  aiResponse: integratedReport,
  approved: false,
  metadata: {
    inputTokens: 500,
    outputTokens: 15000,
    cacheReadTokens: 2000,
    processingTime: 45000,
  },
});
```

**動作:**
1. 文字数をチェック（5000文字超か？）
2. 長文の場合、5000文字ごとにチャンク化
3. メインドキュメントに`isLongForm: true`を設定
4. サブコレクション`chunks`にチャンクを保存
5. バッチ処理で一括コミット

### 2. 長文チャットの読み取り

#### 2-1. 一括読み取り

```typescript
import { loadLongFormChat } from '../services/longFormChatService';

const { chat, fullContent, loadTime } = await loadLongFormChat('chat123');

console.log(`文字数: ${fullContent.length}`);
console.log(`読み取り時間: ${loadTime}ms`);
console.log(`チャンク数: ${chat.totalChunks}`);
```

**動作:**
1. メインドキュメントを読み取り
2. `isLongForm`をチェック
3. 長文の場合、サブコレクション`chunks`を順番に読み取り
4. 全チャンクを結合して返却

#### 2-2. ストリーミング読み取り

```typescript
import { streamLongFormChat } from '../services/longFormChatService';

const stream = streamLongFormChat('chat123');

for await (const chunk of stream) {
  console.log(`チャンク受信: ${chunk.length}文字`);
  // UIに段階的に表示
}
```

**動作:**
1. メインドキュメントを読み取り
2. サブコレクション`chunks`を順番に読み取り
3. 1チャンクずつyieldして返却

**メリット:**
- 大量文章を段階的に表示できる
- 初回表示までの時間が短縮される
- ユーザー体験が向上

### 3. UIでの使用

#### 3-1. 基本的な使用

```tsx
import { LongFormChatViewer } from '../components/LongFormChatViewer';

function ChatPage({ chatId }: { chatId: string }) {
  return (
    <div>
      <h1>統合報告書</h1>
      <LongFormChatViewer
        chatId={chatId}
        enableStreaming={true}
        onLoadComplete={(chat, loadTime) => {
          console.log(`読み込み完了: ${loadTime}ms`);
          console.log(`文字数: ${chat.totalCharCount}`);
        }}
        onError={(error) => {
          console.error('エラー:', error);
        }}
      />
    </div>
  );
}
```

#### 3-2. カスタムスタイル

```tsx
import { SimpleLongFormChatViewer } from '../components/LongFormChatViewer';

function CustomChatPage({ chatId }: { chatId: string }) {
  return (
    <div className="custom-chat-container">
      <SimpleLongFormChatViewer
        chatId={chatId}
        enableStreaming={false}
      />
    </div>
  );
}
```

### 4. 更新・削除

#### 4-1. 承認ステータスの更新

```typescript
import { updateLongFormChatApproval } from '../services/longFormChatService';

// チャットを承認
await updateLongFormChatApproval('chat123', true, 'user001');

// チャットの承認を取り消し
await updateLongFormChatApproval('chat123', false, 'user001');
```

#### 4-2. 削除

```typescript
import { deleteLongFormChat } from '../services/longFormChatService';

// チャットとチャンクを完全に削除
await deleteLongFormChat('chat123');
```

**動作:**
1. メインドキュメントを読み取り
2. `isLongForm`の場合、全チャンクを削除
3. メインドキュメントも削除
4. バッチ処理で一括コミット

## パフォーマンス

### ベンチマーク（10万文字の文章）

| 操作 | 処理時間 | チャンク数 | 備考 |
|------|---------|-----------|------|
| 保存（バッチ） | ~500ms | 20 | バッチコミット1回 |
| 一括読み取り | ~300ms | 20 | 全チャンクを一度に取得 |
| ストリーミング読み取り | ~350ms | 20 | チャンクごとにyield |

**測定環境:**
- Firestore: asia-northeast1 (東京リージョン)
- ネットワーク: 100Mbps
- 文字数: 100,000文字
- チャンクサイズ: 5000文字

### パフォーマンステスト

```bash
# パフォーマンステストの実行
npx tsx scripts/testLongFormChat.ts
```

**テスト内容:**
1. 10万文字のテキスト生成
2. 保存処理のベンチマーク
3. 一括読み取りのベンチマーク
4. ストリーミング読み取りのベンチマーク
5. 統計情報の取得

## ベストプラクティス

### 1. 適切なチャンクサイズ

```typescript
// ✅ 推奨: デフォルトの5000文字
const MAX_CHUNK_SIZE = 5000;

// ❌ 非推奨: 大きすぎる（Firestoreの制限に近づく）
const MAX_CHUNK_SIZE = 100000;

// ❌ 非推奨: 小さすぎる（チャンク数が増えすぎる）
const MAX_CHUNK_SIZE = 500;
```

### 2. ストリーミング vs 一括読み取り

**ストリーミング読み取りを使用すべきケース:**
- 文字数が1万文字以上
- ユーザーに段階的に表示したい
- 初回表示までの時間を短縮したい

**一括読み取りを使用すべきケース:**
- 文字数が1万文字未満
- 全文を一度に処理する必要がある
- シンプルな実装が望ましい

### 3. エラーハンドリング

```typescript
try {
  await saveLongFormChat({...});
} catch (error) {
  if (error.code === 'permission-denied') {
    console.error('権限エラー: Firestoreアクセスが拒否されました');
  } else if (error.code === 'unavailable') {
    console.error('ネットワークエラー: Firestoreに接続できません');
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

### 4. バッチ処理の活用

```typescript
// ✅ 推奨: バッチ処理で一括保存（saveLongFormChatが自動的に使用）
await saveLongFormChat({...});

// ❌ 非推奨: 1つずつ保存（遅い）
for (const chunk of chunks) {
  await chunkRef.set(chunk); // 各チャンクで個別にネットワーク通信が発生
}
```

### 5. インデックスの最適化

`firestore.indexes.json`に以下のインデックスを追加:

```json
{
  "collectionGroup": "chunks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "chatId", "order": "ASCENDING" },
    { "fieldPath": "chunkIndex", "order": "ASCENDING" }
  ]
}
```

## トラブルシューティング

### Q1. チャンクの順序がバラバラになる

**原因:** `chunkIndex`でソートしていない

**解決策:**
```typescript
// ✅ 正しい: chunkIndexでソート
const chunksSnapshot = await chatRef
  .collection('chunks')
  .orderBy('chunkIndex', 'asc')
  .get();

// ❌ 間違い: ソートなし
const chunksSnapshot = await chatRef.collection('chunks').get();
```

### Q2. 保存に失敗する

**原因:** バッチサイズの制限（最大500操作）を超えている

**解決策:**
```typescript
// 20チャンク以下なら問題なし（1チャット + 20チャンク = 21操作）
// 500チャンク以上の場合は、複数のバッチに分割する必要あり
if (chunks.length > 400) {
  // 複数のバッチに分割
  const batchSize = 400;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = db.batch();
    // ...
    await batch.commit();
  }
}
```

### Q3. 読み取りが遅い

**原因:** ネットワーク遅延、インデックス不足

**解決策:**
1. インデックスを追加（上記参照）
2. キャッシュを活用
3. ストリーミング読み取りを使用

## 制限事項

### Firestoreの制限

| 項目 | 制限 |
|------|------|
| 1ドキュメントのサイズ | 1MB（約50万文字） |
| バッチ処理の操作数 | 500操作 |
| サブコレクションの深さ | 100階層 |
| 1秒あたりの書き込み | 10,000/秒（プロジェクト全体） |

### 本システムの制限

| 項目 | 制限 |
|------|------|
| 1チャンクのサイズ | 5,000文字 |
| 最大チャンク数 | 400（理論上は無制限だが、バッチ処理の制限により推奨） |
| 最大文字数 | 200万文字（5,000文字 × 400チャンク） |

## 今後の拡張案

### 1. チャンクの圧縮

文字数をさらに削減するため、チャンクを圧縮して保存:

```typescript
import { compress, decompress } from 'lz-string';

// 保存時に圧縮
const compressedContent = compress(chunk);

// 読み取り時に解凍
const originalContent = decompress(compressedContent);
```

### 2. 並列読み取り

複数のチャンクを並列で読み取ってパフォーマンスを向上:

```typescript
const chunkPromises = chunkIds.map(id =>
  chatRef.collection('chunks').doc(id).get()
);
const chunks = await Promise.all(chunkPromises);
```

### 3. ページネーション

超大量文章（100万文字以上）の場合、ページネーションで段階的に読み取り:

```typescript
// 最初の10チャンクを読み取り
const firstPage = await chatRef
  .collection('chunks')
  .orderBy('chunkIndex')
  .limit(10)
  .get();

// 次の10チャンクを読み取り
const secondPage = await chatRef
  .collection('chunks')
  .orderBy('chunkIndex')
  .startAfter(firstPage.docs[firstPage.docs.length - 1])
  .limit(10)
  .get();
```

### 4. Cloud Storageとの連携

超大量文章の場合、Cloud Storageに保存してURLのみをFirestoreに保存:

```typescript
// Cloud Storageにアップロード
const storageRef = storage.ref(`chats/${chatId}/content.txt`);
await storageRef.putString(aiResponse);
const downloadUrl = await storageRef.getDownloadURL();

// FirestoreにURLのみ保存
await chatRef.set({
  ...otherFields,
  isStorageContent: true,
  storageUrl: downloadUrl,
});
```

## 参考資料

- [Firestoreスキーマ定義](./types/firestore.ts)
- [長文チャットサービス](./services/longFormChatService.ts)
- [長文チャットビューア](./components/LongFormChatViewer.tsx)
- [パフォーマンステスト](./scripts/testLongFormChat.ts)
- [Firestore公式ドキュメント - 使用量と制限](https://firebase.google.com/docs/firestore/quotas)

## まとめ

本システムにより、統合報告書のような大量文章を効率的に管理できます:

- ✅ 5000文字ごとにチャンク化して保存
- ✅ ストリーミング読み取りでUX向上
- ✅ バッチ処理で高速な書き込み
- ✅ 最大200万文字まで対応
- ✅ シンプルなAPI設計

統合報告書、サステナビリティレポート、株主通信など、様々な長文コンテンツに対応できます。
