/**
 * Logger Utility Tests
 *
 * Tests for the centralized logging utility
 * Testing philosophy: Test as specifications - what the logger should do for users
 */

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
    let mockPerformanceNow: jest.SpyInstance;
    let mockDateNow: jest.SpyInstance;
    let currentTime = 1000;

    beforeEach(() => {
      currentTime = 1000;
      mockPerformanceNow = jest.spyOn(global.performance, 'now').mockImplementation(() => {
        return currentTime;
      });
      mockDateNow = jest.spyOn(Date, 'now').mockImplementation(() => {
        return currentTime;
      });
    });

    afterEach(() => {
      mockPerformanceNow.mockRestore();
      mockDateNow.mockRestore();
    });

    it('should log performance metrics with duration', () => {
      const endTimer = startTimer('test-operation');

      // Advance mock time by 250ms
      currentTime += 250;

      // Simulate some work
      endTimer({ operation: 'test' });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('Performance');
      expect(logOutput).toContain('test-operation');
      expect(logOutput).toContain('completed in');
      expect(logOutput).toContain('ms');
    });

    it('should include performance context in metrics', () => {
      const endTimer = startTimer('api-call');

      // Advance mock time by 100ms
      currentTime += 100;

      endTimer({ endpoint: '/api/users', method: 'GET' });

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('endpoint');
      expect(logOutput).toContain('/api/users');
      expect(logOutput).toContain('method');
      expect(logOutput).toContain('GET');
    });

    it('should measure elapsed time accurately', () => {
      const endTimer = startTimer('timed-operation');

      // Advance mock time by 150ms
      currentTime += 150;

      endTimer();

      const logOutput = consoleInfoSpy.mock.calls[0][0];
      // The log should mention duration and the time value
      expect(logOutput).toContain('completed in');
      expect(logOutput).toContain('150');
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

  describe('Log Level Filtering - Specification: Logger should filter logs based on configured level', () => {
    it('should filter debug logs when level is info', () => {
      // Create a new logger with INFO level
      const { Logger: LoggerClass } = require('../../utils/logger');

      // Mock environment with INFO level
      jest.resetModules();
      jest.mock('../../config/environment', () => ({
        __esModule: true,
        default: {
          features: {
            errorReporting: false,
          },
          monitoring: {
            logLevel: 'info',
            sentryDsn: null,
          },
          isProduction: false,
          isDevelopment: true,
        },
      }));

      const { debug: debugFn, info: infoFn } = require('../../utils/logger');

      // Clear previous calls
      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();

      debugFn('Debug message');
      infoFn('Info message');

      // Debug should be filtered out
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      // Info should be logged
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should filter info and debug logs when level is warn', () => {
      jest.resetModules();
      jest.mock('../../config/environment', () => ({
        __esModule: true,
        default: {
          features: {
            errorReporting: false,
          },
          monitoring: {
            logLevel: 'warn',
            sentryDsn: null,
          },
          isProduction: false,
          isDevelopment: true,
        },
      }));

      const { debug: debugFn, info: infoFn, warn: warnFn } = require('../../utils/logger');

      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();
      consoleWarnSpy.mockClear();

      debugFn('Debug message');
      infoFn('Info message');
      warnFn('Warn message');

      // Debug and info should be filtered out
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      // Warn should be logged
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should only log errors when level is error', () => {
      jest.resetModules();
      jest.mock('../../config/environment', () => ({
        __esModule: true,
        default: {
          features: {
            errorReporting: false,
          },
          monitoring: {
            logLevel: 'error',
            sentryDsn: null,
          },
          isProduction: false,
          isDevelopment: true,
        },
      }));

      const { debug: debugFn, info: infoFn, warn: warnFn, error: errorFn } = require('../../utils/logger');

      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();

      debugFn('Debug message');
      infoFn('Info message');
      warnFn('Warn message');
      errorFn('Error message');

      // Only error should be logged
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle unknown log level by defaulting to info', () => {
      jest.resetModules();
      jest.mock('../../config/environment', () => ({
        __esModule: true,
        default: {
          features: {
            errorReporting: false,
          },
          monitoring: {
            logLevel: 'unknown-level',
            sentryDsn: null,
          },
          isProduction: false,
          isDevelopment: true,
        },
      }));

      const { debug: debugFn, info: infoFn } = require('../../utils/logger');

      consoleDebugSpy.mockClear();
      consoleInfoSpy.mockClear();

      debugFn('Debug message');
      infoFn('Info message');

      // Debug should be filtered out (default is INFO)
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      // Info should be logged
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Production Mode - Specification: Logger should handle production mode correctly', () => {
    it('should attempt to send logs to cloud logging in production', () => {
      jest.resetModules();
      jest.mock('../../config/environment', () => ({
        __esModule: true,
        default: {
          features: {
            errorReporting: true,
          },
          monitoring: {
            logLevel: 'info',
            sentryDsn: 'https://example.sentry.io',
          },
          isProduction: true,
          isDevelopment: false,
        },
      }));

      const { info: infoFn } = require('../../utils/logger');

      consoleInfoSpy.mockClear();

      // Should not throw even if cloud logging is not configured
      expect(() => infoFn('Production log')).not.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should not send to cloud logging when error reporting is disabled', () => {
      jest.resetModules();
      jest.mock('../../config/environment', () => ({
        __esModule: true,
        default: {
          features: {
            errorReporting: false,
          },
          monitoring: {
            logLevel: 'info',
            sentryDsn: null,
          },
          isProduction: true,
          isDevelopment: false,
        },
      }));

      const { info: infoFn } = require('../../utils/logger');

      consoleInfoSpy.mockClear();

      expect(() => infoFn('Production log')).not.toThrow();
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Direct Performance Method - Specification: Performance method should log metrics', () => {
    it('should log performance metrics directly using performance method', () => {
      const { performance: perfFn } = require('../../utils/logger');

      consoleInfoSpy.mockClear();

      perfFn('custom-metric', 123, { operation: 'test' });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const logOutput = consoleInfoSpy.mock.calls[0][0];
      expect(logOutput).toContain('Performance');
      expect(logOutput).toContain('custom-metric');
      expect(logOutput).toContain('123');
      expect(logOutput).toContain('operation');
      expect(logOutput).toContain('test');
    });
  });
});
