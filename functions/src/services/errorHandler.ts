/**
 * Error Handler Service
 *
 * Centralized error handling for all ET-AI services.
 * Handles detection, classification, logging, and recovery strategies.
 *
 * Supported Services:
 * - Claude API
 * - Firestore Vector Search
 * - Voyage AI Embedding
 * - Firebase Storage
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

// ============================================================================
// Error Types
// ============================================================================

export type ServiceType = 'claude' | 'firestore' | 'voyage' | 'storage';
export type ErrorSeverity = 'info' | 'warning' | 'critical' | 'emergency';

export interface BaseError {
  service: ServiceType;
  type: string;
  message: string;
  timestamp: Date;
  severity: ErrorSeverity;
  metadata?: Record<string, any>;
}

export interface ClaudeAPIError extends BaseError {
  service: 'claude';
  type: 'timeout' | 'rate_limit' | 'server_error' | 'auth_error' | 'network_error';
  statusCode?: number;
  retryAfter?: number;
}

export interface VectorSearchError extends BaseError {
  service: 'firestore';
  type: 'index_not_ready' | 'timeout' | 'quota_exceeded' | 'invalid_vector';
  collection: string;
}

export interface EmbeddingError extends BaseError {
  service: 'voyage';
  type: 'timeout' | 'rate_limit' | 'invalid_input' | 'server_error';
  statusCode?: number;
  documentId?: string;
}

export interface StorageError extends BaseError {
  service: 'storage';
  type: 'timeout' | 'quota_exceeded' | 'permission_denied' | 'network_error' | 'invalid_file';
  code: string;
  fileName: string;
  fileSize: number;
}

export type ServiceError = ClaudeAPIError | VectorSearchError | EmbeddingError | StorageError;

export interface ErrorLog {
  id?: string;
  timestamp: admin.firestore.Timestamp;
  service: ServiceType;
  errorType: string;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  retryCount: number;
  recovered: boolean;
  recoveryMethod?: string;
  userFacingMessage?: string;
}

// ============================================================================
// Error Detection
// ============================================================================

/**
 * Detect Claude API errors
 */
export function detectClaudeError(error: any): ClaudeAPIError {
  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return {
      service: 'claude',
      type: 'timeout',
      message: error.message || 'Request timeout',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { code: error.code }
    };
  }

  // Rate limit errors
  if (error.status === 429 || error.code === 'rate_limit_exceeded') {
    const retryAfter = parseInt(error.headers?.['retry-after'] || '60');
    return {
      service: 'claude',
      type: 'rate_limit',
      statusCode: 429,
      retryAfter,
      message: 'Rate limit exceeded',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { retryAfter }
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      service: 'claude',
      type: 'server_error',
      statusCode: error.status,
      message: 'Claude API server error',
      timestamp: new Date(),
      severity: 'critical',
      metadata: { statusCode: error.status }
    };
  }

  // Authentication errors
  if (error.status === 401 || error.code === 'invalid_api_key') {
    return {
      service: 'claude',
      type: 'auth_error',
      statusCode: 401,
      message: 'Invalid API key',
      timestamp: new Date(),
      severity: 'emergency',
      metadata: { statusCode: 401 }
    };
  }

  // Network errors
  return {
    service: 'claude',
    type: 'network_error',
    message: error.message || 'Unknown network error',
    timestamp: new Date(),
    severity: 'warning',
    metadata: { originalError: error.toString() }
  };
}

/**
 * Detect Firestore Vector Search errors
 */
export function detectVectorSearchError(error: any, collection: string): VectorSearchError {
  // Index not ready
  if (error.message?.includes('index') || error.code === 'FAILED_PRECONDITION') {
    return {
      service: 'firestore',
      type: 'index_not_ready',
      message: 'Vector index not ready',
      collection,
      timestamp: new Date(),
      severity: 'warning',
      metadata: { collection }
    };
  }

  // Timeout
  if (error.code === 'DEADLINE_EXCEEDED') {
    return {
      service: 'firestore',
      type: 'timeout',
      message: 'Vector search timeout',
      collection,
      timestamp: new Date(),
      severity: 'warning',
      metadata: { collection }
    };
  }

  // Quota exceeded
  if (error.code === 'RESOURCE_EXHAUSTED') {
    return {
      service: 'firestore',
      type: 'quota_exceeded',
      message: 'Vector search quota exceeded',
      collection,
      timestamp: new Date(),
      severity: 'critical',
      metadata: { collection }
    };
  }

  // Invalid vector
  return {
    service: 'firestore',
    type: 'invalid_vector',
    message: error.message || 'Invalid vector query',
    collection,
    timestamp: new Date(),
    severity: 'info',
    metadata: { collection, originalError: error.toString() }
  };
}

