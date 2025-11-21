# Fault Tolerance Design - ET-AI System

## Overview

This document defines the fault tolerance and error handling strategy for the ET-AI system to ensure high availability and graceful degradation under failure scenarios.

**Target Availability**: 99.9% (8.76 hours downtime per year)
**Recovery Time Objective (RTO)**: < 5 minutes
**Recovery Point Objective (RPO)**: < 1 minute

## Failure Scenarios

### 1. Claude API Failures

#### 1.1 Failure Types

**a) Timeout Errors**
- **Detection**: Request exceeds 60s timeout
- **Frequency**: Rare (< 0.1%)
- **Impact**: Single request failure

**b) Rate Limit Errors (429)**
- **Detection**: HTTP 429 status code
- **Frequency**: Moderate (5-10% during peak)
- **Impact**: Temporary unavailability

**c) Complete Service Outage (5xx)**
- **Detection**: HTTP 500-599 status codes
- **Frequency**: Very rare (< 0.01%)
- **Impact**: Complete feature unavailability

**d) API Key Invalid (401)**
- **Detection**: HTTP 401 status code
- **Frequency**: Configuration error
- **Impact**: Complete feature unavailability

#### 1.2 Detection Strategy

```typescript
interface ClaudeAPIError {
  type: 'timeout' | 'rate_limit' | 'server_error' | 'auth_error' | 'network_error';
  statusCode?: number;
  retryAfter?: number;
  message: string;
  timestamp: Date;
}

function detectClaudeError(error: any): ClaudeAPIError {
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return { type: 'timeout', message: error.message, timestamp: new Date() };
  }

  if (error.status === 429) {
    const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
    return {
      type: 'rate_limit',
      statusCode: 429,
      retryAfter,
      message: 'Rate limit exceeded',
      timestamp: new Date()
    };
  }

  if (error.status >= 500) {
    return {
      type: 'server_error',
      statusCode: error.status,
      message: 'Claude API server error',
      timestamp: new Date()
    };
  }

  if (error.status === 401) {
    return {
      type: 'auth_error',
      statusCode: 401,
      message: 'Invalid API key',
      timestamp: new Date()
    };
  }

  return {
    type: 'network_error',
    message: error.message || 'Unknown error',
    timestamp: new Date()
  };
}
```

#### 1.3 Retry Strategy

**Exponential Backoff with Jitter:**

```
Attempt 1: Wait 2s + random(0-1s)
Attempt 2: Wait 4s + random(0-2s)
Attempt 3: Wait 8s + random(0-4s)
Attempt 4: Wait 16s + random(0-8s)
Attempt 5: Wait 32s + random(0-16s)
Max Attempts: 5
```

**Rate Limit Specific:**
- Wait for `retry-after` header value
- If not provided, wait 60s
- Do not retry more than 3 times

**Server Error Specific:**
- Exponential backoff: 2s, 4s, 8s
- Max 3 retries
- After 3 failures, switch to fallback

#### 1.4 Fallback Strategies

**Level 1: Queue System (Already Implemented)**
- Queue requests when rate limit approached
- Process when capacity available
- User sees "Processing..." status

**Level 2: Cached Responses**
- Check if similar query exists in last 24 hours
- Return cached response with disclaimer
- Cache hit rate: ~30%

**Level 3: Simplified Mode**
- Use simpler prompts (fewer tokens)
- Disable RAG temporarily
- Response quality: 70% of normal

**Level 4: Graceful Degradation**
- Show error message with retry option
- Save user input for later processing
- Send notification when service restored

#### 1.5 User Feedback

**Timeout:**
```
⏱️ リクエストがタイムアウトしました。
もう一度お試しいただくか、質問を短くしてみてください。
[再試行] [質問を編集]
```

**Rate Limit:**
```
⚠️ 現在、多くのリクエストを処理しています。
キューに追加しました。推定待ち時間: 2分

現在の状況:
- キュー内の位置: 5番目
- 処理中のリクエスト: 10件
[キャンセル] [状態確認]
```

**Server Error:**
```
❌ AIサービスが一時的に利用できません。
自動的に再試行しています... (3/5)

代替オプション:
- キャッシュから類似の回答を表示
- 簡易モードで回答を生成
[代替案を見る] [後で再試行]
```

