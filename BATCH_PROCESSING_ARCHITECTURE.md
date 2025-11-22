# バッチ処理アーキテクチャ設計書

## 概要

週次パターン抽出とナレッジメンテナンスのバッチ処理システム。毎週日曜深夜2時に自動実行され、過去1週間の承認済みチャットを分析し、学習パターンの抽出、重複ナレッジの検出・マージ、未使用ナレッジのアーカイブを行います。

## システム要件

### 機能要件

1. **自動実行**: 毎週日曜深夜2時（JST）に自動実行
2. **チャット分析**: 過去1週間の承認済みチャットを分析
3. **パターン抽出**: 5種類の学習パターン抽出
   - vocabulary（語彙パターン）
   - structure（構造パターン）
   - emphasis（強調パターン）
   - tone（トーンパターン）
   - length（長さパターン）
4. **重複検出**: 既存ナレッジとの重複検出とマージ
5. **アーカイブ**: 90日間未使用のナレッジをアーカイブ
6. **進捗可視化**: 処理進捗のリアルタイム可視化
7. **エラー通知**: 管理者への自動通知

### 技術要件

- **トリガー**: Cloud Scheduler + Pub/Sub
- **トランザクション**: 長時間処理対応の適切なトランザクション制御
- **チャンク処理**: 大量データを分割して処理
- **進捗記録**: Firestoreに処理状況を記録
- **ロギング**: Cloud Loggingとの統合
- **エラーハンドリング**: リトライ戦略とフォールバック

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cloud Scheduler                             │
│                  (毎週日曜 2:00 AM JST)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Pub/Sub Topic                              │
│              (weekly-pattern-extraction)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            Cloud Function: weeklyPatternExtraction               │
│                    (最大タイムアウト: 540秒)                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. 処理ジョブ初期化                                      │   │
│  │    - ジョブID生成                                        │   │
│  │    - 進捗状況の初期化 (Firestore)                       │   │
│  │    - 対象期間の計算                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 2. 承認済みチャット取得 (チャンク処理)                 │   │
│  │    - 過去7日間のチャット                                │   │
│  │    - プロジェクトごとに処理                             │   │
│  │    - バッチサイズ: 50件                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 3. パターン抽出 (並列処理)                              │   │
│  │    ┌──────────────────────────────────────────┐        │   │
│  │    │ 3a. Vocabulary Pattern                    │        │   │
│  │    │  - 頻出用語の抽出                         │        │   │
│  │    │  - TF-IDF分析                             │        │   │
│  │    └──────────────────────────────────────────┘        │   │
│  │    ┌──────────────────────────────────────────┐        │   │
│  │    │ 3b. Structure Pattern                     │        │   │
│  │    │  - 文章構造の分析                         │        │   │
│  │    │  - 段落パターンの検出                     │        │   │
│  │    └──────────────────────────────────────────┘        │   │
│  │    ┌──────────────────────────────────────────┐        │   │
│  │    │ 3c. Emphasis Pattern                      │        │   │
│  │    │  - 強調表現の抽出                         │        │   │
│  │    │  - マークダウン記法の分析                 │        │   │
│  │    └──────────────────────────────────────────┘        │   │
│  │    ┌──────────────────────────────────────────┐        │   │
│  │    │ 3d. Tone Pattern                          │        │   │
│  │    │  - 文体・トーンの分析                     │        │   │
│  │    │  - 敬語パターンの検出                     │        │   │
│  │    └──────────────────────────────────────────┘        │   │
│  │    ┌──────────────────────────────────────────┐        │   │
│  │    │ 3e. Length Pattern                        │        │   │
│  │    │  - 回答長の統計分析                       │        │   │
│  │    │  - カテゴリー別の長さパターン             │        │   │
│  │    └──────────────────────────────────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 4. 重複ナレッジ検出とマージ                             │   │
│  │    - 完全一致の検出 (Exact Match)                       │   │
│  │    - 高類似度の検出 (Semantic > 95%)                    │   │
│  │    - グループ化とマージ                                 │   │
│  │    - 代表ナレッジの選定                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 5. 未使用ナレッジのアーカイブ                           │   │
│  │    - 90日間未使用のナレッジを検出                       │   │
│  │    - アーカイブフラグの設定                             │   │
│  │    - アーカイブログの記録                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 6. プロジェクト統計の更新                               │   │
│  │    - lastPatternAnalysisCount                           │   │
│  │    - lastPatternAnalysisAt                              │   │
│  │    - アーカイブ統計                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 7. 完了通知                                              │   │
│  │    - 処理結果のサマリー生成                             │   │
│  │    - 管理者への通知 (成功/エラー)                       │   │
│  │    - ジョブステータスの更新                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Firestore                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ batchJobs/{jobId}                                      │     │
│  │  - status: queued/processing/completed/failed          │     │
│  │  - progress: { current, total, percentage }            │     │
│  │  - startedAt, completedAt                              │     │
│  │  - result: { patterns, duplicates, archived }          │     │
│  │  - errors: []                                          │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ learningPatterns/{patternId}                           │     │
│  │  - patternType: vocabulary/structure/emphasis/tone/length │ │
│  │  - patternContent: string                              │     │
│  │  - examples: string[]                                  │     │
│  │  - reliability: 50-100                                 │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ knowledgeGroups/{groupId}                              │     │
│  │  - representativeKnowledgeId                           │     │
│  │  - duplicateKnowledgeIds: []                           │     │
│  │  - similarityScores: {}                                │     │
│  └───────────────────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ knowledge/{knowledgeId}                                │     │
│  │  - archived: boolean                                   │     │
│  │  - archivedAt: Timestamp                               │     │
│  │  - lastUsed: Timestamp                                 │     │
│  └───────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## データフロー

