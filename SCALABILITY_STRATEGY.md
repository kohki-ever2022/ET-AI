# ET-AI スケーラビリティ戦略

## 📋 目次

- [概要](#概要)
- [現在のアーキテクチャ分析](#現在のアーキテクチャ分析)
- [スケーリング戦略](#スケーリング戦略)
- [コスト予測](#コスト予測)
- [ボトルネック分析と対策](#ボトルネック分析と対策)
- [実装フェーズ](#実装フェーズ)
- [モニタリング戦略](#モニタリング戦略)

---

## 概要

ET-AIシステムを**10ユーザー → 50ユーザー → 100ユーザー**にスケールする際の包括的な戦略を定義します。

### スケーリング目標

| 段階 | ユーザー数 | 想定プロジェクト数 | 月間チャット数 | 達成時期 |
|------|-----------|------------------|--------------|---------|
| **Phase 1（現在）** | 10 | 20 | 2,000 | 2025 Q1 |
| **Phase 2** | 50 | 100 | 10,000 | 2025 Q2 |
| **Phase 3** | 100 | 200 | 20,000 | 2025 Q3-Q4 |

### 主要な課題

1. **Claude APIのレート制限**: 50ユーザー時に制限に到達するリスク
2. **Firestoreのコスト増加**: 100ユーザーで月間読み取り500万回を超える可能性
3. **Cloud Functionsの同時実行**: ピーク時の同時実行数が制限に達する
4. **Vector Searchのインデックスサイズ**: 100万チャンク到達時のパフォーマンス低下

---

## 現在のアーキテクチャ分析

### システム構成

```
┌─────────────────────────────────────────────────────────┐
│                     クライアント                          │
│              (React + Firebase SDK)                      │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────────┐         ┌─────▼─────────┐
│  Firebase  │         │ Cloud         │
│  Hosting   │         │ Functions     │
└────────────┘         └───┬───────┬───┘
                           │       │
              ┌────────────┘       └──────────┐
              │                               │
      ┌───────▼────────┐            ┌────────▼────────┐
      │   Firestore    │            │  External APIs  │
      │   Database     │            │  - Claude API   │
      │                │            │  - Voyage AI    │
      └────────────────┘            └─────────────────┘
```

### 現在のリソース使用状況（10ユーザー想定）

#### Cloud Functions

| 関数名 | メモリ | タイムアウト | 月間実行回数 | 実行時間平均 |
|--------|--------|------------|------------|------------|
| `processFileUpload` | 1GB | 540s | 200 | 45s |
| `vectorSearch` | 512MB | 60s | 4,000 | 2s |
| `processChat` | 1GB | 300s | 2,000 | 15s |
| `generateEmbeddings` | 512MB | 120s | 800 | 8s |

**合計コスト**: 約 $15/月

#### Firestore

| 操作 | 月間回数（10ユーザー） | コスト |
|------|---------------------|--------|
| 読み取り | 500,000 | $0.18 |
| 書き込み | 50,000 | $0.90 |
| 削除 | 5,000 | $0.09 |
| ストレージ (10GB) | - | $1.80 |

**合計コスト**: 約 $3/月

#### Claude API（3層キャッシング有効）

| トークンタイプ | 月間トークン数 | 単価 | コスト |
|--------------|--------------|------|--------|
| Input（通常） | 5M | $3/M | $15.00 |
| Cache Write | 3M | $3.75/M | $11.25 |
| Cache Read | 45M | $0.30/M | $13.50 |
| Output | 4M | $15/M | $60.00 |

**キャッシュなし想定コスト**: $150/月
**3層キャッシング適用後**: $99.75/月
**コスト削減率**: 33.5%

#### Voyage AI（Embedding API）

| 操作 | 月間トークン数 | 単価 | コスト |
|------|--------------|------|--------|
| voyage-3 (1024次元) | 2M | $0.06/M | $0.12 |

**合計コスト**: 約 $0.12/月

### 現在の合計月間コスト: **約 $118/月**

---

## スケーリング戦略

### Phase 2: 50ユーザー対応

#### 1. Cloud Functions スケーリング

##### 同時実行制限の調整

**現在の設定**:
```typescript
// functions/src/index.ts
export const processChat = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
    maxInstances: 10, // ← 現在
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

**50ユーザー向け設定**:
```typescript
export const processChat = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
    maxInstances: 30, // 10 → 30 に増加
    minInstances: 2,  // コールドスタート防止
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

**調整内容**:

| 関数 | 現在のmaxInstances | 50ユーザー時 | 100ユーザー時 |
|------|------------------|------------|--------------|
| `processChat` | 10 | 30 | 60 |
| `vectorSearch` | 10 | 50 | 100 |
| `processFileUpload` | 5 | 15 | 30 |
| `generateEmbeddings` | 10 | 30 | 60 |

**minInstances追加によるメリット**:
- コールドスタート時間: 3-5秒 → 0秒
- レスポンス時間の安定化
- ユーザー体験の向上

**追加コスト**:
- minInstances=2（常時起動）: 約 $10/月 × 2関数 = $20/月

##### メモリ最適化

**processFileUpload の最適化**:
```typescript
// 大容量ファイル処理用
export const processFileUpload = functions
  .runWith({
    memory: '2GB', // 1GB → 2GB（大容量PDF対応）
    timeoutSeconds: 540,
    maxInstances: 15,
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

#### 2. Firestore スケーリング

##### 読み取り最適化戦略

**キャッシング階層の導入**:

```typescript
// クライアント側キャッシュ（React Query）
import { useQuery } from '@tanstack/react-query';

export function useProjectData(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    cacheTime: 30 * 60 * 1000, // 30分間保持
  });
}
```

**効果**:
- 重複読み取りを70%削減
- 500,000読み取り → 150,000読み取り
- コスト削減: $0.18 → $0.05/月

##### Firebaseローカルキャッシュの有効化

```typescript
// config/firebase.ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
```

**効果**:
- オフライン対応
- 読み取り回数50%削減
- ページロード時間の短縮

##### バッチ読み取りの最適化

**現在の実装**:
```typescript
// 非効率: N+1クエリ
for (const chat of chats) {
  const user = await getDoc(doc(db, 'users', chat.userId));
  const project = await getDoc(doc(db, 'projects', chat.projectId));
}
// 読み取り回数: chats.length × 2
```

**最適化後**:
```typescript
// 効率的: バッチ取得
const userIds = [...new Set(chats.map(c => c.userId))];
const projectIds = [...new Set(chats.map(c => c.projectId))];

const [users, projects] = await Promise.all([
  getMultipleDocs(db, 'users', userIds),
  getMultipleDocs(db, 'projects', projectIds),
]);
// 読み取り回数: userIds.length + projectIds.length
```

**効果**: 読み取り回数を最大80%削減

##### インデックス最適化

**複合インデックスの追加**:
```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "knowledge",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "projectId", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "embedding", "order": "ASCENDING" }
      ]
    }
  ]
}
```

#### 3. Claude API レート制限対策

##### 現在のレート制限（Tier 2想定）

| 制限タイプ | 制限値 | 現在の使用率 | 50ユーザー時 | 100ユーザー時 |
|----------|--------|------------|------------|--------------|
| RPM（リクエスト/分） | 50 | 10% (5 RPM) | 60% (30 RPM) | 120% (60 RPM) ⚠️ |
| TPM（トークン/分） | 40,000 | 20% (8K TPM) | 75% (30K TPM) | 150% (60K TPM) ⚠️ |
| RPD（リクエスト/日） | 50,000 | 5% (2,500) | 20% (10,000) | 40% (20,000) |

##### 対策1: キュー制御システムの実装

**queueService.ts の拡張**:
```typescript
// functions/src/services/queueService.ts