**Complete Outage:**
```
🔧 AIサービスがメンテナンス中です。
ご不便をおかけして申し訳ございません。

代替手段:
- 過去の会話履歴を参照
- ドキュメントから検索
- 問い合わせを保存（復旧後に自動処理）
[履歴を見る] [ドキュメント検索] [保存]
```

### 2. Firestore Vector Search Failures

#### 2.1 Failure Types

**a) Index Not Ready**
- **Detection**: Error message contains "index"
- **Frequency**: After deployment
- **Impact**: Search unavailable

**b) Query Timeout**
- **Detection**: Request exceeds 30s
- **Frequency**: Rare with large datasets
- **Impact**: Single search failure

**c) Quota Exceeded**
- **Detection**: Error code "RESOURCE_EXHAUSTED"
- **Frequency**: During high traffic
- **Impact**: Temporary search unavailability

#### 2.2 Detection Strategy

```typescript
interface VectorSearchError {
  type: 'index_not_ready' | 'timeout' | 'quota_exceeded' | 'invalid_vector';
  message: string;
  collection: string;
  timestamp: Date;
}

function detectVectorSearchError(error: any, collection: string): VectorSearchError {
  if (error.message?.includes('index') || error.code === 'FAILED_PRECONDITION') {
    return {
      type: 'index_not_ready',
      message: 'Vector index not ready',
      collection,
      timestamp: new Date()
    };
  }

  if (error.code === 'DEADLINE_EXCEEDED') {
    return {
      type: 'timeout',
      message: 'Vector search timeout',
      collection,
      timestamp: new Date()
    };
  }

  if (error.code === 'RESOURCE_EXHAUSTED') {
    return {
      type: 'quota_exceeded',
      message: 'Vector search quota exceeded',
      collection,
      timestamp: new Date()
    };
  }

  return {
    type: 'invalid_vector',
    message: error.message,
    collection,
    timestamp: new Date()
  };
}
```

#### 2.3 Retry Strategy

**Index Not Ready:**
- Wait 10s, 30s, 60s
- Max 3 retries
- After failure, fallback to keyword search

**Timeout:**
- Reduce result limit (100 → 50 → 20)
- Retry with smaller batch
- Max 2 retries

**Quota Exceeded:**
- Wait 60s
- Retry once
- Switch to fallback immediately

#### 2.4 Fallback Strategies

**Level 1: Keyword Search**
- Use Firestore's basic text search
- Filter by category, date range
- Accuracy: ~60% of vector search

**Level 2: Cached Results**
- Return previous search results
- Show staleness indicator
- Cache TTL: 30 minutes

**Level 3: Manual Filter**
- Show all documents
- Let user filter manually
- Provide category/date filters

#### 2.5 User Feedback

```
🔍 ベクトル検索が一時的に利用できません。
代わりにキーワード検索を使用しています。

結果の精度: ⭐⭐⭐☆☆ (通常より低い可能性があります)
[通常検索で再試行] [フィルター設定]
```

### 3. Voyage AI Embedding API Failures

#### 3.1 Failure Types

**a) API Timeout**
- **Detection**: Request exceeds 30s
- **Frequency**: Rare
- **Impact**: Single embedding failure

**b) Rate Limit**
- **Detection**: HTTP 429
- **Frequency**: Moderate during bulk processing
- **Impact**: Batch processing delay

**c) Invalid Input**
- **Detection**: HTTP 400
- **Frequency**: Rare (input validation issue)
- **Impact**: Single document failure

#### 3.2 Detection Strategy

```typescript
interface EmbeddingError {
  type: 'timeout' | 'rate_limit' | 'invalid_input' | 'server_error';
  statusCode?: number;
  documentId?: string;
  message: string;
  timestamp: Date;
}

function detectEmbeddingError(error: any, documentId?: string): EmbeddingError {
  if (error.code === 'ETIMEDOUT') {
    return {
      type: 'timeout',
      documentId,
      message: 'Embedding generation timeout',
      timestamp: new Date()
    };
  }

  if (error.status === 429) {
    return {
      type: 'rate_limit',
      statusCode: 429,
      documentId,
      message: 'Embedding API rate limit',
      timestamp: new Date()
    };
  }

  if (error.status === 400) {
    return {
      type: 'invalid_input',
      statusCode: 400,
      documentId,
      message: 'Invalid input for embedding',
      timestamp: new Date()
    };
  }

  return {
    type: 'server_error',
    statusCode: error.status,
    documentId,
    message: error.message,
    timestamp: new Date()
  };
}
```

