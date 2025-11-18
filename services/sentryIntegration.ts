/**
 * Sentry Integration
 *
 * Complete integration with Sentry for error tracking and performance monitoring.
 * This module handles initialization, configuration, and custom integrations.
 */

// NOTE: To use this module, install Sentry SDK:
// npm install --save @sentry/react

// Uncomment when Sentry SDK is installed:
/*
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { env } from '../config/environment';

export function initializeSentry(): void {
  if (!env.features.errorReporting) {
    console.log('Sentry error reporting disabled by feature flag');
    return;
  }

  if (!env.monitoring.sentryDsn) {
    console.warn('Sentry DSN not configured. Skipping Sentry initialization.');
    return;
  }

  try {
    Sentry.init({
      dsn: env.monitoring.sentryDsn,
      environment: env.environment,
      release: `et-ai@${import.meta.env.VITE_APP_VERSION || 'unknown'}`,

      // Performance Monitoring
      integrations: [
        new BrowserTracing({
          // Set sampling rate for transaction traces
          tracingOrigins: ['localhost', /^\//],
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            // This requires React Router v6
            // Pass history object if using
          ),
        }),
      ],

      // Performance Monitoring sample rate
      // Capture 100% of transactions in development, 10% in production
      tracesSampleRate: env.isDevelopment ? 1.0 : 0.1,

      // Before sending events, filter and enrich
      beforeSend(event, hint) {
        // Filter out errors we don't want to track
        if (shouldIgnoreError(hint.originalException)) {
          return null;
        }

        // Add additional context
        if (event.contexts) {
          event.contexts.environment = {
            isDevelopment: env.isDevelopment,
            isStaging: env.isStaging,
            isProduction: env.isProduction,
          };
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',

        // Network errors
        'Failed to fetch',
        'NetworkError',
        'Network request failed',

        // ResizeObserver errors (common in React apps)
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',

        // Common non-errors
        'Non-Error promise rejection captured',
        'Non-Error exception captured',

        // Aborted requests (user navigation)
        'AbortError',
        'Request aborted',
      ],

      // Configure sampling
      beforeBreadcrumb(breadcrumb, hint) {
        // Don't log console breadcrumbs in production (can be noisy)
        if (env.isProduction && breadcrumb.category === 'console') {
          return null;
        }

        return breadcrumb;
      },

      // Max breadcrumbs to keep
      maxBreadcrumbs: 100,

      // Attach stacktraces to messages
      attachStacktrace: true,

      // Enable auto session tracking
      autoSessionTracking: true,

      // Enable capturing unhandled promise rejections
      onunhandledrejection: true,
    });

    console.log('Sentry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

function shouldIgnoreError(error: any): boolean {
  if (!error) return true;

  const errorMessage = error.message || '';
  const errorStack = error.stack || '';

  // Ignore development-only errors
  if (env.isDevelopment) {
    if (errorMessage.includes('Failed to fetch')) return true;
    if (errorMessage.includes('Load failed')) return true;
  }

  // Ignore browser extension errors
  if (errorStack.includes('chrome-extension://')) return true;
  if (errorStack.includes('moz-extension://')) return true;

  // Ignore cancelled/aborted requests
  if (errorMessage.includes('cancelled') || errorMessage.includes('aborted')) {
    return true;
  }

  return false;
}

// Export Sentry for use in components
export { Sentry };
*/

/**
 * Placeholder implementation when Sentry SDK is not installed
 */
export function initializeSentry(): void {
  console.log(
    'Sentry integration prepared. Install @sentry/react to enable error tracking.'
  );
  console.log('Run: npm install --save @sentry/react');
}

// Placeholder Sentry object
export const Sentry = {
  captureException: (error: Error, context?: any) => {
    console.error('Sentry (placeholder):', error, context);
  },
  captureMessage: (message: string, level?: string) => {
    console.log(`Sentry message (${level}):`, message);
  },
  setUser: (user: any) => {
    console.log('Sentry user set:', user);
  },
  setContext: (key: string, value: any) => {
    console.log(`Sentry context [${key}]:`, value);
  },
  addBreadcrumb: (breadcrumb: any) => {
    console.log('Sentry breadcrumb:', breadcrumb);
  },
  withScope: (callback: (scope: any) => void) => {
    const mockScope = {
      setTag: (key: string, value: string) => console.log(`Tag: ${key}=${value}`),
      setContext: (key: string, value: any) => console.log(`Context: ${key}`, value),
      setLevel: (level: string) => console.log(`Level: ${level}`),
    };
    callback(mockScope);
  },
};

