/**
 * Retry Strategy Utility
 *
 * Provides exponential backoff with jitter for retrying failed operations.
 * Supports different strategies for different error types.
 */

import * as logger from 'firebase-functions/logger';
import { ServiceError, logError } from '../services/errorHandler';

// ============================================================================
// Types
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitterFactor: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalDelay: number;
  recoveryMethod?: string;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 32000, // 32 seconds
  exponentialBase: 2,
  jitterFactor: 0.5, // 50% jitter
};

/**
 * Claude API retry configuration
 */
export const CLAUDE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 2000, // 2 seconds
  maxDelayMs: 60000, // 60 seconds
  exponentialBase: 2,
  jitterFactor: 0.5,
  retryableErrors: ['timeout', 'server_error', 'network_error'],
};

/**
 * Vector Search retry configuration
 */
export const VECTOR_SEARCH_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 5000, // 5 seconds
  maxDelayMs: 60000,
  exponentialBase: 2,
  jitterFactor: 0.3,
  retryableErrors: ['timeout', 'index_not_ready'],
};

/**
 * Embedding retry configuration
 */
export const EMBEDDING_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 5000, // 5 seconds
  maxDelayMs: 30000,
  exponentialBase: 1.5,
  jitterFactor: 0.4,
  retryableErrors: ['timeout', 'rate_limit', 'server_error'],
};

/**
 * Storage retry configuration
 */
export const STORAGE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 16000,
  exponentialBase: 2,
  jitterFactor: 0.5,
  retryableErrors: ['timeout', 'network_error'],
};

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const { baseDelayMs, maxDelayMs, exponentialBase, jitterFactor } = config;

  // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
  const exponentialDelay = baseDelayMs * Math.pow(exponentialBase, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: random value between 0 and jitterFactor * delay
  const jitter = Math.random() * jitterFactor * cappedDelay;

  return Math.round(cappedDelay + jitter);
}

/**
 * Wait for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryable(
  error: ServiceError,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // If no retryable errors specified, retry all errors
  if (!config.retryableErrors || config.retryableErrors.length === 0) {
    return true;
  }

  // Check if error type is in retryable list
  return config.retryableErrors.includes(error.type);
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  errorDetector: (error: any) => ServiceError,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: {
    userId?: string;
    requestId?: string;
  }
): Promise<RetryResult<T>> {
  let lastError: any;
  let totalDelay = 0;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.info(`Attempt ${attempt}/${config.maxAttempts}`, context);

      const result = await fn();

      // Success!
      if (attempt > 1) {
        logger.info(`Succeeded on attempt ${attempt}`, context);
      }

      return {
        success: true,
        result,
        attempts: attempt,
        totalDelay,
        recoveryMethod: attempt > 1 ? 'retry' : undefined,
      };
    } catch (error) {
      lastError = error;

      const serviceError = errorDetector(error);

      // Log attempt
      logger.warn(`Attempt ${attempt} failed`, {
        ...context,
        error: serviceError,
      });

      // Check if we should retry
      if (attempt >= config.maxAttempts) {
        // Max attempts reached
        logger.error('Max retry attempts reached', {
          ...context,
          attempts: attempt,
          error: serviceError,
        });

        // Log final error
        await logError(serviceError, {
          ...context,
          retryCount: attempt - 1,
          recovered: false,
        });

        return {
          success: false,
          error: serviceError,
          attempts: attempt,
          totalDelay,
        };
      }

      // Check if error is retryable
      if (!isRetryable(serviceError, config)) {
        logger.warn('Error is not retryable', {
          ...context,
          error: serviceError,
        });

        await logError(serviceError, {
          ...context,
          retryCount: 0,
          recovered: false,
        });

        return {
          success: false,
          error: serviceError,
          attempts: attempt,
          totalDelay,
        };
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, config);
      totalDelay += delay;

      logger.info(`Retrying in ${delay}ms`, { ...context, attempt, delay });

      // Call onRetry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, delay, serviceError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: lastError,
    attempts: config.maxAttempts,
    totalDelay,
  };
}

/**
 * Retry with rate limit handling
 *
 * Special retry strategy for rate limit errors that respects retry-after header
 */
