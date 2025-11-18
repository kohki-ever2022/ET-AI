/**
 * Logging Utility
 *
 * Centralized logging with support for:
 * - Multiple log levels
 * - Cloud Logging integration
 * - Error tracking
 * - Performance metrics
 * - Structured logging
 */

import env from '../config/environment';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  projectId?: string;
  channelId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private context: LogContext = {};

  constructor() {
    this.logLevel = this.parseLogLevel(env.monitoring.logLevel);
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = error;
      entry.stack = error.stack;
    }

    return entry;
  }

  /**
   * Format log entry for console
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ];

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    if (entry.stack) {
      parts.push(`\n${entry.stack}`);
    }

    return parts.join(' ');
  }

  /**
   * Send log to Cloud Logging
   */
  private async sendToCloudLogging(entry: LogEntry): Promise<void> {
    if (!env.features.errorReporting) {
      return;
    }

    try {
      // In production, this would send to Cloud Logging API
      // For now, we'll just log to console in production mode
      if (env.isProduction) {
        // Example: Send to Cloud Logging endpoint
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(entry),
        // });
      }
    } catch (error) {
      console.error('Failed to send log to Cloud Logging:', error);
    }
  }

  /**
   * Set global context for all logs
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    console.debug(this.formatLogEntry(entry));
    this.sendToCloudLogging(entry);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    console.info(this.formatLogEntry(entry));
    this.sendToCloudLogging(entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn(this.formatLogEntry(entry));
    this.sendToCloudLogging(entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    console.error(this.formatLogEntry(entry));
    this.sendToCloudLogging(entry);

    // Send to error tracking service (e.g., Sentry)
    this.reportError(error || new Error(message), context);
  }

  /**
   * Report error to tracking service
   */
  private reportError(error: Error, context?: LogContext): void {
    if (!env.features.errorReporting || !env.monitoring.sentryDsn) {
      return;
    }

    try {
      // Example: Send to Sentry
      // Sentry.captureException(error, {
      //   contexts: { custom: context },
      // });
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }

  /**
   * Log performance metric
   */
  performance(metricName: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${metricName} completed in ${duration}ms`, {
      ...context,
      metric: metricName,
      duration,
    });
  }

  /**
   * Create a timer for performance tracking
   */
  startTimer(metricName: string): () => void {
    // Fallback for Node.js environment where performance.now might not be available
    const perfNow = typeof performance !== 'undefined' && performance.now
      ? performance.now.bind(performance)
      : Date.now.bind(Date);

    const startTime = perfNow();

    return (context?: LogContext) => {
      const duration = perfNow() - startTime;
      this.performance(metricName, duration, context);
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const performance = logger.performance.bind(logger);
export const startTimer = logger.startTimer.bind(logger);
export const setContext = logger.setContext.bind(logger);
export const clearContext = logger.clearContext.bind(logger);

export default logger;