/**
 * Test Sentry integration by sending a test error
 */
export function testSentryIntegration(): void {
  console.log('Testing Sentry integration...');

  try {
    // Test breadcrumbs
    Sentry.addBreadcrumb({
      message: 'Test breadcrumb',
      category: 'test',
      level: 'info',
    });

    // Test message
    Sentry.captureMessage('Sentry test message', 'info');

    // Test error (this will show in console with placeholder)
    try {
      throw new Error('Sentry integration test error');
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          test: 'true',
          source: 'integration-test',
        },
        extra: {
          testData: 'This is a test error to verify Sentry integration',
        },
      });
    }

    console.log(
      'Sentry integration test complete. Check Sentry dashboard for test events.'
    );
  } catch (error) {
    console.error('Sentry integration test failed:', error);
  }
}

/**
 * Performance monitoring helpers
 */
export const SentryPerformance = {
  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, op: string): any {
    console.log(`Starting transaction: ${name} (${op})`);
    return {
      setName: (newName: string) => console.log(`Transaction name set: ${newName}`),
      setStatus: (status: string) => console.log(`Transaction status: ${status}`),
      setTag: (key: string, value: string) => console.log(`Tag: ${key}=${value}`),
      setData: (key: string, value: any) => console.log(`Data: ${key}`, value),
      finish: () => console.log(`Transaction finished: ${name}`),
    };
  },

  /**
   * Create a span for detailed performance tracking
   */
  startSpan(transaction: any, op: string, description: string): any {
    console.log(`Starting span: ${op} - ${description}`);
    return {
      setTag: (key: string, value: string) => console.log(`Span tag: ${key}=${value}`),
      setData: (key: string, value: any) => console.log(`Span data: ${key}`, value),
      finish: () => console.log(`Span finished: ${description}`),
    };
  },
};

/**
 * Custom error classes for better categorization
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class FileProcessingError extends Error {
  constructor(
    message: string,
    public fileName?: string,
    public fileType?: string
  ) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

/**
 * Integration checklist for production deployment
 */
export const SENTRY_INTEGRATION_CHECKLIST = `
# Sentry Integration Checklist

## Installation
- [ ] Install @sentry/react: npm install --save @sentry/react
- [ ] Install @sentry/tracing: npm install --save @sentry/tracing (if not included)

## Configuration
- [ ] Create Sentry project at sentry.io
- [ ] Copy DSN from Sentry project settings
- [ ] Add VITE_SENTRY_DSN to .env.production
- [ ] Set VITE_ENABLE_ERROR_REPORTING=true in .env.production
- [ ] Add PROD_SENTRY_DSN to GitHub Secrets

## Code Integration
- [ ] Uncomment Sentry initialization in services/sentryIntegration.ts
- [ ] Uncomment Sentry code in utils/errorReporting.ts
- [ ] Call initializeSentry() in main.tsx or App.tsx
- [ ] Wrap App component with Sentry.ErrorBoundary

## Testing
- [ ] Test in development with test DSN
- [ ] Verify breadcrumbs are captured
- [ ] Verify errors are sent to Sentry
- [ ] Test performance monitoring
- [ ] Verify user context is set
- [ ] Test error filtering works

## Production
- [ ] Verify Sentry DSN is in production environment variables
- [ ] Deploy and test with real errors
- [ ] Set up alerts in Sentry dashboard
- [ ] Configure email notifications
- [ ] Set up Slack/Discord integration (optional)
- [ ] Review and tune sampling rates

## Monitoring
- [ ] Create Sentry dashboards for key metrics
- [ ] Set up issue ownership rules
- [ ] Configure release tracking
- [ ] Enable performance monitoring
- [ ] Set up custom tags for better filtering
`;

console.log(SENTRY_INTEGRATION_CHECKLIST);
