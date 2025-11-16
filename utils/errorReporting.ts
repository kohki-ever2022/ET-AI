/**
 * Error Reporting Service
 *
 * Integration with error tracking services (e.g., Sentry):
 * - Error capture and reporting
 * - User context tracking
 * - Breadcrumb tracking
 * - Performance monitoring
 * - Release tracking
 */

import env from '../config/environment';

interface ErrorContext {
  userId?: string;
  projectId?: string;
  componentName?: string;
  actionName?: string;
  [key: string]: any;
}

interface Breadcrumb {
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  timestamp: number;
  data?: Record<string, any>;
}

class ErrorReportingService {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 100;
  private userContext: ErrorContext = {};

  /**
   * Initialize error reporting service
   */
  initialize(): void {
    if (!env.features.errorReporting) {
      console.log('Error reporting disabled');
      return;
    }

    if (!env.monitoring.sentryDsn) {
      console.warn('Sentry DSN not configured');
      return;
    }

    // Example: Initialize Sentry
    // Sentry.init({
    //   dsn: env.monitoring.sentryDsn,
    //   environment: env.environment,
    //   release: `et-ai@${import.meta.env.VITE_APP_VERSION || 'unknown'}`,
    //   tracesSampleRate: env.isProduction ? 0.1 : 1.0,
    //   beforeSend: this.beforeSend.bind(this),
    // });

    console.log('Error reporting initialized');
  }

  /**
   * Filter/modify error before sending
   */
  private beforeSend(event: any, hint: any): any {
    // Filter out certain errors
    if (this.shouldIgnoreError(hint.originalException)) {
      return null;
    }

    // Add breadcrumbs
    event.breadcrumbs = this.breadcrumbs;

    return event;
  }

  /**
   * Check if error should be ignored
   */
  private shouldIgnoreError(error: any): boolean {
    // Ignore network errors in development
    if (env.isDevelopment && error?.message?.includes('Failed to fetch')) {
      return true;
    }

    // Ignore certain error types
    const ignoreList = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ];

    return ignoreList.some((msg) => error?.message?.includes(msg));
  }

  /**
   * Set user context
   */
  setUser(userId: string, email?: string, username?: string): void {
    this.userContext = {
      userId,
      email,
      username,
    };

    // Example: Set Sentry user context
    // Sentry.setUser({
    //   id: userId,
    //   email,
    //   username,
    // });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.userContext = {};

    // Example: Clear Sentry user context
    // Sentry.setUser(null);
  }

  /**
   * Set additional context
   */
  setContext(key: string, value: any): void {
    // Example: Set Sentry context
    // Sentry.setContext(key, value);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    // Example: Add to Sentry
    // Sentry.addBreadcrumb({
    //   message: breadcrumb.message,
    //   category: breadcrumb.category,
    //   level: breadcrumb.level,
    //   timestamp: breadcrumb.timestamp,
    //   data: breadcrumb.data,
    // });
  }

  /**
   * Capture error
   */
  captureError(error: Error, context?: ErrorContext): void {
    if (!env.features.errorReporting) {
      console.error('Error (reporting disabled):', error, context);
      return;
    }

    // Add error breadcrumb
    this.addBreadcrumb({
      message: error.message,
      category: 'error',
      level: 'error',
      timestamp: Date.now(),
      data: context,
    });

    // Example: Capture in Sentry
    // Sentry.captureException(error, {
    //   contexts: {
    //     custom: context,
    //   },
    //   tags: {
    //     componentName: context?.componentName,
    //     actionName: context?.actionName,
    //   },
    // });

    console.error('Error reported:', error, context);
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (!env.features.errorReporting) {
      console.log(`Message (${level}):`, message, context);
      return;
    }

    // Add message breadcrumb
    this.addBreadcrumb({
      message,
      category: 'message',
      level,
      timestamp: Date.now(),
      data: context,
    });

    // Example: Capture in Sentry
    // Sentry.captureMessage(message, {
    //   level,
    //   contexts: {
    //     custom: context,
    //   },
    // });

    console.log(`Message reported (${level}):`, message, context);
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string): void {
    this.addBreadcrumb({
      message: `Navigation: ${from} → ${to}`,
      category: 'navigation',
      level: 'info',
      timestamp: Date.now(),
      data: { from, to },
    });
  }

  /**
   * Track user action
   */
  trackAction(action: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      message: `Action: ${action}`,
      category: 'user',
      level: 'info',
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Track API call
   */
  trackApiCall(method: string, url: string, statusCode?: number): void {
    this.addBreadcrumb({
      message: `API: ${method} ${url}`,
      category: 'api',
      level: statusCode && statusCode >= 400 ? 'error' : 'info',
      timestamp: Date.now(),
      data: {
        method,
        url,
        statusCode,
      },
    });
  }

  /**
   * Wrap async function with error reporting
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(error as Error, context);
        throw error;
      }
    }) as T;
  }

  /**
   * Create error boundary handler
   */
  createErrorBoundaryHandler(componentName: string) {
    return (error: Error, errorInfo: any) => {
      this.captureError(error, {
        componentName,
        componentStack: errorInfo.componentStack,
      });
    };
  }
}

// Export singleton instance
export const errorReporting = new ErrorReportingService();

// Export convenience functions
export const initializeErrorReporting = errorReporting.initialize.bind(errorReporting);
export const setUser = errorReporting.setUser.bind(errorReporting);
export const clearUser = errorReporting.clearUser.bind(errorReporting);
export const setContext = errorReporting.setContext.bind(errorReporting);
export const addBreadcrumb = errorReporting.addBreadcrumb.bind(errorReporting);
export const captureError = errorReporting.captureError.bind(errorReporting);
export const captureMessage = errorReporting.captureMessage.bind(errorReporting);
export const trackNavigation = errorReporting.trackNavigation.bind(errorReporting);
export const trackAction = errorReporting.trackAction.bind(errorReporting);
export const trackApiCall = errorReporting.trackApiCall.bind(errorReporting);
export const wrapAsync = errorReporting.wrapAsync.bind(errorReporting);
export const createErrorBoundaryHandler = errorReporting.createErrorBoundaryHandler.bind(errorReporting);

export default errorReporting;