#### 3.3 Retry Strategy

**Timeout:**
- Split large documents into smaller chunks
- Retry with reduced batch size
- Max 3 retries

**Rate Limit:**
- Exponential backoff: 5s, 10s, 20s
- Process in smaller batches (10 → 5 → 1)
- Max 5 retries

**Invalid Input:**
- Clean input (remove special characters)
- Truncate to max length
- Retry once

#### 3.4 Fallback Strategies

**Level 1: Batch Retry**
- Queue failed documents
- Retry during off-peak hours
- User notified when complete

**Level 2: Skip Non-Critical**
- Mark document as "pending embedding"
- Allow upload without embedding
- Process in background

**Level 3: Degraded Mode**
- Store document without vector search
- Enable keyword search only
- Show warning to user

#### 3.5 User Feedback

```
📄 ドキュメント処理中にエラーが発生しました。

状態:
- アップロード: ✅ 完了
- テキスト抽出: ✅ 完了
- ベクトル化: ⏳ 処理待ち

このドキュメントは一時的にキーワード検索のみ利用可能です。
ベクトル検索は後ほど有効になります。

[処理を再試行] [このまま保存]
```

### 4. Firebase Storage Failures

#### 4.1 Failure Types

**a) Upload Timeout**
- **Detection**: Upload exceeds 5 minutes
- **Frequency**: Large files (>100MB)
- **Impact**: Upload failure

**b) Quota Exceeded**
- **Detection**: Error code "storage/quota-exceeded"
- **Frequency**: Monthly quota limit
- **Impact**: All uploads fail

**c) Permission Denied**
- **Detection**: Error code "storage/unauthorized"
- **Frequency**: Configuration error
- **Impact**: User-specific failure

**d) Network Error**
- **Detection**: Connection errors
- **Frequency**: Client network issues
- **Impact**: Upload interruption

#### 4.2 Detection Strategy

```typescript
interface StorageError {
  type: 'timeout' | 'quota_exceeded' | 'permission_denied' | 'network_error' | 'invalid_file';
  code: string;
  fileName: string;
  fileSize: number;
  message: string;
  timestamp: Date;
}

function detectStorageError(error: any, fileName: string, fileSize: number): StorageError {
  if (error.code === 'storage/canceled' || error.code === 'ETIMEDOUT') {
    return {
      type: 'timeout',
      code: error.code,
      fileName,
      fileSize,
      message: 'Upload timeout',
      timestamp: new Date()
    };
  }

  if (error.code === 'storage/quota-exceeded') {
    return {
      type: 'quota_exceeded',
      code: error.code,
      fileName,
      fileSize,
      message: 'Storage quota exceeded',
      timestamp: new Date()
    };
  }

  if (error.code === 'storage/unauthorized') {
    return {
      type: 'permission_denied',
      code: error.code,
      fileName,
      fileSize,
      message: 'Permission denied',
      timestamp: new Date()
    };
  }

  if (error.message?.includes('network') || error.code === 'ECONNRESET') {
    return {
      type: 'network_error',
      code: error.code,
      fileName,
      fileSize,
      message: 'Network error during upload',
      timestamp: new Date()
    };
  }

  return {
    type: 'invalid_file',
    code: error.code,
    fileName,
    fileSize,
    message: error.message,
    timestamp: new Date()
  };
}
```

#### 4.3 Retry Strategy

**Timeout:**
- Resume upload from last checkpoint
- Use resumable uploads
- Max 3 retries

**Network Error:**
- Exponential backoff: 1s, 2s, 4s
- Resume from last chunk
- Max 5 retries

**Quota Exceeded:**
- No retry
- Notify admin immediately
- Show upgrade prompt

#### 4.4 Fallback Strategies

**Level 1: Resumable Upload**
- Store upload state locally
- Resume on reconnection
- Show progress bar

**Level 2: Chunked Upload**
- Split large files into chunks
- Upload chunks separately
- Assemble on server

**Level 3: Alternative Storage**
- Use Firestore for small files (<1MB)
- Base64 encode and store
- Show size warning

#### 4.5 User Feedback