interface QueueConfig {
  maxConcurrent: number;  // 同時実行数
  rateLimitRPM: number;   // RPM制限
  retryAttempts: number;  // リトライ回数
  retryDelay: number;     // リトライ遅延（ms）
}

const CLAUDE_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 25,      // 50 RPM制限の50%に抑える
  rateLimitRPM: 25,       // APIレート制限の50%
  retryAttempts: 3,
  retryDelay: 2000,
};

export class ClaudeRequestQueue {
  private queue: Array<QueuedRequest> = [];
  private processing = 0;
  private lastMinute: number[] = [];

  async enqueue(request: ClaudeAPIRequest): Promise<ClaudeAPIResponse> {
    // レート制限チェック
    this.cleanOldTimestamps();

    if (this.lastMinute.length >= CLAUDE_QUEUE_CONFIG.rateLimitRPM) {
      // 待機時間を計算
      const oldestTimestamp = this.lastMinute[0];
      const waitTime = 60000 - (Date.now() - oldestTimestamp);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // リクエストを処理
    this.lastMinute.push(Date.now());
    return this.processRequest(request);
  }

  private cleanOldTimestamps() {
    const oneMinuteAgo = Date.now() - 60000;
    this.lastMinute = this.lastMinute.filter(ts => ts > oneMinuteAgo);
  }
}
```

##### 対策2: プロンプトキャッシングの最適化

**キャッシュヒット率の向上**:

現在のキャッシュヒット率:
- 第1層（コア制約）: 100%
- 第2層（IR専門知識）: 95%
- 第3層（プロジェクト固有）: 70%

**目標**: 第3層のヒット率を70% → 85%に向上

**実装**:
```typescript
// services/claudeService.ts

// プロジェクトナレッジのキャッシュキー生成
function generateKnowledgeCacheKey(projectId: string, queryText: string): string {
  // クエリの意味的類似性を考慮したキャッシュキー
  const normalizedQuery = normalizeQuery(queryText);
  const semanticHash = hashSemanticContent(normalizedQuery);
  return `${projectId}:${semanticHash}`;
}

// 類似クエリの検出とキャッシュ再利用
async function getCachedKnowledge(
  cacheKey: string
): Promise<Knowledge[] | null> {
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}
```

**効果**:
- トークン消費量: 15%削減
- レスポンス時間: 30%短縮
- コスト削減: $15/月

##### 対策3: Tier 3へのアップグレード検討

**Tier 3の制限値**:
- RPM: 1,000（20倍）
- TPM: 80,000（2倍）
- RPD: 300,000（6倍）

**アップグレード条件**:
- 50ユーザー到達時点で検討
- 月間利用額が$1,000を超える場合

**申請方法**: Anthropic サポートに連絡

#### 4. Vector Search スケーリング

##### インデックスサイズの管理

**現在のインデックスサイズ予測**:

| ユーザー数 | プロジェクト数 | ナレッジ件数 | Embedding数 | インデックスサイズ |
|----------|--------------|------------|------------|-----------------|
| 10 | 20 | 10,000 | 50,000 | 200MB |
| 50 | 100 | 50,000 | 250,000 | 1GB |
| 100 | 200 | 100,000 | 500,000 | 2GB |

##### 最適化戦略

**1. インデックスのパーティショニング**:
```typescript
// functions/src/services/vectorSearchService.ts

// プロジェクトごとにインデックスを分割
async function searchInPartitionedIndex(
  projectId: string,
  queryEmbedding: number[],
  limit: number
): Promise<SearchResult[]> {
  // プロジェクト固有のインデックスを検索
  const results = await db
    .collection('knowledge')
    .where('projectId', '==', projectId)
    .where('embedding', '!=', null)
    .get();

  // コサイン類似度計算
  const scored = results.docs.map(doc => {
    const data = doc.data();
    const similarity = calculateCosineSimilarity(
      queryEmbedding,
      data.embedding
    );
    return { doc, similarity };
  });

  // 上位N件を返す
  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
```

**2. 古いナレッジの自動アーカイブ**:
```typescript
// functions/src/scheduledArchiveOldKnowledge.ts

export const archiveOldKnowledge = onSchedule('every 7 days', async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const oldKnowledge = await db
    .collection('knowledge')
    .where('lastAccessedAt', '<', sixMonthsAgo)
    .where('isArchived', '==', false)
    .limit(1000)
    .get();

  const batch = db.batch();
  oldKnowledge.docs.forEach(doc => {
    batch.update(doc.ref, {
      isArchived: true,
      archivedAt: serverTimestamp(),
      embedding: admin.firestore.FieldValue.delete(), // Embeddingを削除
    });
  });

  await batch.commit();
  console.log(`Archived ${oldKnowledge.size} knowledge entries`);
});
```

**効果**:
- インデックスサイズ: 30%削減
- 検索速度: 40%向上
- ストレージコスト: 20%削減

##### Voyage AI レート制限対策

**現在のレート制限**:
- RPM: 300
- TPM: 1,000,000

**50ユーザー時の予測使用率**:
- RPM: 150 (50%)
- TPM: 300,000 (30%)

**対策**: 現在の制限で十分対応可能

---

## コスト予測

### Phase 2: 50ユーザー時のコスト

#### Cloud Functions

| 関数 | 実行回数/月 | 実行時間 | メモリ | コスト |
|------|-----------|---------|--------|--------|
| `processChat` | 10,000 | 15s | 1GB | $30 |
| `vectorSearch` | 20,000 | 2s | 512MB | $8 |
| `processFileUpload` | 1,000 | 45s | 2GB | $18 |
| `generateEmbeddings` | 4,000 | 8s | 512MB | $6 |
| minInstances (常時起動) | - | - | - | $20 |

**合計**: $82/月

#### Firestore

| 操作 | 月間回数 | 単価 | コスト |
|------|---------|------|--------|
| 読み取り（最適化後） | 1,500,000 | $0.36/M | $0.54 |
| 書き込み | 250,000 | $1.80/M | $4.50 |
| 削除 | 25,000 | $0.18/M | $0.45 |
| ストレージ (50GB) | - | $0.18/GB | $9.00 |

**合計**: $14.49/月

#### Claude API（3層キャッシング）

| トークンタイプ | 月間トークン数 | 単価 | コスト |
|--------------|--------------|------|--------|
| Input（通常） | 25M | $3/M | $75 |
| Cache Write | 15M | $3.75/M | $56.25 |
| Cache Read | 225M | $0.30/M | $67.50 |
| Output | 20M | $15/M | $300 |

**合計**: $498.75/月

**キャッシュなし想定**: $750/月
**削減率**: 33.5%

#### Voyage AI

| 操作 | 月間トークン数 | 単価 | コスト |
|------|--------------|------|--------|
| voyage-3 | 10M | $0.06/M | $0.60 |

**合計**: $0.60/月

#### その他のコスト

| サービス | コスト |
|---------|--------|
| Firebase Hosting | $5/月 |
| Firebase Storage | $5/月 |
| Cloud Logging | $3/月 |

**合計**: $13/月

### **50ユーザー時の合計月間コスト: $608.84/月**

**1ユーザーあたり**: $12.18/月

---

### Phase 3: 100ユーザー時のコスト

#### Cloud Functions

| 関数 | 実行回数/月 | 実行時間 | メモリ | コスト |
|------|-----------|---------|--------|--------|
| `processChat` | 20,000 | 15s | 1GB | $60 |
| `vectorSearch` | 40,000 | 2s | 512MB | $16 |
| `processFileUpload` | 2,000 | 45s | 2GB | $36 |
| `generateEmbeddings` | 8,000 | 8s | 512MB | $12 |
| minInstances (常時起動) | - | - | - | $40 |

**合計**: $164/月

#### Firestore

| 操作 | 月間回数 | 単価 | コスト |
|------|---------|------|--------|
| 読み取り（最適化後） | 3,000,000 | $0.36/M | $1.08 |
| 書き込み | 500,000 | $1.80/M | $9.00 |
| 削除 | 50,000 | $0.18/M | $0.90 |
| ストレージ (100GB) | - | $0.18/GB | $18.00 |

**合計**: $28.98/月

#### Claude API（3層キャッシング + Tier 3）

| トークンタイプ | 月間トークン数 | 単価 | コスト |
|--------------|--------------|------|--------|
| Input（通常） | 50M | $3/M | $150 |
| Cache Write | 30M | $3.75/M | $112.50 |
| Cache Read | 450M | $0.30/M | $135.00 |
| Output | 40M | $15/M | $600 |

**合計**: $997.50/月

**キャッシュなし想定**: $1,500/月
**削減率**: 33.5%

#### Voyage AI

| 操作 | 月間トークン数 | 単価 | コスト |
|------|--------------|------|--------|
| voyage-3 | 20M | $0.06/M | $1.20 |

**合計**: $1.20/月

#### その他のコスト

| サービス | コスト |
|---------|--------|
| Firebase Hosting | $10/月 |
| Firebase Storage | $10/月 |
| Cloud Logging | $6/月 |

**合計**: $26/月

### **100ユーザー時の合計月間コスト: $1,217.68/月**

**1ユーザーあたり**: $12.18/月

---

### コスト比較サマリー

| 項目 | 10ユーザー | 50ユーザー | 100ユーザー | スケール効率 |
|------|----------|----------|-----------|------------|
| **合計コスト** | $118/月 | $609/月 | $1,218/月 | 線形 |
| **ユーザー単価** | $11.80 | $12.18 | $12.18 | 安定 |
| **Claude API** | $100 (85%) | $499 (82%) | $998 (82%) | 主要コスト |
| **Infrastructure** | $18 (15%) | $110 (18%) | $220 (18%) | 比例増加 |

**重要な洞察**:
- ユーザー単価は安定（$11.80 → $12.18）
- Claude APIが全体の80%以上を占める
- インフラコストはほぼ線形にスケール
- 3層キャッシングで33.5%のコスト削減を維持

---

## ボトルネック分析と対策

### ボトルネック1: Claude API レート制限

#### 問題

**50ユーザー時**:
- ピーク時RPM: 30 (制限の60%)
- 通常時は問題なし
- イベント時（統合報告書締切日）に制限到達リスク

**100ユーザー時**:
- ピーク時RPM: 60 (制限の120%) ⚠️ **制限超過**
- 確実に制限に到達

#### 影響度

- **優先度**: 🔴 Critical
- **発生確率**: 100ユーザーで確実に発生
- **ユーザー影響**: チャット送信失敗、エラーメッセージ

#### 対策

**1. キュー制御システム（必須）**:

実装場所: `functions/src/services/queueService.ts`

```typescript
export class PriorityQueue {
  private queues: {
    high: QueuedRequest[];
    normal: QueuedRequest[];
    low: QueuedRequest[];
  };

