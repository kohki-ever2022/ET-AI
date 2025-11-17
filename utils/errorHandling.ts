/**
 * エラーハンドリングユーティリティ
 *
 * ET-AIの5段階防御システムの一部として、
 * 一貫性のあるエラー処理とユーザーフレンドリーなメッセージを提供します。
 */

import { ErrorType } from '../types/firestore';

/**
 * ET-AIカスタムエラークラス
 */
export class ETAIError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public retryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ETAIError';
  }
}

/**
 * エラータイプの判定
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  if (message.includes('rate limit') || message.includes('429')) {
    return 'rate_limit';
  }

  if (
    (message.includes('token') && message.includes('limit')) ||
    message.includes('token limit') ||
    message.includes('too many tokens') ||
    message.includes('tokens')
  ) {
    return 'token_limit';
  }

  if (message.includes('network') || message.includes('fetch')) {
    return 'network_error';
  }

  if (message.includes('validation') || message.includes('invalid')) {
    return 'validation_error';
  }

  return 'api_error';
}

/**
 * ユーザーフレンドリーなエラーメッセージに変換
 */
export function getUserFriendlyErrorMessage(error: Error | ETAIError): string {
  if (error instanceof ETAIError) {
    return error.message;
  }

  const errorType = classifyError(error);

  switch (errorType) {
    case 'rate_limit':
      return 'APIの利用制限に達しました。しばらく待ってから再度お試しください。';

    case 'token_limit':
      return 'メッセージが長すぎます。内容を要約するか、複数のメッセージに分割してください。';

    case 'network_error':
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';

    case 'validation_error':
      return '入力内容に問題があります。入力内容を確認してください。';

    case 'api_error':
    default:
      return 'エラーが発生しました。問題が続く場合は管理者にお問い合わせください。';
  }
}

/**
 * エラーが再試行可能かどうかを判定
 */
export function isRetryableError(error: Error | ETAIError): boolean {
  if (error instanceof ETAIError) {
    return error.retryable;
  }

  const errorType = classifyError(error);

  // レート制限とネットワークエラーは再試行可能
  return errorType === 'rate_limit' || errorType === 'network_error';
}

/**
 * エラーログの記録
 */
export interface ErrorLogData {
  userId?: string;
  projectId?: string;
  channelId?: string;
  errorType: ErrorType;
  errorMessage: string;
  stackTrace?: string;
  userMessage?: string;
  context?: Record<string, any>;
}

/**
 * エラーログを構造化
 */
export function createErrorLog(
  error: Error | ETAIError,
  context: {
    userId?: string;
    projectId?: string;
    channelId?: string;
    userMessage?: string;
  }
): ErrorLogData {
  const errorType = error instanceof ETAIError ? error.type : classifyError(error);

  return {
    userId: context.userId,
    projectId: context.projectId,
    channelId: context.channelId,
    errorType,
    errorMessage: error.message,
    stackTrace: error.stack,
    userMessage: context.userMessage,
    context: {
      name: error.name,
      originalError: error instanceof ETAIError ? error.originalError?.message : undefined,
    },
  };
}

/**
 * 重大度の判定
 */
export function getErrorSeverity(
  errorType: ErrorType
): 'low' | 'medium' | 'high' | 'critical' {
  switch (errorType) {
    case 'validation_error':
      return 'low';

    case 'network_error':
      return 'medium';

    case 'rate_limit':
      return 'high';

    case 'token_limit':
    case 'api_error':
      return 'critical';

    default:
      return 'medium';
  }
}

/**
 * エラー通知が必要かどうかを判定
 */
export function shouldNotifyAdmin(errorType: ErrorType): boolean {
  const severity = getErrorSeverity(errorType);
  return severity === 'critical' || severity === 'high';
}

/**
 * Try-Catchラッパー（非同期関数用）
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context: {
    userId?: string;
    projectId?: string;
    channelId?: string;
    userMessage?: string;
  },
  onError?: (error: ETAIError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const etaiError =
      error instanceof ETAIError
        ? error
        : new ETAIError(
            classifyError(error as Error),
            (error as Error).message,
            isRetryableError(error as Error),
            error as Error
          );

    // エラーログを記録
    const errorLog = createErrorLog(etaiError, context);
    console.error('[ET-AI Error]', errorLog);

    // オプショナルなエラーハンドラを実行
    if (onError) {
      onError(etaiError);
    }

    return null;
  }
}

/**
 * エラーバウンダリー用のReactコンポーネント型
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: {
    componentStack: string;
  } | null;
}