export async function retryWithRateLimit<T>(
  fn: () => Promise<T>,
  errorDetector: (error: any) => ServiceError,
  context?: {
    userId?: string;
    requestId?: string;
  }
): Promise<RetryResult<T>> {
  const maxAttempts = 3;
  let lastError: any;
  let totalDelay = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      return {
        success: true,
        result,
        attempts: attempt,
        totalDelay,
        recoveryMethod: attempt > 1 ? 'rate_limit_retry' : undefined,
      };
    } catch (error) {
      lastError = error;

      const serviceError = errorDetector(error);

      // Check if this is a rate limit error
      if (serviceError.type === 'rate_limit') {
        const retryAfter = (serviceError as any).retryAfter || 60;
        const delayMs = retryAfter * 1000;

        if (attempt >= maxAttempts) {
          // Queue instead of retrying
          logger.info('Rate limit: queueing request instead of retrying', {
            ...context,
            retryAfter,
          });

          await logError(serviceError, {
            ...context,
            retryCount: attempt - 1,
            recovered: false,
            recoveryMethod: 'queue',
          });

          return {
            success: false,
            error: serviceError,
            attempts: attempt,
            totalDelay,
            recoveryMethod: 'queue',
          };
        }

        logger.info(`Rate limit: waiting ${retryAfter}s before retry`, {
          ...context,
          attempt,
          retryAfter,
        });

        totalDelay += delayMs;
        await sleep(delayMs);
      } else {
        // Not a rate limit error, use normal retry
        return retryWithBackoff(fn, errorDetector, CLAUDE_RETRY_CONFIG, context);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    totalDelay,
  };
}

/**
 * Retry with reduced batch size
 *
 * Useful for batch operations that might timeout
 */
export async function retryWithReducedBatchSize<T>(
  items: T[],
  processBatch: (batch: T[]) => Promise<void>,
  initialBatchSize: number = 100,
  minBatchSize: number = 10
): Promise<RetryResult<void>> {
  let batchSize = initialBatchSize;
  let attempt = 1;
  const maxAttempts = 5;

  while (batchSize >= minBatchSize && attempt <= maxAttempts) {
    try {
      logger.info(`Processing with batch size ${batchSize}`, { attempt, batchSize });

      // Process in batches
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await processBatch(batch);
      }

      logger.info(`Successfully processed with batch size ${batchSize}`, {
        attempt,
        batchSize,
      });

      return {
        success: true,
        attempts: attempt,
        totalDelay: 0,
        recoveryMethod: batchSize < initialBatchSize ? 'reduced_batch_size' : undefined,
      };
    } catch (error) {
      logger.warn(`Failed with batch size ${batchSize}`, {
        attempt,
        batchSize,
        error,
      });

      // Reduce batch size by half
      batchSize = Math.floor(batchSize / 2);
      attempt++;

      if (batchSize < minBatchSize) {
        logger.error('Batch size too small, giving up', { batchSize, minBatchSize });
        return {
          success: false,
          error,
          attempts: attempt,
          totalDelay: 0,
        };
      }

      logger.info(`Retrying with reduced batch size ${batchSize}`, { batchSize });
    }
  }

  return {
    success: false,
    error: new Error('Max attempts reached'),
    attempts: attempt,
    totalDelay: 0,
  };
}

/**
 * Retry with circuit breaker
 *
 * Stops retrying if too many consecutive failures
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000 // 60 seconds
  ) {}

  async execute<T>(
    fn: () => Promise<T>,
    errorDetector: (error: any) => ServiceError
  ): Promise<RetryResult<T>> {
    // Check circuit state
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure < this.resetTimeoutMs) {
        logger.warn('Circuit breaker is OPEN, rejecting request', {
          failureCount: this.failureCount,
          timeSinceLastFailure,
        });

        return {
          success: false,
          error: new Error('Circuit breaker is OPEN'),
          attempts: 0,
          totalDelay: 0,
          recoveryMethod: 'circuit_breaker_open',
        };
      }

      // Try to recover
      this.state = 'half-open';
      logger.info('Circuit breaker entering HALF-OPEN state');
    }

    try {
      const result = await fn();

      // Success! Reset circuit breaker
      if (this.state === 'half-open') {
        logger.info('Circuit breaker recovered, entering CLOSED state');
        this.state = 'closed';
        this.failureCount = 0;
      }

      return {
        success: true,
        result,
        attempts: 1,
        totalDelay: 0,
      };
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        logger.error('Circuit breaker tripped, entering OPEN state', {
          failureCount: this.failureCount,
        });
      }

      const serviceError = errorDetector(error);

      return {
        success: false,
        error: serviceError,
        attempts: 1,
        totalDelay: 0,
      };
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    logger.info('Circuit breaker manually reset');
  }
}