### 1. ジョブ初期化フロー

```
入力: Pub/Sub メッセージ
  │
  ├─► ジョブID生成 (UUID)
  │
  ├─► Firestoreに初期状態を記録
  │    └─► batchJobs/{jobId}
  │         ├─ status: 'processing'
  │         ├─ startedAt: Timestamp
  │         ├─ targetPeriod: { start, end }
  │         └─ progress: { current: 0, total: 0, percentage: 0 }
  │
  └─► 対象期間の計算
       └─► 7日前 00:00:00 ～ 現在
```

### 2. チャット取得フロー

```
対象期間
  │
  ├─► 全プロジェクトを取得
  │
  └─► プロジェクトごとにループ
       │
       ├─► chatsコレクションをクエリ
       │    ├─ where('approved', '==', true)
       │    ├─ where('approvedAt', '>=', startDate)
       │    ├─ where('approvedAt', '<=', endDate)
       │    ├─ where('projectId', '==', projectId)
       │    └─ orderBy('approvedAt', 'desc')
       │
       └─► チャンクごとに処理 (50件ずつ)
            └─► 進捗状況を更新
```

### 3. パターン抽出フロー

```
承認済みチャット配列
  │
  ├─► Vocabulary Pattern
  │    ├─ テキストトークナイズ
  │    ├─ 単語頻度カウント (TF)
  │    ├─ IDF計算
  │    ├─ TF-IDFスコア算出
  │    └─► 上位10個の重要語彙を抽出
  │
  ├─► Structure Pattern
  │    ├─ 段落数のカウント
  │    ├─ リスト形式の検出
  │    ├─ 見出しの抽出
  │    ├─ コードブロックの検出
  │    └─► 構造パターンを定義
  │
  ├─► Emphasis Pattern
  │    ├─ 太字の検出 (**text**)
  │    ├─ イタリックの検出 (*text*)
  │    ├─ 引用の検出 (> text)
  │    ├─ ハイライトの検出
  │    └─► 強調パターンを抽出
  │
  ├─► Tone Pattern
  │    ├─ 敬語パターンの検出
  │    ├─ 文末表現の分析
  │    ├─ フォーマル度の計算
  │    └─► トーンパターンを定義
  │
  └─► Length Pattern
       ├─ 文字数の統計分析
       ├─ カテゴリー別の平均長
       ├─ 標準偏差の計算
       └─► 長さパターンを抽出
```

### 4. 重複検出とマージフロー

```
既存ナレッジベース
  │
  ├─► Exact Match検出
  │    ├─ content完全一致のクエリ
  │    └─► グループ化
  │
  ├─► Semantic Match検出
  │    ├─ エンベディング生成
  │    ├─ コサイン類似度計算
  │    ├─ 類似度 >= 95%をフィルタ
  │    └─► グループ化
  │
  └─► マージ処理
       ├─ 代表ナレッジの選定
       │   ├─ 最高のreliabilityスコア
       │   ├─ 最多のusageCount
       │   └─ 最新のcreatedAt
       │
       ├─ KnowledgeGroup作成
       │   ├─ representativeKnowledgeId
       │   ├─ duplicateKnowledgeIds[]
       │   └─ similarityScores{}
       │
       └─► 重複ナレッジにフラグを設定
            ├─ duplicateGroupId: groupId
            └─ isRepresentative: false
```

### 5. アーカイブフロー