/**
 * Detect Voyage AI Embedding errors
 */
export function detectEmbeddingError(error: any, documentId?: string): EmbeddingError {
  // Timeout
  if (error.code === 'ETIMEDOUT') {
    return {
      service: 'voyage',
      type: 'timeout',
      documentId,
      message: 'Embedding generation timeout',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { documentId }
    };
  }

  // Rate limit
  if (error.status === 429) {
    return {
      service: 'voyage',
      type: 'rate_limit',
      statusCode: 429,
      documentId,
      message: 'Embedding API rate limit',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { documentId }
    };
  }

  // Invalid input
  if (error.status === 400) {
    return {
      service: 'voyage',
      type: 'invalid_input',
      statusCode: 400,
      documentId,
      message: 'Invalid input for embedding',
      timestamp: new Date(),
      severity: 'info',
      metadata: { documentId }
    };
  }

  // Server error
  return {
    service: 'voyage',
    type: 'server_error',
    statusCode: error.status,
    documentId,
    message: error.message || 'Voyage AI server error',
    timestamp: new Date(),
    severity: 'critical',
    metadata: { documentId, statusCode: error.status }
  };
}

/**
 * Detect Firebase Storage errors
 */
export function detectStorageError(
  error: any,
  fileName: string,
  fileSize: number
): StorageError {
  // Timeout
  if (error.code === 'storage/canceled' || error.code === 'ETIMEDOUT') {
    return {
      service: 'storage',
      type: 'timeout',
      code: error.code,
      fileName,
      fileSize,
      message: 'Upload timeout',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { fileName, fileSize }
    };
  }

  // Quota exceeded
  if (error.code === 'storage/quota-exceeded') {
    return {
      service: 'storage',
      type: 'quota_exceeded',
      code: error.code,
      fileName,
      fileSize,
      message: 'Storage quota exceeded',
      timestamp: new Date(),
      severity: 'emergency',
      metadata: { fileName, fileSize }
    };
  }

  // Permission denied
  if (error.code === 'storage/unauthorized') {
    return {
      service: 'storage',
      type: 'permission_denied',
      code: error.code,
      fileName,
      fileSize,
      message: 'Permission denied',
      timestamp: new Date(),
      severity: 'critical',
      metadata: { fileName, fileSize }
    };
  }

  // Network error
  if (error.message?.includes('network') || error.code === 'ECONNRESET') {
    return {
      service: 'storage',
      type: 'network_error',
      code: error.code || 'NETWORK_ERROR',
      fileName,
      fileSize,
      message: 'Network error during upload',
      timestamp: new Date(),
      severity: 'warning',
      metadata: { fileName, fileSize }
    };
  }

  // Invalid file
  return {
    service: 'storage',
    type: 'invalid_file',
    code: error.code || 'INVALID_FILE',
    fileName,
    fileSize,
    message: error.message || 'Invalid file',
    timestamp: new Date(),
    severity: 'info',
    metadata: { fileName, fileSize }
  };
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log error to Firestore
 */
export async function logError(
  error: ServiceError,
  options: {
    userId?: string;
    requestId?: string;
    retryCount?: number;
    recovered?: boolean;
    recoveryMethod?: string;
    stackTrace?: string;
  } = {}
): Promise<void> {
  try {
    const errorLog: ErrorLog = {
      timestamp: admin.firestore.Timestamp.now(),
      service: error.service,
      errorType: error.type,
      severity: error.severity,
      message: error.message,
      stackTrace: options.stackTrace,
      userId: options.userId,
      requestId: options.requestId,
      metadata: error.metadata,
      retryCount: options.retryCount || 0,
      recovered: options.recovered || false,
      recoveryMethod: options.recoveryMethod,
      userFacingMessage: getUserFacingMessage(error),
    };

    await db.collection('error_logs').add(errorLog);

    // Log to console based on severity
    switch (error.severity) {
      case 'emergency':
        logger.error('EMERGENCY', errorLog);
        break;
      case 'critical':
        logger.error('CRITICAL', errorLog);
        break;
      case 'warning':
        logger.warn('WARNING', errorLog);
        break;
      default:
        logger.info('INFO', errorLog);
    }
  } catch (loggingError) {
    // Fallback to console if Firestore logging fails
    logger.error('Failed to log error to Firestore', {
      originalError: error,
      loggingError: loggingError,
    });
  }
}

/**
 * Get user-facing error message
 */
export function getUserFacingMessage(error: ServiceError): string {
  switch (error.service) {
    case 'claude':
      return getClaudeUserMessage(error as ClaudeAPIError);
    case 'firestore':
      return getVectorSearchUserMessage(error as VectorSearchError);
    case 'voyage':
      return getEmbeddingUserMessage(error as EmbeddingError);
    case 'storage':
      return getStorageUserMessage(error as StorageError);
    default:
      return '予期しないエラーが発生しました。もう一度お試しください。';
  }
}

function getClaudeUserMessage(error: ClaudeAPIError): string {
  switch (error.type) {
    case 'timeout':
      return 'リクエストがタイムアウトしました。質問を短くするか、もう一度お試しください。';
    case 'rate_limit':
      return `現在、多くのリクエストを処理しています。キューに追加しました。推定待ち時間: ${error.retryAfter}秒`;
    case 'server_error':
      return 'AIサービスが一時的に利用できません。自動的に再試行しています。';
    case 'auth_error':
      return 'サービス設定エラーが発生しました。管理者に連絡してください。';
    case 'network_error':
      return 'ネットワークエラーが発生しました。接続を確認してもう一度お試しください。';
  }
}

function getVectorSearchUserMessage(error: VectorSearchError): string {
  switch (error.type) {
    case 'index_not_ready':
      return 'ベクトル検索インデックスを構築中です。キーワード検索をご利用ください。';
    case 'timeout':
      return '検索がタイムアウトしました。検索条件を絞り込んでもう一度お試しください。';
    case 'quota_exceeded':
      return '検索の利用上限に達しました。しばらくしてからもう一度お試しください。';
    case 'invalid_vector':
      return '検索に失敗しました。キーワード検索をご利用ください。';
  }
}

function getEmbeddingUserMessage(error: EmbeddingError): string {
  switch (error.type) {
    case 'timeout':
      return 'ドキュメント処理がタイムアウトしました。ファイルサイズを確認してもう一度お試しください。';
    case 'rate_limit':
      return 'ドキュメント処理を一時停止しました。後ほど自動的に再開されます。';
    case 'invalid_input':
      return 'ドキュメント形式が無効です。ファイルの内容を確認してください。';
    case 'server_error':
      return 'ドキュメント処理サービスが一時的に利用できません。しばらくしてからもう一度お試しください。';
  }
}

function getStorageUserMessage(error: StorageError): string {
  switch (error.type) {
    case 'timeout':
      return 'アップロードがタイムアウトしました。ファイルサイズを確認してもう一度お試しください。';
    case 'quota_exceeded':
      return 'ストレージ容量の上限に達しました。管理者に連絡してください。';
    case 'permission_denied':
      return 'ファイルのアップロード権限がありません。管理者に連絡してください。';
    case 'network_error':
      return 'ネットワークエラーが発生しました。接続を確認してもう一度お試しください。';
    case 'invalid_file':
      return 'ファイル形式が無効です。サポートされているファイルをアップロードしてください。';
  }
}

// ============================================================================
// Error Statistics
// ============================================================================

/**
 * Get error rate for a service over the last N minutes
 */
export async function getErrorRate(
  service: ServiceType,
  minutes: number = 5
): Promise<number> {
  try {
    const cutoffTime = admin.firestore.Timestamp.fromMillis(Date.now() - minutes * 60 * 1000);

    const snapshot = await db
      .collection('error_logs')
      .where('service', '==', service)
      .where('timestamp', '>', cutoffTime)
      .get();

    const totalRequests = await getTotalRequests(service, minutes);
    if (totalRequests === 0) return 0;

    return snapshot.size / totalRequests;
  } catch (error) {
    logger.error('Failed to calculate error rate', { service, error });
    return 0;
  }
}

/**
 * Get total requests for a service (approximate)
 */
async function getTotalRequests(service: ServiceType, minutes: number): Promise<number> {
  // This would ideally come from a metrics collection
  // For now, return a reasonable estimate based on service
  const estimatedRPM = {
    claude: 10,
    firestore: 50,
    voyage: 5,
    storage: 3,
  };

  return (estimatedRPM[service] || 10) * minutes;
}

/**
 * Check if service should be considered degraded
 */
export async function isServiceDegraded(service: ServiceType): Promise<boolean> {
  const errorRate = await getErrorRate(service, 5);
  return errorRate > 0.1; // >10% error rate
}

/**
 * Check if service should be considered down
 */
export async function isServiceDown(service: ServiceType): Promise<boolean> {
  const errorRate = await getErrorRate(service, 5);
  return errorRate > 0.5; // >50% error rate
}
