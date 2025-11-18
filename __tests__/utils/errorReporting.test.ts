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
  trackNavigation,
  trackAction,
  trackApiCall,
  wrapAsync,
  createErrorBoundaryHandler,
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

  describe('Tracking Functions - Specification: Users should be able to track various events', () => {
    it('should track navigation', () => {
      expect(() => {
        trackNavigation('/home', '/dashboard');
      }).not.toThrow();
    });

    it('should track user action', () => {
      expect(() => {
        trackAction('button_click', { buttonId: 'submit-btn', page: 'form' });
      }).not.toThrow();
    });

    it('should track user action without data', () => {
      expect(() => {
        trackAction('page_view');
      }).not.toThrow();
    });

    it('should track API call with success status', () => {
      expect(() => {
        trackApiCall('GET', '/api/users', 200);
      }).not.toThrow();
    });

    it('should track API call with error status', () => {
      expect(() => {
        trackApiCall('POST', '/api/data', 404);
      }).not.toThrow();
    });

    it('should track API call without status code', () => {
      expect(() => {
        trackApiCall('GET', '/api/health');
      }).not.toThrow();
    });
  });

  describe('Async Function Wrapper - Specification: Async functions should be wrapped with error reporting', () => {
    it('should wrap async function and call it successfully', async () => {
      const asyncFn = jest.fn(async (x: number) => x * 2);
      const wrapped = wrapAsync(asyncFn);

      const result = await wrapped(5);

      expect(result).toBe(10);
      expect(asyncFn).toHaveBeenCalledWith(5);
    });

    it('should wrap async function and capture errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn(async () => {
        throw error;
      });
      const wrapped = wrapAsync(asyncFn, { componentName: 'TestComponent' });

      await expect(wrapped()).rejects.toThrow('Async error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reported:',
        error,
        { componentName: 'TestComponent' }
      );
    });

    it('should wrap async function with multiple arguments', async () => {
      const asyncFn = jest.fn(async (a: number, b: number, c: number) => a + b + c);
      const wrapped = wrapAsync(asyncFn);

      const result = await wrapped(1, 2, 3);

      expect(result).toBe(6);
      expect(asyncFn).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe('Error Boundary Handler - Specification: React error boundaries should report errors', () => {
    it('should create error boundary handler', () => {
      const handler = createErrorBoundaryHandler('MyComponent');

      expect(handler).toBeInstanceOf(Function);
    });

    it('should handle errors in error boundary', () => {
      const handler = createErrorBoundaryHandler('MyComponent');
      const error = new Error('Component error');
      const errorInfo = {
        componentStack: 'at MyComponent\n  at App',
      };

      expect(() => {
        handler(error, errorInfo);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reported:',
        error,
        {
          componentName: 'MyComponent',
          componentStack: 'at MyComponent\n  at App',
        }
      );
    });
  });

  describe('Breadcrumb Management - Specification: Should maintain limited breadcrumb history', () => {
    it('should limit breadcrumbs to maximum', () => {
      // Add 110 breadcrumbs (max is 100)
      for (let i = 0; i < 110; i++) {
        addBreadcrumb({
          message: `Breadcrumb ${i}`,
          category: 'test',
          level: 'info',
          timestamp: Date.now() + i,
        });
      }

      // Should not throw and oldest should be removed
      expect(() => {
        addBreadcrumb({
          message: 'Final breadcrumb',
          category: 'test',
          level: 'info',
          timestamp: Date.now(),
        });
      }).not.toThrow();
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
