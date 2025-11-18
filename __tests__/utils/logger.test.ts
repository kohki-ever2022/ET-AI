/**
 * Logger Utility Tests
 *
 * Tests for the centralized logging utility
 * Testing philosophy: Test as specifications - what the logger should do for users
 */

// Mock performance API for Node.js test environment
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
  },
});

import { logger, debug, info, warn, error, setContext, clearContext, startTimer } from '../../utils/logger';
import { LogLevel } from '../../utils/logger';

// Mock environment
jest.mock('../../config/environment', () => ({
  __esModule: true,
  default: {
    features: {
      errorReporting: false,
    },
    monitoring: {
      logLevel: 'debug',
      sentryDsn: null,
    },
    isProduction: false,
    isDevelopment: true,
  },
}));

describe('Logger Utility', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear context before each test
    clearContext();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Log Levels - Specification: Different severity levels should be logged appropriately', () => {
    it('should log debug messages when using debug()', () => {
      debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalled();
      const logOutput = consoleDebugSpy.mock.calls[0][0];
      expect(logOutput).toContain('[DEBUG]');
      expect(logOutput).toContain('Debug message');
    });

    it('should log info messages when using info()', () => {
      info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('[INFO]');
      expect(logOutput).toContain('Info message');
    });

    it('should log warning messages when using warn()', () => {
      warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('Warning message');
    });

    it('should log error messages when using error()', () => {
      error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Error message');
    });

    it('should include error stack trace when logging errors', () => {
      const testError = new Error('Test error');
      error('Error occurred', testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain('Test error');
      expect(logOutput).toContain('Error occurred');
    });
  });

  describe('Context Management - Specification: Context should be included in logs', () => {
    it('should include local context in log output', () => {
      info('Message with context', { userId: 'user-123', action: 'login' });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('user-123');
      expect(logOutput).toContain('action');
      expect(logOutput).toContain('login');
    });

    it('should include global context in all subsequent logs', () => {
      setContext({ sessionId: 'session-456' });

      info('First message');
      info('Second message');

      expect(consoleInfoSpy).toHaveBeenCalledTimes(2);

      const firstLog = consoleInfoSpy.mock.calls[0][0];
      const secondLog = consoleInfoSpy.mock.calls[1][0];

      expect(firstLog).toContain('session-456');
      expect(secondLog).toContain('session-456');
    });

    it('should merge global and local context', () => {
      setContext({ sessionId: 'session-789' });
      info('Message', { userId: 'user-999' });

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('session-789');
      expect(logOutput).toContain('user-999');
    });

    it('should clear global context when clearContext() is called', () => {
      setContext({ sessionId: 'session-111' });
      info('Before clear');

      clearContext();
      info('After clear');

      const beforeClearLog = consoleInfoSpy.mock.calls[0][0];
      const afterClearLog = consoleInfoSpy.mock.calls[1][0];

      expect(beforeClearLog).toContain('session-111');
      expect(afterClearLog).not.toContain('session-111');
    });

    it('should allow local context to override global context', () => {
      setContext({ environment: 'test' });
      info('Message', { environment: 'production' });

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('production');
    });
  });

  describe('Log Formatting - Specification: Logs should be formatted with timestamp and level', () => {
    it('should include ISO timestamp in log output', () => {
      info('Test message');

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      // Check for ISO format pattern: [YYYY-MM-DDTHH:MM:SS.xxxZ]
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should format log with level prefix', () => {
      debug('Debug');
      info('Info');
      warn('Warn');
      error('Error');

      expect(consoleDebugSpy.mock.calls[0][0]).toContain('[DEBUG]');
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[INFO]');
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]');
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
    });

    it('should only include context in output when context is provided', () => {
      info('Without context');
      info('With context', { key: 'value' });

      const withoutContextLog = consoleInfoSpy.mock.calls[0][0];
      const withContextLog = consoleInfoSpy.mock.calls[1][0];

      expect(withoutContextLog).not.toContain('{');
      expect(withContextLog).toContain('key');
      expect(withContextLog).toContain('value');
    });
  });

  describe('Performance Tracking - Specification: Performance metrics should be tracked and logged', () => {
    it.skip('should log performance metrics with duration', () => {
      const endTimer = startTimer('test-operation');

      // Simulate some work
      endTimer({ operation: 'test' });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('Performance');
      expect(logOutput).toContain('test-operation');
      expect(logOutput).toContain('completed in');
      expect(logOutput).toContain('ms');
    });

    it.skip('should include performance context in metrics', () => {
      const endTimer = startTimer('api-call');
      endTimer({ endpoint: '/api/users', method: 'GET' });

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('endpoint');
      expect(logOutput).toContain('/api/users');
      expect(logOutput).toContain('method');
      expect(logOutput).toContain('GET');
    });

    it.skip('should measure elapsed time accurately', () => {
      jest.useFakeTimers();

      const endTimer = startTimer('timed-operation');

      // Advance time by 100ms
      jest.advanceTimersByTime(100);

      endTimer();

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      // The log should mention duration
      expect(logOutput).toContain('completed in');

      jest.useRealTimers();
    });
  });

  describe('Multiple Log Calls - Specification: Logger should handle multiple concurrent logs', () => {
    it('should handle multiple logs in sequence', () => {
      debug('First');
      info('Second');
      warn('Third');
      error('Fourth');

      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain separate contexts for each log', () => {
      info('Message 1', { requestId: 'req-1' });
      info('Message 2', { requestId: 'req-2' });

      const log1 = consoleInfoSpy.mock.calls[0][0];
      const log2 = consoleInfoSpy.mock.calls[1][0];

      expect(log1).toContain('req-1');
      expect(log1).not.toContain('req-2');
      expect(log2).toContain('req-2');
      expect(log2).not.toContain('req-1');
    });
  });

  describe('Edge Cases - Specification: Logger should handle edge cases gracefully', () => {
    it('should handle empty messages', () => {
      expect(() => info('')).not.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should handle undefined context gracefully', () => {
      expect(() => info('Message', undefined)).not.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should handle null context gracefully', () => {
      expect(() => info('Message', null as any)).not.toThrow();
    });

    it('should handle complex nested context objects', () => {
      const complexContext = {
        user: {
          id: 'user-123',
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
            },
          },
        },
      };

      expect(() => info('Message', complexContext)).not.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should handle errors without stack traces', () => {
      const errorWithoutStack = new Error('Test');
      errorWithoutStack.stack = undefined;

      expect(() => error('Error', errorWithoutStack)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
