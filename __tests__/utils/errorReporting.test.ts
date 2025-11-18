/**
 * Error Reporting Service Tests
 *
 * Tests for the error reporting and tracking service
 */

import errorReporter, {
  setUser,
  clearUser,
  setContext,
  addBreadcrumb,
  captureError,
  captureMessage,
} from '../../utils/errorReporting';

// Mock environment
jest.mock('../../config/environment', () => ({
  __esModule: true,
  default: {
    features: {
      errorReporting: true,
    },
    monitoring: {
      sentryDsn: 'https://test@sentry.io/123',
    },
    environment: 'test',
    isProduction: false,
    isDevelopment: true,
  },
}));

describe('Error Reporting Service', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => errorReporter.initialize()).not.toThrow();
    });
  });

  describe('User Context', () => {
    it('should set user context', () => {
      expect(() => {
        setUser('user-123', 'user@example.com', 'testuser');
      }).not.toThrow();
    });

    it('should clear user context', () => {
      setUser('user-123', 'user@example.com');
      expect(() => clearUser()).not.toThrow();
    });
  });

  describe('Context Management', () => {
    it('should set additional context', () => {
      expect(() => {
        setContext('feature', { name: 'test-feature', version: '1.0' });
      }).not.toThrow();
    });
  });

  describe('Breadcrumbs', () => {
    it('should add breadcrumb', () => {
      expect(() => {
        addBreadcrumb({
          message: 'User clicked button',
          category: 'ui',
          level: 'info',
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });

    it('should add breadcrumb with data', () => {
      expect(() => {
        addBreadcrumb({
          message: 'API call made',
          category: 'api',
          level: 'info',
          timestamp: Date.now(),
          data: { endpoint: '/api/users', method: 'GET' },
        });
      }).not.toThrow();
    });
  });

  describe('Error Capture', () => {
    it('should capture error', () => {
      const error = new Error('Test error');
      captureError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reported:',
        error,
        undefined
      );
    });

    it('should capture error with context', () => {
      const error = new Error('Test error with context');
      const context = {
        userId: 'user-123',
        projectId: 'project-456',
        componentName: 'TestComponent',
      };

      captureError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reported:',
        error,
        context
      );
    });
  });

  describe('Message Capture', () => {
    it('should capture info message', () => {
      captureMessage('Test info message', 'info');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Message reported (info):',
        'Test info message',
        undefined
      );
    });

    it('should capture warning message', () => {
      captureMessage('Test warning message', 'warning');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Message reported (warning):',
        'Test warning message',
        undefined
      );
    });

    it('should capture error message', () => {
      captureMessage('Test error message', 'error');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Message reported (error):',
        'Test error message',
        undefined
      );
    });

    it('should capture message with context', () => {
      const context = { feature: 'authentication' };
      captureMessage('Login attempted', 'info', context);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Message reported (info):',
        'Login attempted',
        context
      );
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle error without message', () => {
      const error = new Error();
      captureError(error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should handle complete error reporting flow', () => {
      // Set user
      setUser('user-123', 'user@example.com');

      // Set context
      setContext('page', { name: 'dashboard', url: '/dashboard' });

      // Add breadcrumbs
      addBreadcrumb({
        message: 'User navigated to dashboard',
        category: 'navigation',
        level: 'info',
        timestamp: Date.now(),
      });

      // Capture error
      const error = new Error('Dashboard load failed');
      captureError(error, {
        componentName: 'Dashboard',
        actionName: 'loadData',
      });

      // Verify no exceptions thrown
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
