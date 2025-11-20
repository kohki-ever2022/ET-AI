/**
 * Error Handling Utility Tests
 *
 * Tests for ET-AI error handling system
 */

import {
  ETAIError,
  classifyError,
  getUserFriendlyErrorMessage,
  isRetryableError,
  getErrorSeverity,
  shouldNotifyAdmin,
  tryCatch,
} from '../../utils/errorHandling';

describe('Error Handling Utils', () => {
  describe('ETAIError', () => {
    it('should create ETAIError with required fields', () => {
      const error = new ETAIError('api_error', 'Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ETAIError');
      expect(error.type).toBe('api_error');
      expect(error.message).toBe('Test error message');
      expect(error.retryable).toBe(false);
    });

    it('should create ETAIError with retryable flag', () => {
      const error = new ETAIError('network_error', 'Network failed', true);

      expect(error.retryable).toBe(true);
    });

    it('should store original error', () => {
      const originalError = new Error('Original error');
      const error = new ETAIError('api_error', 'Wrapped error', false, originalError);

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('classifyError', () => {
    it('should classify rate limit errors', () => {
      const errors = [
        new Error('Rate limit exceeded'),
        new Error('API returned 429'),
        new Error('Too many requests - rate limit'),
      ];

      errors.forEach((error) => {
        expect(classifyError(error)).toBe('rate_limit');
      });
    });

    it('should classify token limit errors', () => {
      const errors = [
        new Error('Token limit exceeded'),
        new Error('Message has too many tokens'),
        new Error('Input token limit reached'),
      ];

      errors.forEach((error) => {
        expect(classifyError(error)).toBe('token_limit');
      });
    });

    it('should classify network errors', () => {
      const errors = [
        new Error('Network error occurred'),
        new Error('Failed to fetch data'),
        new Error('Network request failed'),
      ];

      errors.forEach((error) => {
        expect(classifyError(error)).toBe('network_error');
      });
    });

    it('should classify validation errors', () => {
      const errors = [
        new Error('Validation failed'),
        new Error('Invalid input data'),
        new Error('Validation error: missing field'),
      ];

      errors.forEach((error) => {
        expect(classifyError(error)).toBe('validation_error');
      });
    });

    it('should default to api_error for unknown errors', () => {
      const errors = [
        new Error('Unknown error'),
        new Error('Something went wrong'),
        new Error('Unexpected issue'),
      ];

      errors.forEach((error) => {
        expect(classifyError(error)).toBe('api_error');
      });
    });

    it('should be case insensitive', () => {
      const errors = [
        new Error('RATE LIMIT EXCEEDED'),
        new Error('Rate Limit Exceeded'),
        new Error('rate limit exceeded'),
      ];

      errors.forEach((error) => {
        expect(classifyError(error)).toBe('rate_limit');
      });
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return ETAIError message directly', () => {
      const error = new ETAIError('api_error', 'Custom error message');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toBe('Custom error message');
    });

    it('should return friendly message for rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toContain('利用制限');
      expect(message).toContain('待って');
    });

    it('should return friendly message for token limit errors', () => {
      const error = new Error('Token limit exceeded');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toContain('長すぎます');
      expect(message).toContain('要約');
    });

    it('should return friendly message for network errors', () => {
      const error = new Error('Network error');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toContain('ネットワーク');
      expect(message).toContain('接続');
    });

    it('should return friendly message for validation errors', () => {
      const error = new Error('Validation failed');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toContain('問題');
      expect(message).toContain('確認');
    });

    it('should return friendly message for API errors', () => {
      const error = new Error('Unknown API error');
      const message = getUserFriendlyErrorMessage(error);

      expect(message).toContain('エラーが発生');
    });
  });

  describe('isRetryableError', () => {
    it('should return retryable flag for ETAIError', () => {
      const retryableError = new ETAIError('network_error', 'Network failed', true);
      const nonRetryableError = new ETAIError('validation_error', 'Invalid', false);

      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should mark rate limit errors as retryable', () => {
      const error = new Error('Rate limit exceeded');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should mark network errors as retryable', () => {
      const error = new Error('Network error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should mark token limit errors as non-retryable', () => {
      const error = new Error('Token limit exceeded');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should mark validation errors as non-retryable', () => {
      const error = new Error('Validation failed');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should mark API errors as non-retryable', () => {
      const error = new Error('Unknown error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getErrorSeverity', () => {
    it('should return "low" for validation errors', () => {
      expect(getErrorSeverity('validation_error')).toBe('low');
    });

    it('should return "medium" for network errors', () => {
      expect(getErrorSeverity('network_error')).toBe('medium');
    });

    it('should return "high" for rate limit errors', () => {
      expect(getErrorSeverity('rate_limit')).toBe('high');
    });

    it('should return "critical" for token limit errors', () => {
      expect(getErrorSeverity('token_limit')).toBe('critical');
    });

    it('should return "critical" for API errors', () => {
      expect(getErrorSeverity('api_error')).toBe('critical');
    });

    it('should return "medium" for unknown error types', () => {
      expect(getErrorSeverity('unknown' as any)).toBe('medium');
    });
  });

  describe('shouldNotifyAdmin', () => {
    it('should return true for critical errors', () => {
      expect(shouldNotifyAdmin('api_error')).toBe(true);
      expect(shouldNotifyAdmin('token_limit')).toBe(true);
    });

    it('should return true for high severity errors', () => {
      expect(shouldNotifyAdmin('rate_limit')).toBe(true);
    });

    it('should return false for medium severity errors', () => {
      expect(shouldNotifyAdmin('network_error')).toBe(false);
    });

    it('should return false for low severity errors', () => {
      expect(shouldNotifyAdmin('validation_error')).toBe(false);
    });
  });

  describe('tryCatch', () => {
    it('should return result when function succeeds', async () => {
      const successFn = jest.fn().mockResolvedValue('success');

      const result = await tryCatch(successFn, {
        userId: 'user-123',
      });

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalled();
    });

    it('should return null when function throws error', async () => {
      const errorFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await tryCatch(errorFn, {
        userId: 'user-123',
      });

      expect(result).toBeNull();
    });

    it('should call onError callback when error occurs', async () => {
      const errorFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const onError = jest.fn();

      await tryCatch(errorFn, { userId: 'user-123' }, onError);

      expect(onError).toHaveBeenCalled();
      const errorArg = onError.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(ETAIError);
    });

    it('should preserve ETAIError when thrown', async () => {
      const etaiError = new ETAIError('api_error', 'API failed', false);
      const errorFn = jest.fn().mockRejectedValue(etaiError);
      const onError = jest.fn();

      await tryCatch(errorFn, { userId: 'user-123' }, onError);

      expect(onError).toHaveBeenCalledWith(etaiError);
    });

    it('should wrap standard Error in ETAIError', async () => {
      const error = new Error('Network error');
      const errorFn = jest.fn().mockRejectedValue(error);
      const onError = jest.fn();

      await tryCatch(errorFn, { userId: 'user-123' }, onError);

      expect(onError).toHaveBeenCalled();
      const wrappedError = onError.mock.calls[0][0];
      expect(wrappedError).toBeInstanceOf(ETAIError);
      expect(wrappedError.type).toBe('network_error');
      expect(wrappedError.originalError).toBe(error);
    });

    it('should work without onError callback', async () => {
      const errorFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const result = await tryCatch(errorFn, { userId: 'user-123' });

      expect(result).toBeNull();
      // Should not throw even without onError
    });
  });
});