```
📤 ファイルアップロード中...

進行状況: 45% (45MB / 100MB)
推定残り時間: 2分

[一時停止] [キャンセル]
```

**On Error:**
```
❌ アップロードが中断されました。

原因: ネットワーク接続エラー
処理済み: 45MB / 100MB

オプション:
- 自動的に再開します (3秒後)
- 手動で再試行
- 小さいファイルに分割してアップロード

[今すぐ再試行] [分割アップロード] [キャンセル]
```

## Error Handling Flow

### Overall Error Handling Architecture

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Error Detection │ ◄── Monitoring & Logging
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Error Analysis  │ ──► Classify error type
└────────┬────────┘       Determine severity
         │                Calculate retry strategy
         ▼
┌─────────────────┐
│ Retry Logic     │ ──► Exponential backoff
└────────┬────────┘       Rate limit handling
         │                Max attempts check
         ▼
    ┌────┴────┐
    │ Success?│
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Fallback Logic  │ ──► Level 1: Queue
└────────┬────────┘       Level 2: Cache
         │                Level 3: Degraded
         ▼                Level 4: Error UI
┌─────────────────┐
│ User Feedback   │ ──► Clear error message
└────────┬────────┘       Action options
         │                Status updates
         ▼
┌─────────────────┐
│ Error Logging   │ ──► Firestore error_logs
└────────┬────────┘       Admin notification
         │                Metrics tracking
         ▼
┌─────────────────┐
│   Response      │
└─────────────────┘
```

### Claude API Error Flow

```
User Message
     │
     ▼
┌──────────────────┐
│ Send to Claude   │
└────────┬─────────┘
         │
         ▼
    ┌────────┐
    │Success?│
    └───┬────┘
        │
   ┌────┴────┐
   │   No    │
   └────┬────┘
        │
        ▼
┌───────────────┐
│ Error Type?   │
└───┬───┬───┬───┘
    │   │   │
    │   │   └─────────────┐
    │   │                 │
    │   └──────┐          │
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌─────────┐
│Timeout │ │Rate    │ │Server   │
│        │ │Limit   │ │Error    │
└───┬────┘ └───┬────┘ └────┬────┘
    │          │           │
    │          │           │
    ▼          ▼           ▼
┌────────┐ ┌────────┐ ┌─────────┐
│Retry   │ │Queue   │ │Retry 3x │
│3x      │ │Request │ │         │
└───┬────┘ └───┬────┘ └────┬────┘
    │          │           │
    └──────┬───┴───────────┘
           │
           ▼
      ┌────────┐
      │Failed? │
      └───┬────┘
          │
     ┌────┴────┐
     │   Yes   │
     └────┬────┘
          │
          ▼
┌──────────────────┐
│ Fallback Logic   │
└────────┬─────────┘
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
┌─────────┐     ┌──────────┐
│Check    │     │Simplified│
│Cache    │     │Mode      │
└────┬────┘     └─────┬────┘
     │                │
     └────────┬───────┘
              │
              ▼
      ┌──────────────┐
      │Show Error UI │
      └──────────────┘
```

## Monitoring & Alerting

### Health Check System

**Endpoints to Monitor:**
1. Claude API: Every 5 minutes
2. Firestore: Every 1 minute
3. Voyage AI: Every 10 minutes
4. Firebase Storage: Every 5 minutes

**Health Check Implementation:**

```typescript
interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  details?: string;
}