```
全ナレッジ
  │
  ├─► 90日間未使用を検出
  │    ├─ where('archived', '==', false)
  │    ├─ where('lastUsed', '<', 90DaysAgo)
  │    └─ または where('lastUsed', '==', null)
  │
  └─► アーカイブ処理
       ├─ archived: true
       ├─ archivedAt: Timestamp
       ├─ archivedReason: 'unused_90_days'
       │
       └─► アーカイブログ記録
            ├─ archiveLogs/{logId}
            └─ 統計情報の更新
```

## データモデル

### BatchJob

```typescript
interface BatchJob {
  id: string;                    // ジョブID
  type: 'weekly-pattern-extraction';
  status: 'queued' | 'processing' | 'completed' | 'failed';

  // 進捗情報
  progress: {
    current: number;             // 現在の処理数
    total: number;               // 総処理数
    percentage: number;          // 進捗率 (0-100)
    currentStep: string;         // 現在のステップ名
  };

  // 期間情報
  targetPeriod: {
    startDate: Timestamp;
    endDate: Timestamp;
  };

  // タイムスタンプ
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  // 結果
  result?: {
    projectsProcessed: number;
    chatsAnalyzed: number;
    patternsExtracted: {
      vocabulary: number;
      structure: number;
      emphasis: number;
      tone: number;
      length: number;
    };
    duplicatesFound: number;
    duplicatesMerged: number;
    knowledgeArchived: number;
  };

  // エラー情報
  errors?: Array<{
    step: string;
    error: string;
    timestamp: Timestamp;
  }>;
}
```

### LearningPattern (拡張)

```typescript
type PatternType = 'vocabulary' | 'structure' | 'emphasis' | 'tone' | 'length';

interface LearningPattern {
  id: string;
  projectId: string;
  patternType: PatternType;
  patternContent: string;       // パターンの内容

  // 詳細情報
  details?: {
    // Vocabulary
    tfIdfScores?: Record<string, number>;
    wordFrequencies?: Record<string, number>;

    // Structure
    paragraphCount?: number;
    hasLists?: boolean;
    hasCodeBlocks?: boolean;
    hasHeadings?: boolean;

    // Emphasis
    boldCount?: number;
    italicCount?: number;
    quoteCount?: number;

    // Tone
    formalityScore?: number;      // 0-100
    politenesPatterns?: string[];

    // Length
    averageLength?: number;
    stdDeviation?: number;
    categoryLengths?: Record<string, number>;
  };

  // ソース情報
  examples: string[];            // 例文
  extractedFrom: string[];       // チャットID配列

  // 信頼性メトリクス
  reliability: number;           // 50-100
  occurrenceCount: number;       // 出現回数
  confidence: number;            // 信頼度スコア

  // バリデーション
  validatedBy: string;           // システムまたはユーザーID
  validatedAt: Timestamp;
  autoExtracted: boolean;        // 自動抽出フラグ

  // タイムスタンプ
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // バッチジョブ参照
  extractedByJobId?: string;
}
```

### KnowledgeGroup

```typescript
interface KnowledgeGroup {
  id: string;
  projectId: string;

  // グループ情報
  representativeKnowledgeId: string;     // 代表ナレッジ
  duplicateKnowledgeIds: string[];       // 重複ナレッジ配列

  // 類似度情報
  similarityScores: Record<string, number>;  // knowledgeId -> similarity
  averageSimilarity: number;

  // 検出方法
  detectionMethod: 'exact' | 'semantic' | 'fuzzy';

  // メタデータ
  mergedCount: number;
  totalUsageCount: number;

  // タイムスタンプ
  createdAt: Timestamp;
  updatedAt?: Timestamp;

  // バッチジョブ参照
  detectedByJobId?: string;
}
```

### Knowledge (アーカイブ拡張)

```typescript
interface Knowledge {
  // ... 既存のフィールド ...

  // アーカイブ情報
  archived: boolean;
  archivedAt?: Timestamp;
  archivedReason?: 'unused_90_days' | 'manual' | 'duplicate' | 'low_quality';
  archivedByJobId?: string;

  // 使用統計
  lastUsed?: Timestamp;
  usageCount: number;
  usageHistory?: Array<{
    usedAt: Timestamp;
    usedInChatId: string;
  }>;
}
```

## エラーハンドリング

### リトライ戦略

```typescript
interface RetryConfig {
  maxRetries: 3;
  initialDelay: 1000;        // 1秒
  maxDelay: 10000;           // 10秒
  backoffMultiplier: 2;
  retryableErrors: [
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'RESOURCE_EXHAUSTED'
  ];
}
```

### エラー分類

1. **リトライ可能エラー**
   - ネットワークエラー
   - タイムアウト
   - レート制限

2. **リトライ不可エラー**
   - データ検証エラー
   - 権限エラー
   - 設定エラー