  async enqueue(
    request: ClaudeAPIRequest,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<ClaudeAPIResponse> {
    this.queues[priority].push({
      request,
      timestamp: Date.now(),
      retries: 0,
    });

    return this.process();
  }

  private async process(): Promise<ClaudeAPIResponse> {
    // 優先度順に処理
    const request =
      this.queues.high.shift() ||
      this.queues.normal.shift() ||
      this.queues.low.shift();

    if (!request) {
      throw new Error('Queue is empty');
    }

    // レート制限チェック
    await this.waitForRateLimit();

    // リクエスト実行
    try {
      return await callClaudeAPI(request.request);
    } catch (error) {
      if (isRateLimitError(error) && request.retries < 3) {
        // リトライキューに追加
        request.retries++;
        this.queues.low.push(request);
        await sleep(2000 * Math.pow(2, request.retries));
        return this.process();
      }
      throw error;
    }
  }
}
```

**効果**:
- レート制限エラー: 100% → 0%
- ユーザー体験: エラー → 待機時間表示
- コスト: 追加なし

**2. Tier 3へのアップグレード（100ユーザー時必須）**:

| 項目 | Tier 2 | Tier 3 | 改善倍率 |
|------|--------|--------|---------|
| RPM | 50 | 1,000 | 20x |
| TPM | 40,000 | 80,000 | 2x |
| RPD | 50,000 | 300,000 | 6x |

**申請条件**:
- 月間利用額: $1,000以上
- 50ユーザー到達時点で申請開始

**3. 複数APIキーによる負荷分散（緊急対応）**:

```typescript
const CLAUDE_API_KEYS = [
  process.env.ANTHROPIC_API_KEY_1,
  process.env.ANTHROPIC_API_KEY_2,
  process.env.ANTHROPIC_API_KEY_3,
];

let currentKeyIndex = 0;

function getNextAPIKey(): string {
  currentKeyIndex = (currentKeyIndex + 1) % CLAUDE_API_KEYS.length;
  return CLAUDE_API_KEYS[currentKeyIndex];
}
```

**効果**: レート制限を3倍に拡大（緊急時のみ使用）

---

### ボトルネック2: Cloud Functions 同時実行制限

#### 問題

**現在の設定**:
- `processChat`: maxInstances = 10
- ピーク時同時リクエスト: 5（50%使用）

**50ユーザー時**:
- ピーク時同時リクエスト: 25
- 10インスタンスでは不足 ⚠️

**100ユーザー時**:
- ピーク時同時リクエスト: 50
- 深刻なボトルネック

#### 影響度

- **優先度**: 🟠 High
- **発生確率**: 50ユーザーで高確率
- **ユーザー影響**: レスポンス遅延、タイムアウト

#### 対策

**1. maxInstancesの段階的増加**:

| ユーザー数 | processChat | vectorSearch | processFileUpload |
|----------|------------|--------------|------------------|
| 10 | 10 | 10 | 5 |
| 50 | 30 ⬆️ | 50 ⬆️ | 15 ⬆️ |
| 100 | 60 ⬆️ | 100 ⬆️ | 30 ⬆️ |

**実装**:
```typescript
// functions/src/index.ts
const MAX_INSTANCES = {
  processChat: parseInt(process.env.MAX_INSTANCES_CHAT || '10'),
  vectorSearch: parseInt(process.env.MAX_INSTANCES_SEARCH || '10'),
  processFileUpload: parseInt(process.env.MAX_INSTANCES_UPLOAD || '5'),
};

export const processChat = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
    maxInstances: MAX_INSTANCES.processChat,
    minInstances: Math.min(2, MAX_INSTANCES.processChat / 10),
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

**2. minInstancesによるコールドスタート対策**:

**効果**:
- コールドスタート時間: 3-5秒 → 0秒
- P95レスポンス時間: 20秒 → 15秒
- ユーザー満足度向上

**コスト**: $20/月（minInstances=2で2関数）

**3. 並行処理の最適化**:

```typescript
// 非効率な直列処理
const knowledge = await searchKnowledge(query);
const embedding = await generateEmbedding(text);
const response = await callClaude(message);

// 最適化: 並行処理
const [knowledge, embedding] = await Promise.all([
  searchKnowledge(query),
  generateEmbedding(text),
]);
const response = await callClaude(message, knowledge);
```

**効果**:
- 処理時間: 30秒 → 20秒（33%短縮）
- 同時実行数: 20%削減

---

### ボトルネック3: Firestore 読み取りコスト

#### 問題

**予測コスト増加**:

| ユーザー数 | 月間読み取り | コスト | ユーザー単価 |
|----------|------------|--------|------------|
| 10 | 500,000 | $0.18 | $0.018 |
| 50 | 2,500,000 | $0.90 | $0.018 |
| 100 | 5,000,000 | $1.80 | $0.018 |

**問題点**:
- 読み取り回数が線形増加
- キャッシュなしでは10倍のコスト

#### 影響度

- **優先度**: 🟡 Medium
- **発生確率**: 確実に発生
- **ユーザー影響**: なし（コストのみ）

#### 対策

**1. クライアント側キャッシング（React Query）**:

```typescript
// hooks/useProject.ts
import { useQuery } from '@tanstack/react-query';

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    staleTime: 5 * 60 * 1000,      // 5分間新鮮
    cacheTime: 30 * 60 * 1000,     // 30分間保持
    refetchOnWindowFocus: false,   // フォーカス時再取得なし
  });
}
```

**効果**:
- 読み取り削減: 70%
- 5,000,000 → 1,500,000読み取り
- コスト削減: $1.80 → $0.54/月

**2. Firestoreローカルキャッシュ**:

```typescript
// config/firebase.ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
```

**効果**:
- オフライン対応
- 追加で30%の読み取り削減
- ページロード高速化

**3. バッチ読み取りの徹底**:

```typescript
// utils/firestoreHelpers.ts
export async function batchGetDocs<T>(
  db: Firestore,
  collection: string,
  ids: string[]
): Promise<Map<string, T>> {
  // 最大10件ずつバッチ取得
  const chunks = chunkArray(ids, 10);

  const results = await Promise.all(
    chunks.map(chunk =>
      getDocs(
        query(
          collection(db, collection),
          where(documentId(), 'in', chunk)
        )
      )
    )
  );

  const map = new Map<string, T>();
  results.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      map.set(doc.id, doc.data() as T);
    });
  });

  return map;
}
```

**効果**:
- N+1クエリ解消
- 読み取り回数: 80%削減

**総合効果**:
- 読み取りコスト: $1.80 → $0.36/月（80%削減）

---

### ボトルネック4: Vector Search パフォーマンス

#### 問題

**インデックスサイズ増加**:

| ユーザー数 | ナレッジ件数 | Embedding数 | インデックスサイズ | 検索時間 |
|----------|------------|------------|-----------------|---------|
| 10 | 10,000 | 50,000 | 200MB | 100ms |
| 50 | 50,000 | 250,000 | 1GB | 300ms |
| 100 | 100,000 | 500,000 | 2GB | 600ms ⚠️ |

**問題点**:
- 検索時間が線形増加
- 600msはユーザー体験に悪影響

#### 影響度

- **優先度**: 🟡 Medium
- **発生確率**: 100ユーザーで確実に発生
- **ユーザー影響**: 検索遅延

#### 対策

**1. プロジェクト別インデックス分割**:

```typescript
// 現在: 全プロジェクトを一括検索
const allKnowledge = await db.collection('knowledge').get();

// 最適化: プロジェクトごとに検索
const projectKnowledge = await db
  .collection('knowledge')
  .where('projectId', '==', projectId)
  .get();
```

**効果**:
- 検索対象: 100,000件 → 500件（200分の1）
- 検索時間: 600ms → 50ms（92%短縮）

**2. インデックスのパーティショニング**:

```typescript
// Firestoreのサブコレクションを活用
// projects/{projectId}/knowledge/{knowledgeId}

async function searchProjectKnowledge(
  projectId: string,
  queryEmbedding: number[]
): Promise<SearchResult[]> {
  // プロジェクト固有のサブコレクションを検索
  const snapshot = await db
    .collection('projects')
    .doc(projectId)
    .collection('knowledge')
    .where('embedding', '!=', null)
    .limit(1000)
    .get();

  // コサイン類似度計算
  return calculateSimilarities(snapshot, queryEmbedding);
}
```

**効果**:
- 検索範囲の限定
- キャッシュ効率の向上
- 検索時間: 50%削減

**3. 古いナレッジの自動アーカイブ**:

```typescript
// 6ヶ月以上アクセスがないナレッジをアーカイブ
export const archiveOldKnowledge = onSchedule('every 7 days', async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const oldKnowledge = await db
    .collection('knowledge')
    .where('lastAccessedAt', '<', sixMonthsAgo)
    .where('isArchived', '==', false)
    .limit(1000)
    .get();

  const batch = db.batch();
  oldKnowledge.docs.forEach(doc => {
    // Embeddingを削除してストレージ削減
    batch.update(doc.ref, {
      isArchived: true,
      embedding: admin.firestore.FieldValue.delete(),
    });
  });

  await batch.commit();
});
```

**効果**:
- インデックスサイズ: 30%削減
- ストレージコスト: 20%削減
- 検索速度: 40%向上

**4. 専用Vector DBへの移行検討（将来）**:

**オプション**:
- **Pinecone**: フルマネージドVector DB
- **Weaviate**: オープンソースVector DB
- **Qdrant**: 高性能Vector検索

**移行タイミング**:
- 100万件のナレッジ到達時
- 検索時間が1秒を超える場合

**コスト比較**:

| サービス | 月額コスト | 検索速度 | スケーラビリティ |
|---------|----------|---------|---------------|
| Firestore（現在） | $2/月 | 300-600ms | 中 |
| Pinecone Starter | $70/月 | 50-100ms | 高 |
| Weaviate (自己ホスト) | $30/月 | 100-200ms | 高 |

**推奨**: 100ユーザー到達後に検討

---

## 実装フェーズ

### Phase 2 準備（0-10ユーザー → 50ユーザー）

#### Week 1-2: インフラ強化

**タスク**:
- [x] Cloud Functions maxInstances 調整
  - `processChat`: 10 → 30
  - `vectorSearch`: 10 → 50
  - `processFileUpload`: 5 → 15

- [x] minInstances 導入（コールドスタート対策）
  - `processChat`: minInstances = 2
  - `vectorSearch`: minInstances = 2

- [x] Firestore複合インデックス追加
  - chats: projectId + userId + createdAt
  - knowledge: projectId + category + embedding

**検証方法**:
```bash
# Load testing with Apache Bench
ab -n 1000 -c 50 https://your-project.web.app/api/processChat
```

#### Week 3-4: キャッシング最適化

**タスク**:
- [ ] React Query導入
  ```bash
  npm install @tanstack/react-query
  ```

- [ ] Firestoreローカルキャッシュ有効化
  ```typescript
  // config/firebase.ts
  import { persistentLocalCache } from 'firebase/firestore';
  ```

- [ ] バッチ読み取りユーティリティ実装
  ```typescript
  // utils/firestoreHelpers.ts
  export async function batchGetDocs<T>(...)
  ```

**目標**:
- Firestore読み取り削減: 70%
- ページロード時間短縮: 50%

#### Week 5-6: Claude API レート制限対策

**タスク**:
- [ ] キュー制御システム実装
  ```typescript
  // functions/src/services/queueService.ts
  export class ClaudeRequestQueue { ... }
  ```

- [ ] レート制限モニタリング
  ```typescript
  // functions/src/monitoring/rateLimitMonitor.ts
  export async function logRateLimitStatus() { ... }
  ```

- [ ] Tier 3申請準備
  - 利用実績レポート作成
  - Anthropic サポートに連絡

**検証方法**:
```typescript
// テストスクリプト
for (let i = 0; i < 100; i++) {
  await callClaudeAPI(testRequest);
}
// エラーが発生しないことを確認
```

#### Week 7-8: Vector Search 最適化

**タスク**:
- [ ] プロジェクト別インデックス分割
  ```typescript
  // functions/src/services/vectorSearchService.ts
  async function searchInPartition(projectId, ...)
  ```

- [ ] 古いナレッジの自動アーカイブ
  ```typescript
  // functions/src/scheduledArchiveOldKnowledge.ts
  export const archiveOldKnowledge = onSchedule(...)
  ```

**目標**:
- 検索時間短縮: 60%
- インデックスサイズ削減: 30%

---

### Phase 3 準備（50ユーザー → 100ユーザー）

#### Month 1: スケーリング検証

**タスク**:
- [ ] Claude API Tier 3 承認待ち
- [ ] maxInstances 60に増加
- [ ] ロードテスト実施
  ```bash
  # 100同時接続でテスト
  ab -n 10000 -c 100 https://your-project.web.app/api/processChat
  ```

#### Month 2: パフォーマンス最適化

**タスク**:
- [ ] 並行処理の徹底
- [ ] データベースクエリの最適化
- [ ] CDNキャッシュの活用

#### Month 3: コスト最適化

**タスク**:
- [ ] 不要なCloud Function削除
- [ ] ストレージのライフサイクル設定
- [ ] ログ保持期間の最適化

---

## モニタリング戦略

### 重要メトリクス

#### 1. Claude API使用状況

**監視項目**:
```typescript
interface ClaudeMetrics {
  // レート制限
  currentRPM: number;        // 現在のRPM
  maxRPM: number;            // 制限値
  utilizationPercent: number; // 使用率

  // トークン使用量
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;

  // コスト
  hourlyCoat: number;
  dailyCost: number;
  monthlyCost: number;

  // キャッシュ効率
  cacheHitRate: number;
  costSavings: number;
}
```

**アラート設定**:
```typescript
// functions/src/monitoring/alerts.ts
export async function checkClaudeAPIUsage() {
  const metrics = await getClaudeMetrics();

  // RPM使用率80%以上で警告
  if (metrics.utilizationPercent > 80) {
    await sendAlert({
      severity: 'warning',
      title: 'Claude API使用率が高い',
      message: `現在のRPM: ${metrics.currentRPM}/${metrics.maxRPM} (${metrics.utilizationPercent}%)`,
      action: 'キュー制御の強化またはTier 3へのアップグレードを検討',
    });
  }

  // 日次コストが予算の120%を超えたら警告
  const dailyBudget = 40; // $40/日
  if (metrics.dailyCost > dailyBudget * 1.2) {
    await sendAlert({
      severity: 'critical',
      title: '日次コスト予算超過',
      message: `本日のコスト: $${metrics.dailyCost} (予算: $${dailyBudget})`,
      action: 'コスト削減策の実施が必要',
    });
  }
}
```

#### 2. Firestore パフォーマンス

**監視項目**:
```typescript
interface FirestoreMetrics {
  // 読み取り/書き込み
  readsPerMinute: number;
  writesPerMinute: number;
  deletesPerMinute: number;

  // レイテンシ
  avgReadLatency: number;
  p95ReadLatency: number;
  avgWriteLatency: number;

  // コスト
  dailyReads: number;
  dailyWrites: number;
  estimatedMonthlyCost: number;

  // ストレージ
  totalStorageGB: number;
  storageGrowthRate: number; // GB/日
}
```

**ダッシュボード**:
```typescript
// Cloud Functions定期実行
export const firestoreMetricsReport = onSchedule('every 1 hours', async () => {
  const metrics = await getFirestoreMetrics();

  await db.collection('system_metrics').add({
    timestamp: serverTimestamp(),
    type: 'firestore',
    metrics,
  });

  // Slackに通知（異常値のみ）
  if (metrics.p95ReadLatency > 1000) { // 1秒以上
    await sendSlackNotification({
      channel: '#et-ai-alerts',
      message: `⚠️ Firestore読み取りレイテンシが高い: ${metrics.p95ReadLatency}ms`,
    });
  }
});
```

#### 3. Cloud Functions メトリクス

**監視項目**:
```typescript
interface CloudFunctionsMetrics {
  // 実行状況
  totalInvocations: number;
  activeInstances: number;
  maxInstances: number;
  utilizationPercent: number;

  // パフォーマンス
  avgExecutionTime: number;
  p95ExecutionTime: number;
  errorRate: number;
  timeoutRate: number;

  // コスト
  totalExecutionTime: number;    // GB-seconds
  estimatedMonthlyCost: number;
}
```

### 自動スケーリングトリガー

```typescript
// functions/src/monitoring/autoScaling.ts

export const autoScaleCheck = onSchedule('every 5 minutes', async () => {
  const metrics = await getCloudFunctionsMetrics();

  // 使用率が80%を超えたら自動でmaxInstancesを増やす
  if (metrics.utilizationPercent > 80) {
    const newMaxInstances = Math.min(
      metrics.maxInstances * 1.5,  // 1.5倍に増やす
      100                          // 最大100
    );

    console.log(`Auto-scaling: ${metrics.maxInstances} → ${newMaxInstances}`);

    // 環境変数を更新（次回デプロイ時に反映）
    await updateEnvironmentVariable('MAX_INSTANCES_CHAT', newMaxInstances.toString());

    // アラート送信
    await sendAlert({
      severity: 'info',
      title: 'Cloud Functions 自動スケーリング',
      message: `maxInstancesを${metrics.maxInstances}から${newMaxInstances}に増加しました`,
    });
  }
});
```

### コストアラート

```typescript
// functions/src/monitoring/costAlerts.ts

interface BudgetAlert {
  service: 'claude' | 'firestore' | 'functions';
  dailyBudget: number;
  monthlyBudget: number;
}

const BUDGETS: BudgetAlert[] = [
  { service: 'claude', dailyBudget: 40, monthlyBudget: 1000 },
  { service: 'firestore', dailyBudget: 1, monthlyBudget: 30 },
  { service: 'functions', dailyBudget: 5, monthlyBudget: 150 },
];

export const checkBudgets = onSchedule('every 1 hours', async () => {
  for (const budget of BUDGETS) {
    const currentCost = await getCurrentDailyCost(budget.service);
    const utilizationPercent = (currentCost / budget.dailyBudget) * 100;

    if (utilizationPercent > 80) {
      await sendAlert({
        severity: utilizationPercent > 100 ? 'critical' : 'warning',
        title: `${budget.service} 予算アラート`,
        message: `本日のコスト: $${currentCost} / $${budget.dailyBudget} (${utilizationPercent.toFixed(1)}%)`,
        action: utilizationPercent > 100 ? '緊急対応が必要' : '監視を継続',
      });
    }
  }
});
```

---

## まとめ

### スケーリングロードマップ

```
現在（10ユーザー）
├── $118/月
├── 問題なく動作
└── キャッシング効果で33%削減

↓ Phase 2（2ヶ月）

50ユーザー
├── $609/月
├── インフラ強化完了
├── キャッシング最適化
├── Claude API Tier 3申請
└── 安定稼働

↓ Phase 3（3ヶ月）

100ユーザー
├── $1,218/月
├── Claude API Tier 3承認
├── 完全自動スケーリング
└── 目標達成 🎉
```

### 重要な成功要因

1. **段階的スケーリング**: 一気に100ユーザーではなく、50ユーザーで検証
2. **プロアクティブな対策**: ボトルネックが顕在化する前に対応
3. **継続的モニタリング**: 1時間ごとのメトリクス収集とアラート
4. **コスト意識**: 月間予算$1,500以内を維持

### 次のステップ

- [ ] Week 1-2: Cloud Functions maxInstances 調整
- [ ] Week 3-4: React Query + Firestoreキャッシュ導入
- [ ] Week 5-6: Claude APIキュー制御実装
- [ ] Week 7-8: Vector Search 最適化

---

**作成日**: 2025-01-20
**最終更新**: 2025-01-20
**バージョン**: 1.0.0