async function checkServiceHealth(service: string): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    switch (service) {
      case 'claude':
        await testClaudeAPI();
        break;
      case 'firestore':
        await testFirestore();
        break;
      case 'voyage':
        await testVoyageAI();
        break;
      case 'storage':
        await testFirebaseStorage();
        break;
    }

    const responseTime = Date.now() - startTime;
    const errorRate = await getErrorRate(service, 5); // Last 5 minutes

    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (errorRate > 0.1) status = 'degraded';  // >10% error rate
    if (errorRate > 0.5) status = 'down';      // >50% error rate

    return {
      service,
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate
    };
  } catch (error) {
    return {
      service,
      status: 'down',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 1.0,
      details: error.message
    };
  }
}
```

### Alert Levels

**Level 1: Info** (No action required)
- Error rate: 1-5%
- Response time: 2-5s
- Action: Log only

**Level 2: Warning** (Monitor closely)
- Error rate: 5-10%
- Response time: 5-10s
- Action: Log + Email notification

**Level 3: Critical** (Immediate action)
- Error rate: 10-50%
- Response time: >10s
- Action: Log + Email + Slack notification

**Level 4: Emergency** (Service down)
- Error rate: >50%
- Service completely unavailable
- Action: All notifications + Page on-call engineer

### Error Logging

**Log Structure:**

```typescript
interface ErrorLog {
  id: string;
  timestamp: Date;
  service: 'claude' | 'firestore' | 'voyage' | 'storage';
  errorType: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  message: string;
  stackTrace?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  retryCount: number;
  recovered: boolean;
  recoveryMethod?: string;
}
```

**Logging to Firestore:**

```typescript
await db.collection('error_logs').add({
  timestamp: Timestamp.now(),
  service: 'claude',
  errorType: 'rate_limit',
  severity: 'warning',
  message: 'Claude API rate limit exceeded',
  userId: context.auth?.uid,
  requestId: uuidv4(),
  metadata: {
    queuePosition: 5,
    estimatedWait: 120
  },
  retryCount: 2,
  recovered: false
});
```

## Implementation Priority

### Phase 1: Critical (Week 1-2)
1. ✅ Claude API retry logic with exponential backoff
2. ✅ Queue system for rate limits
3. 🔲 Error logging to Firestore
4. 🔲 Health check system

### Phase 2: Important (Week 3-4)
1. 🔲 Firestore Vector Search fallback
2. 🔲 Voyage AI retry and batching
3. 🔲 Firebase Storage resumable uploads
4. 🔲 User-facing error messages

### Phase 3: Nice to Have (Week 5-6)
1. 🔲 Cache-based fallbacks
2. 🔲 Simplified mode
3. 🔲 Admin dashboard for errors
4. 🔲 Automated recovery

## Metrics & KPIs

### Target Metrics

| Metric | Target | Current | Goal |
|--------|--------|---------|------|
| Overall Availability | 99.9% | - | Track |
| Claude API Success Rate | >95% | - | Monitor |
| Vector Search Success Rate | >99% | - | Monitor |
| Average Error Recovery Time | <30s | - | Optimize |
| User-Facing Errors | <1% | - | Minimize |
| Automatic Recovery Rate | >80% | - | Maximize |

### Monitoring Dashboard

Track in real-time:
1. Error rate by service (last 5m, 1h, 24h)
2. Success/failure ratio
3. Average response time
4. Retry success rate
5. Fallback activation frequency
6. Cache hit rate during errors

## Testing Strategy

### Fault Injection Testing

```typescript
// Test Claude API timeout
async function testClaudeTimeout() {
  const mockError = new Error('ETIMEDOUT');
  mockError.code = 'ETIMEDOUT';

  const result = await handleClaudeRequest(mockError);

  expect(result.retried).toBe(true);
  expect(result.retryCount).toBeLessThanOrEqual(5);
  expect(result.fallbackUsed).toBe(true);
}

// Test rate limit handling
async function testRateLimit() {
  const mockError = { status: 429, headers: { 'retry-after': '60' } };

  const result = await handleClaudeRequest(mockError);

  expect(result.queued).toBe(true);
  expect(result.estimatedWait).toBe(60);
}
```

### Load Testing

Simulate failure scenarios:
1. 100 concurrent requests → Claude rate limit
2. Large file upload → Storage timeout
3. Bulk embedding → Voyage rate limit
4. Complex vector search → Firestore timeout

## Incident Response

### Runbook

**Claude API Down:**
1. Check status page: https://status.anthropic.com
2. Enable cache-based fallback
3. Notify users of degraded service
4. Queue requests for later processing
5. Monitor recovery

**Firestore Issues:**
1. Check Firebase Console
2. Switch to keyword search
3. Check index status
4. Review query complexity
5. Scale up if quota issue

**Voyage AI Issues:**
1. Check API status
2. Queue embedding jobs
3. Process in smaller batches
4. Allow uploads without embeddings
5. Retry during off-peak

**Storage Issues:**
1. Check quota usage
2. Enable resumable uploads
3. Implement chunked upload
4. Clear temporary files
5. Consider upgrade

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Owner**: Engineering Team
**Review Cycle**: Monthly