3. **部分的失敗**
   - 一部プロジェクトの処理失敗
   - 一部パターンの抽出失敗
   - エラーログに記録して継続

### 通知戦略

```typescript
interface NotificationConfig {
  // 成功通知
  onSuccess: {
    enabled: true;
    recipients: ['admin@company.com'];
    includeStatistics: true;
  };

  // エラー通知
  onError: {
    enabled: true;
    recipients: ['admin@company.com', 'tech-team@company.com'];
    severity: 'critical';
    includeStackTrace: true;
  };

  // 警告通知
  onWarning: {
    enabled: true;
    recipients: ['admin@company.com'];
    conditions: [
      'duplicateRateHigh',  // 重複率 > 30%
      'lowApprovalRate',    // 承認率 < 10%
      'processingTimeLong'  // 処理時間 > 300秒
    ];
  };
}
```

## パフォーマンス最適化

### チャンク処理

- **バッチサイズ**: 50件/チャンク
- **並列度**: プロジェクトごとに独立処理
- **メモリ管理**: チャンクごとにクリーンアップ

### インデックス最適化

```typescript
// 必要なFirestoreインデックス
const requiredIndexes = [
  {
    collection: 'chats',
    fields: [
      { field: 'projectId', order: 'ASCENDING' },
      { field: 'approved', order: 'ASCENDING' },
      { field: 'approvedAt', order: 'DESCENDING' }
    ]
  },
  {
    collection: 'knowledge',
    fields: [
      { field: 'projectId', order: 'ASCENDING' },
      { field: 'archived', order: 'ASCENDING' },
      { field: 'lastUsed', order: 'ASCENDING' }
    ]
  },
  {
    collection: 'knowledge',
    fields: [
      { field: 'projectId', order: 'ASCENDING' },
      { field: 'content', order: 'ASCENDING' }
    ]
  }
];
```

### タイムアウト設定

```typescript
const timeoutConfig = {
  functionTimeout: 540,        // 9分（最大）
  chunkTimeout: 30,            // 30秒/チャンク
  patternExtractionTimeout: 60,// 60秒/パターン種類
  deduplicationTimeout: 120,   // 2分
  archiveTimeout: 60           // 60秒
};
```

## モニタリング

### メトリクス

1. **処理時間メトリクス**
   - 総処理時間
   - チャンクあたりの処理時間
   - パターン抽出時間
   - 重複検出時間

2. **データメトリクス**
   - 処理チャット数
   - 抽出パターン数
   - 検出重複数
   - アーカイブ数

3. **エラーメトリクス**
   - エラー発生率
   - リトライ回数
   - 部分的失敗数

### ログ戦略

```typescript
// 構造化ログ
interface StructuredLog {
  severity: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: string;
  jobId: string;
  step: string;
  message: string;
  metadata?: Record<string, any>;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}
```

## セキュリティ

### アクセス制御

- **Cloud Function**: 認証不要（Pub/Subトリガー）
- **Firestore Rules**: 管理者のみ batchJobs にアクセス可能
- **Cloud Scheduler**: プロジェクトのサービスアカウントのみ

### データ保護

- 機密情報のログ出力禁止
- エラーメッセージにユーザーデータを含めない
- アーカイブデータの暗号化

## 運用ガイド

### デプロイ手順

1. Cloud Scheduler設定
2. Pub/Subトピック作成
3. Cloud Function デプロイ
4. Firestoreインデックス作成
5. テスト実行

### トラブルシューティング

#### ジョブが開始されない
- Cloud Schedulerのステータス確認
- Pub/Subトピックの存在確認
- Cloud Functionのデプロイ状況確認

#### タイムアウトエラー
- バッチサイズを調整
- 対象期間を短縮
- Cloud Functionのメモリを増加

#### 重複検出が多すぎる
- 類似度閾値を調整（95% → 98%）
- Exact Matchのみに制限
- ナレッジの品質を確認

### 手動実行

```bash
# Pub/Subメッセージを手動で発行
gcloud pubsub topics publish weekly-pattern-extraction \
  --message='{"trigger":"manual","dryRun":false}'
```

## 今後の拡張

1. **AI/ML統合**
   - Claude APIを使った高度なパターン分析
   - 自然言語処理の強化

2. **リアルタイム処理**
   - ストリーミングパターン抽出
   - 増分更新

3. **カスタマイズ**
   - プロジェクトごとのパターン設定
   - カスタムパターンタイプ

4. **分散処理**
   - Cloud Tasksとの統合
   - 並列度の向上

## 参考資料

- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Firestore Best Practices](https://cloud.google.com/firestore/docs/best-practices)
