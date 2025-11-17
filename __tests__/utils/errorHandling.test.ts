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
});
