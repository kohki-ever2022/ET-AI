# Phase 4: 障害対応システム - デプロイ & テスト手順書

## 概要

このドキュメントでは、Phase 4で実装した障害対応（Fault Tolerance）システムのデプロイ手順、テスト方法、および動作確認方法を説明します。

---

## 目次

1. [事前準備](#事前準備)
2. [デプロイ手順](#デプロイ手順)
3. [動作確認](#動作確認)
4. [ユニットテスト](#ユニットテスト)
5. [統合テスト](#統合テスト)
6. [モニタリング](#モニタリング)
7. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### 1. 環境変数の設定

Firebase Functionsの環境変数を設定します：

```bash
# Claude API Key
firebase functions:config:set claude.api_key="YOUR_CLAUDE_API_KEY"

# Voyage AI API Key
firebase functions:config:set voyage.api_key="YOUR_VOYAGE_API_KEY"

# 設定を確認
firebase functions:config:get
```

### 2. Firestore インデックスの確認

`firestore.indexes.json` に必要なインデックスが定義されているか確認：

```json
{
  "indexes": [
    {
      "collectionGroup": "error_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "service", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "healthChecks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "alerts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 3. 依存関係のインストール

```bash
cd functions
npm install
npm run build
```

---

## デプロイ手順

### ステップ1: Firestoreインデックスのデプロイ

```bash
firebase deploy --only firestore:indexes
```

**完了確認：**
- Firebase Console > Firestore > インデックス
- 「構築中」→「有効」になるまで待機（数分かかる場合があります）

### ステップ2: Cloud Functionsのビルド

```bash
cd functions
npm run build
```

**エラーがないことを確認：**
```bash
# 特定のファイルのみ型チェック（Phase 4ファイル）
npx tsc --noEmit src/services/errorHandler.ts src/utils/retryStrategy.ts src/services/healthCheckService.ts
```

### ステップ3: Cloud Functionsのデプロイ

```bash
# すべてのFunctionsをデプロイ
firebase deploy --only functions

# または、Phase 4の新しいFunctionsのみデプロイ
firebase deploy --only functions:scheduledHealthCheck,functions:getHealthStatus,functions:getHealthDashboardData
```

**デプロイ確認：**
```bash
# デプロイされたFunctionsのリスト
firebase functions:list

# ログを確認
firebase functions:log
```

### ステップ4: Scheduled Functionの確認

```bash
# Cloud Schedulerのジョブを確認
gcloud scheduler jobs list

# 期待される結果：
# NAME                              SCHEDULE            TIME_ZONE
# firebase-schedule-scheduledHealthCheck-*  every 5 minutes     UTC
```

---

## 動作確認

### 1. ヘルスチェックの手動実行

Firebase Console または CLI からヘルスチェックを手動実行：

```bash
# CLIから直接呼び出し（開発環境）
firebase functions:shell

# shellで実行
> getHealthStatus()
```

または、Node.jsスクリプトから：

```javascript
// test-health-check.js
const admin = require('firebase-admin');
const functions = require('firebase-functions-test')();

admin.initializeApp();

const { getHealthStatus } = require('./functions/lib/index');

(async () => {
  try {
    const result = await getHealthStatus.run();
    console.log('Health Check Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Health check failed:', error);
  } finally {
    functions.cleanup();
  }
})();
```

実行：
```bash
cd functions
node test-health-check.js
```

### 2. ヘルスチェック結果の確認

Firestore Consoleで確認：

1. **healthChecks コレクション**
   - 最新のヘルスチェック結果が5分ごとに記録されているか
   - `overallStatus`、`services` フィールドの値を確認

```javascript
// Firebaseコンソールのクエリ
db.collection('healthChecks')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()
```

期待される結果：
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "overallStatus": "healthy",
  "services": [
    {
      "service": "claude",
      "status": "healthy",
      "responseTime": 1234,
      "errorRate": 0.01
    },
    {
      "service": "firestore",
      "status": "healthy",
      "responseTime": 123,
      "errorRate": 0
    },
    // ... 他のサービス
  ]
}
```

### 3. エラーログの確認

エラーが発生した場合、`error_logs` コレクションに記録されます：

```javascript
// 最近のエラーログを取得
db.collection('error_logs')
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get()
```

期待されるフィールド：
```json
{
  "timestamp": "2024-01-15T10:35:00Z",
  "service": "claude",
  "errorType": "timeout",
  "severity": "warning",
  "message": "Request timeout after 30s",
  "userId": "user123",
  "requestId": "req-abc-123",
  "retryCount": 3,
  "recovered": true,
  "recoveryMethod": "retry",
  "userFacingMessage": "リクエストがタイムアウトしました。自動的に再試行し、成功しました。"
}
```

### 4. アラートの確認

サービスが劣化またはダウンした場合、`alerts` コレクションにアラートが記録されます：

```javascript
db.collection('alerts')
  .where('acknowledged', '==', false)
  .orderBy('timestamp', 'desc')
  .get()
```

---

## ユニットテスト

### エラーハンドラーのテスト

```typescript
// functions/src/__tests__/errorHandler.test.ts
import { detectClaudeError, getUserFacingMessage } from '../services/errorHandler';

describe('Error Handler', () => {
  describe('detectClaudeError', () => {
    it('should detect timeout errors', () => {
      const error = { code: 'ETIMEDOUT', message: 'Timeout' };
      const result = detectClaudeError(error);

      expect(result.service).toBe('claude');
      expect(result.type).toBe('timeout');
      expect(result.severity).toBe('warning');
    });

    it('should detect rate limit errors', () => {
      const error = { status: 429, headers: { 'retry-after': '60' } };
      const result = detectClaudeError(error);

      expect(result.type).toBe('rate_limit');
      expect(result.retryAfter).toBe(60);
    });

    it('should detect server errors', () => {
      const error = { status: 503, message: 'Service unavailable' };
      const result = detectClaudeError(error);

      expect(result.type).toBe('server_error');
      expect(result.severity).toBe('critical');
    });
  });

  describe('getUserFacingMessage', () => {
    it('should return Japanese message for timeout', () => {
      const error = {
        service: 'claude' as const,
        type: 'timeout',
        message: 'Timeout',
        timestamp: new Date(),
        severity: 'warning' as const,
      };

      const message = getUserFacingMessage(error);
      expect(message).toContain('タイムアウト');
    });
  });
});
```

### リトライ戦略のテスト

```typescript
// functions/src/__tests__/retryStrategy.test.ts
import { calculateDelay, retryWithBackoff, CircuitBreaker } from '../utils/retryStrategy';
import { detectClaudeError } from '../services/errorHandler';

describe('Retry Strategy', () => {
  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const config = { baseDelayMs: 1000, maxDelayMs: 30000, exponentialBase: 2, jitterFactor: 0.1 };

      const delay1 = calculateDelay(1, config);
      const delay2 = calculateDelay(2, config);
      const delay3 = calculateDelay(3, config);

      // Verify exponential growth (with jitter tolerance)
      expect(delay1).toBeGreaterThanOrEqual(900);
      expect(delay1).toBeLessThanOrEqual(1100);
      expect(delay2).toBeGreaterThanOrEqual(1800);
      expect(delay2).toBeLessThanOrEqual(2200);
      expect(delay3).toBeGreaterThanOrEqual(3600);
      expect(delay3).toBeLessThanOrEqual(4400);
    });

    it('should cap at maxDelay', () => {
      const config = { baseDelayMs: 1000, maxDelayMs: 5000, exponentialBase: 2, jitterFactor: 0.1 };

      const delay = calculateDelay(10, config); // Would be 512000 without cap
      expect(delay).toBeLessThanOrEqual(5500); // Max + 10% jitter
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(
        mockFn,
        detectClaudeError,
        { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, exponentialBase: 2, jitterFactor: 0.1 }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
        .mockResolvedValue('success');

      const result = await retryWithBackoff(
        mockFn,
        detectClaudeError,
        { maxAttempts: 5, baseDelayMs: 10, maxDelayMs: 100, exponentialBase: 2, jitterFactor: 0.1 }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const mockFn = jest.fn().mockRejectedValue({ code: 'ETIMEDOUT' });

      const result = await retryWithBackoff(
        mockFn,
        detectClaudeError,
        { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, exponentialBase: 2, jitterFactor: 0.1 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('CircuitBreaker', () => {
    it('should open circuit after failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
      const mockFn = jest.fn().mockRejectedValue(new Error('Service down'));

      // First 3 failures
      for (let i = 0; i < 3; i++) {
        await breaker.execute(mockFn).catch(() => {});
      }

      // Circuit should be open now
      expect(breaker.getState()).toBe('open');

      // Next call should fail fast
      await expect(breaker.execute(mockFn)).rejects.toThrow('Circuit breaker is open');
      expect(mockFn).toHaveBeenCalledTimes(3); // Not called again
    });
  });
});
```

### テストの実行

```bash
cd functions
npm test
```

---

## 統合テスト

### シナリオ1: Claude APIタイムアウト

```bash
# 1. タイムアウトをシミュレート（手動でClaude APIへの接続を遅延）
# 2. error_logsコレクションを監視
firebase firestore:watch error_logs --where service==claude --where errorType==timeout

# 3. ヘルスチェックを確認
# healthChecksコレクションでclaudeのstatusが "degraded" または "down" になるか確認
```

### シナリオ2: レート制限

```bash
# 1. 大量のリクエストを送信してレート制限をトリガー
# 2. エラーログで retryAfter フィールドを確認
# 3. リトライが適切な遅延で実行されているか確認
```

### シナリオ3: サービス復旧

```bash
# 1. サービスを意図的にダウンさせる
# 2. アラートが生成されることを確認
# 3. サービスを復旧
# 4. ヘルスチェックが "healthy" に戻ることを確認
# 5. エラーログで recovered: true が記録されることを確認
```

---

## モニタリング

### 1. Cloud Functions ログ

```bash
# リアルタイムログ
firebase functions:log --follow

# 特定のFunctionのログ
firebase functions:log --only scheduledHealthCheck

# エラーのみ
firebase functions:log --only-failures
```

### 2. Firestore ダッシュボード

以下のクエリをFirebaseコンソールで定期的に実行：

**過去1時間のエラー率：**
```javascript
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

db.collection('error_logs')
  .where('timestamp', '>', oneHourAgo)
  .orderBy('timestamp', 'desc')
  .get()
  .then(snapshot => {
    const errorsByService = {};
    snapshot.forEach(doc => {
      const service = doc.data().service;
      errorsByService[service] = (errorsByService[service] || 0) + 1;
    });
    console.log('Errors by service:', errorsByService);
  });
```

**未確認のアラート：**
```javascript
db.collection('alerts')
  .where('acknowledged', '==', false)
  .orderBy('timestamp', 'desc')
  .get()
  .then(snapshot => {
    console.log(`Unacknowledged alerts: ${snapshot.size}`);
    snapshot.forEach(doc => {
      console.log(doc.data());
    });
  });
```

### 3. カスタムダッシュボード

フロントエンドでヘルスダッシュボードを表示：

```typescript
// React コンポーネント例
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const HealthDashboard = () => {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const getHealthDashboard = httpsCallable(functions, 'getHealthDashboardData');

    getHealthDashboard().then(result => {
      setDashboard(result.data);
    });
  }, []);

  if (!dashboard) return <div>Loading...</div>;

  return (
    <div>
      <h2>サービスヘルス</h2>
      {Object.entries(dashboard.currentStatus).map(([service, status]) => (
        <div key={service}>
          <strong>{service}:</strong>
          <span className={status}>{status}</span>
          <span>エラー率: {(dashboard.errorRates[service] * 100).toFixed(2)}%</span>
          <span>稼働率: {dashboard.uptime[service].toFixed(2)}%</span>
        </div>
      ))}

      <h3>最近のアラート</h3>
      {dashboard.recentAlerts.map(alert => (
        <div key={alert.id} className={`alert-${alert.severity}`}>
          {alert.service}: {alert.status} - {alert.details}
        </div>
      ))}
    </div>
  );
};
```

---

## トラブルシューティング

### 問題1: Scheduled Functionが実行されない

**症状：**
- `healthChecks` コレクションに新しいレコードが追加されない

**解決方法：**
```bash
# Cloud Schedulerのジョブを確認
gcloud scheduler jobs list

# ジョブの実行履歴を確認
gcloud scheduler jobs describe firebase-schedule-scheduledHealthCheck-* --location=<REGION>

# 手動で実行
gcloud scheduler jobs run firebase-schedule-scheduledHealthCheck-* --location=<REGION>

# Functionのログを確認
firebase functions:log --only scheduledHealthCheck
```

### 問題2: Firestoreインデックスエラー

**症状：**
- `The query requires an index` エラー

**解決方法：**
```bash
# インデックスを再デプロイ
firebase deploy --only firestore:indexes

# Firebaseコンソールでインデックスの状態を確認
# Firestore > インデックス > 複合
# 「構築中」→「有効」になるまで待機
```

### 問題3: メモリ不足エラー

**症状：**
- `Function execution took too long` または `Memory limit exceeded`

**解決方法：**
```javascript
// functions/src/index.ts
export const getHealthDashboardData = functions
  .runWith({
    memory: '512MB',  // デフォルトは256MB
    timeoutSeconds: 60,  // デフォルトは60秒
  })
  .https.onCall(async (data, context) => {
    // ...
  });
```

再デプロイ：
```bash
firebase deploy --only functions:getHealthDashboardData
```

### 問題4: 型エラー（TypeScript）

**症状：**
- `npm run build` でTypeScriptエラー

**解決方法：**
```bash
# 特定のファイルのみ型チェック
npx tsc --noEmit src/services/errorHandler.ts

# エラーの詳細を確認
npx tsc --noEmit --pretty

# node_modulesの型定義を更新
npm install --save-dev @types/node @types/express firebase-functions firebase-admin
```

---

## 次のステップ

1. **アラート通知の実装**
   - Email通知（SendGrid, AWS SES）
   - Slack通知（Slack Webhook）
   - SMS通知（Twilio）

2. **パフォーマンスダッシュボードの統合**
   - 既存のPerformanceDashboardコンポーネントにヘルスチェック情報を統合

3. **自動スケーリングの設定**
   - Cloud Functionsの自動スケーリング設定を最適化

4. **カスタムメトリクスの追加**
   - Cloud Monitoringへのカスタムメトリクス送信
   - Grafana / Prometheusとの統合

---

## 参考資料

- [FAULT_TOLERANCE_DESIGN.md](./FAULT_TOLERANCE_DESIGN.md) - 障害対応設計書
- [FALLBACK_IMPLEMENTATION_EXAMPLES.md](./FALLBACK_IMPLEMENTATION_EXAMPLES.md) - フォールバック実装例
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
