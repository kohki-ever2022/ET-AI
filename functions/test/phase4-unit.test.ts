/**
 * Unit Tests for Phase 4: Fault Tolerance System
 * Simplified version without Firebase dependencies
 */

import { detectClaudeError, detectVectorSearchError, detectEmbeddingError, detectStorageError, getUserFacingMessage } from '../src/services/errorHandler';
import { calculateDelay, CircuitBreaker } from '../src/utils/retryStrategy';

describe('Phase 4 Unit Tests', () => {
  describe('Error Detection', () => {
    describe('detectClaudeError', () => {
      it('should detect timeout errors', () => {
        const error = { code: 'ETIMEDOUT', message: 'Request timeout' };
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
        expect(result.severity).toBe('warning');
      });

      it('should detect server errors', () => {
        const error = { status: 503, message: 'Service unavailable' };
        const result = detectClaudeError(error);

        expect(result.type).toBe('server_error');
        expect(result.severity).toBe('critical');
      });

      it('should detect authentication errors', () => {
        const error = { status: 401, code: 'invalid_api_key' };
        const result = detectClaudeError(error);

        expect(result.type).toBe('auth_error');
        expect(result.severity).toBe('emergency');
      });
    });

    describe('detectVectorSearchError', () => {
      it('should detect index not ready errors', () => {
        const error = { code: 'failed-precondition', message: 'Vector index not ready' };
        const result = detectVectorSearchError(error);

        expect(result.service).toBe('firestore');
        expect(result.type).toBe('index_not_ready');
        expect(result.severity).toBe('warning');
      });

      it('should detect permission denied errors', () => {
        const error = { code: 'permission-denied', message: 'Permission denied' };
        const result = detectVectorSearchError(error);

        expect(result.type).toBe('permission_denied');
        expect(result.severity).toBe('critical');
      });
    });

    describe('detectEmbeddingError', () => {
      it('should detect Voyage AI timeout', () => {
        const error = { code: 'ETIMEDOUT' };
        const result = detectEmbeddingError(error);

        expect(result.service).toBe('voyage');
        expect(result.type).toBe('timeout');
      });

      it('should detect rate limit', () => {
        const error = { status: 429 };
        const result = detectEmbeddingError(error);

        expect(result.type).toBe('rate_limit');
      });
    });

    describe('detectStorageError', () => {
      it('should detect upload timeout', () => {
        const error = { code: 'ETIMEDOUT' };
        const result = detectStorageError(error);

        expect(result.service).toBe('storage');
        expect(result.type).toBe('upload_timeout');
      });

      it('should detect quota exceeded', () => {
        const error = { code: 403, message: 'Quota exceeded' };
        const result = detectStorageError(error);

        expect(result.type).toBe('quota_exceeded');
        expect(result.severity).toBe('warning');
      });
    });
  });

  describe('User-Facing Messages', () => {
    it('should return Japanese message for Claude timeout', () => {
      const error = {
        service: 'claude' as const,
        type: 'timeout',
        message: 'Timeout',
        timestamp: new Date(),
        severity: 'warning' as const,
      };

      const message = getUserFacingMessage(error);
      expect(message).toContain('タイムアウト');
      expect(message).toContain('質問を短くするか、もう一度お試しください');
    });

    it('should return Japanese message for rate limit', () => {
      const error = {
        service: 'claude' as const,
        type: 'rate_limit',
        message: 'Rate limit',
        timestamp: new Date(),
        severity: 'warning' as const,
        retryAfter: 60,
      };

      const message = getUserFacingMessage(error);
      expect(message).toContain('多くのリクエストを処理しています');
      expect(message).toContain('60秒');
    });
  });

  describe('Retry Strategy', () => {
    describe('calculateDelay', () => {
      it('should calculate exponential backoff', () => {
        const config = {
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          exponentialBase: 2,
          jitterFactor: 0.1,
          maxAttempts: 5,
        };

        const delay1 = calculateDelay(1, config);
        const delay2 = calculateDelay(2, config);
        const delay3 = calculateDelay(3, config);

        // First attempt: ~1000ms
        expect(delay1).toBeGreaterThanOrEqual(900);
        expect(delay1).toBeLessThanOrEqual(1100);

        // Second attempt: ~2000ms
        expect(delay2).toBeGreaterThanOrEqual(1800);
        expect(delay2).toBeLessThanOrEqual(2200);

        // Third attempt: ~4000ms
        expect(delay3).toBeGreaterThanOrEqual(3600);
        expect(delay3).toBeLessThanOrEqual(4400);
      });

      it('should cap at maxDelay', () => {
        const config = {
          baseDelayMs: 1000,
          maxDelayMs: 5000,
          exponentialBase: 2,
          jitterFactor: 0.1,
          maxAttempts: 10,
        };

        const delay = calculateDelay(10, config);
        expect(delay).toBeLessThanOrEqual(5500); // Max + 10% jitter
      });

      it('should add jitter to prevent thundering herd', () => {
        const config = {
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          exponentialBase: 2,
          jitterFactor: 0.2,
          maxAttempts: 5,
        };

        const delays = [];
        for (let i = 0; i < 10; i++) {
          delays.push(calculateDelay(2, config));
        }

        // All delays should be different due to jitter
        const uniqueDelays = new Set(delays);
        expect(uniqueDelays.size).toBeGreaterThan(1);
      });
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in closed state', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
      expect(breaker.getState()).toBe('closed');
    });

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
      const failingFn = jest.fn().mockRejectedValue(new Error('Failure'));

      for (let i = 0; i < 3; i++) {
        await breaker.execute(failingFn).catch(() => {});
      }

      expect(breaker.getState()).toBe('open');
    });

    it('should reject immediately when open', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 1000 });
      const failingFn = jest.fn().mockRejectedValue(new Error('Failure'));

      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});

      expect(breaker.getState()).toBe('open');

      await expect(breaker.execute(failingFn)).rejects.toThrow('Circuit breaker is open');
      expect(failingFn).toHaveBeenCalledTimes(2); // Not called the third time
    });

    it('should transition to half-open after reset timeout', async () => {
      jest.useFakeTimers();

      const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 1000 });
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('Success');

      await breaker.execute(fn).catch(() => {});
      await breaker.execute(fn).catch(() => {});

      expect(breaker.getState()).toBe('open');

      jest.advanceTimersByTime(1100);
      expect(breaker.getState()).toBe('half-open');

      const result = await breaker.execute(fn);
      expect(result).toBe('Success');
      expect(breaker.getState()).toBe('closed');

      jest.useRealTimers();
    });

    it('should stay open if half-open attempt fails', async () => {
      jest.useFakeTimers();

      const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeout: 1000 });
      const failingFn = jest.fn().mockRejectedValue(new Error('Failure'));

      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});

      jest.advanceTimersByTime(1100);
      expect(breaker.getState()).toBe('half-open');

      await breaker.execute(failingFn).catch(() => {});
      expect(breaker.getState()).toBe('open');

      jest.useRealTimers();
    });

    it('should reset failure count on success', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('Success')
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'));

      await breaker.execute(fn).catch(() => {});
      await breaker.execute(fn);
      
      expect(breaker.getState()).toBe('closed');

      // 3 more failures should open the circuit
      await breaker.execute(fn).catch(() => {});
      await breaker.execute(fn).catch(() => {});
      await breaker.execute(fn).catch(() => {});

      expect(breaker.getState()).toBe('open');
    });
  });
});
