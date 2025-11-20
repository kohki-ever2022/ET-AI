/**
 * Firebase Performance Monitoring Service
 *
 * Tracks application performance metrics including:
 * - API call durations
 * - File upload/processing times
 * - Vector search performance
 * - UI rendering performance
 */

import { getPerformance, trace as createTrace } from 'firebase/performance';
import { app } from '../config/firebase';
import { logger, warn } from '../utils/logger';
import { env } from '../config/environment';

// Type for Firebase Performance Trace
type FirebaseTrace = ReturnType<typeof createTrace>;

// Initialize Firebase Performance
let performance: ReturnType<typeof getPerformance> | null = null;

try {
  if (!env.isDevelopment) {
    performance = getPerformance(app);
  }
} catch (error) {
  console.warn('Failed to initialize Firebase Performance:', error);
}

/**
 * Custom metrics for tracking
 */
export interface PerformanceMetrics {
  [key: string]: number;
}

/**
 * Custom attributes for traces
 */
export interface PerformanceAttributes {
  [key: string]: string;
}

/**
 * Performance trace wrapper with automatic error handling
 */
export class PerformanceTrace {
  private trace: FirebaseTrace | null = null;
  private startTime: number;
  private name: string;
  private metrics: PerformanceMetrics = {};
  private attributes: PerformanceAttributes = {};

  constructor(traceName: string) {
    this.name = traceName;
    this.startTime = Date.now();

    try {
      if (performance) {
        this.trace = createTrace(performance, traceName);
        this.trace.start();
      }
    } catch (error) {
      warn('Failed to start performance trace', { traceName, error });
    }
  }

  /**
   * Adds a custom metric to the trace
   */
  putMetric(metricName: string, value: number): void {
    this.metrics[metricName] = value;

    try {
      if (this.trace) {
        this.trace.putMetric(metricName, value);
      }
    } catch (error) {
      warn('Failed to put metric', { metricName, value, error });
    }
  }

  /**
   * Increments a metric by a specified amount
   */
  incrementMetric(metricName: string, incrementBy: number = 1): void {
    this.metrics[metricName] = (this.metrics[metricName] || 0) + incrementBy;

    try {
      if (this.trace) {
        this.trace.incrementMetric(metricName, incrementBy);
      }
    } catch (error) {
      warn('Failed to increment metric', { metricName, incrementBy, error });
    }
  }

  /**
   * Adds a custom attribute to the trace
   */
  putAttribute(attributeName: string, value: string): void {
    this.attributes[attributeName] = value;

    try {
      if (this.trace) {
        this.trace.putAttribute(attributeName, value);
      }
    } catch (error) {
      warn('Failed to put attribute', { attributeName, value, error });
    }
  }

  /**
   * Stops the trace and records the duration
   */
  stop(): void {
    const duration = Date.now() - this.startTime;

    try {
      if (this.trace) {
        this.trace.stop();
      }

      // Log to console in development
      if (env.features.debugMode) {
        logger.debug('Performance trace completed', {
          name: this.name,
          duration,
          metrics: this.metrics,
          attributes: this.attributes,
        });
      }
    } catch (error) {
      warn('Failed to stop performance trace', { name: this.name, error });
    }
  }
}

/**
 * Tracks Claude API call performance
 */
export async function trackClaudeAPICall<T>(
  operation: () => Promise<T>,
  metadata?: {
    projectId?: string;
    modelUsed?: string;
    inputTokens?: number;
    outputTokens?: number;
    cacheHitRate?: number;
  }
): Promise<T> {
  const trace = new PerformanceTrace('claude_api_call');

  if (metadata) {
    if (metadata.projectId) trace.putAttribute('project_id', metadata.projectId);
    if (metadata.modelUsed) trace.putAttribute('model', metadata.modelUsed);
  }

  try {
    const result = await operation();

    if (metadata) {
      if (metadata.inputTokens) trace.putMetric('input_tokens', metadata.inputTokens);
      if (metadata.outputTokens) trace.putMetric('output_tokens', metadata.outputTokens);
      if (metadata.cacheHitRate !== undefined) {
        trace.putMetric('cache_hit_rate', metadata.cacheHitRate * 100);
      }
    }

    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    trace.putAttribute('error_type', error instanceof Error ? error.name : 'unknown');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Tracks vector search performance
 */
export async function trackVectorSearch<T>(
  operation: () => Promise<T>,
  metadata?: {
    projectId?: string;
    queryLength?: number;
    resultCount?: number;
    threshold?: number;
  }
): Promise<T> {
  const trace = new PerformanceTrace('vector_search');

  if (metadata) {
    if (metadata.projectId) trace.putAttribute('project_id', metadata.projectId);
    if (metadata.threshold !== undefined) {
      trace.putMetric('threshold', metadata.threshold * 100);
    }
    if (metadata.queryLength) trace.putMetric('query_length', metadata.queryLength);
  }

  try {
    const result = await operation();

    if (metadata?.resultCount !== undefined) {
      trace.putMetric('result_count', metadata.resultCount);
    }

    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Tracks file upload performance
 */
export async function trackFileUpload<T>(
  operation: () => Promise<T>,
  metadata?: {
    fileSize?: number;
    fileType?: string;
    processingType?: string;
  }
): Promise<T> {
  const trace = new PerformanceTrace('file_upload');

  if (metadata) {
    if (metadata.fileType) trace.putAttribute('file_type', metadata.fileType);
    if (metadata.processingType) trace.putAttribute('processing_type', metadata.processingType);
    if (metadata.fileSize) trace.putMetric('file_size_bytes', metadata.fileSize);
  }

  try {
    const result = await operation();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Tracks document processing performance
 */
export async function trackDocumentProcessing<T>(
  operation: () => Promise<T>,
  metadata?: {
    documentId?: string;
    documentType?: string;
    pageCount?: number;
    chunkCount?: number;
    embeddingGeneration?: boolean;
  }
): Promise<T> {
  const trace = new PerformanceTrace('document_processing');

  if (metadata) {
    if (metadata.documentId) trace.putAttribute('document_id', metadata.documentId);
    if (metadata.documentType) trace.putAttribute('document_type', metadata.documentType);
    if (metadata.pageCount) trace.putMetric('page_count', metadata.pageCount);
    if (metadata.chunkCount) trace.putMetric('chunk_count', metadata.chunkCount);
    if (metadata.embeddingGeneration !== undefined) {
      trace.putAttribute('embedding_generation', metadata.embeddingGeneration.toString());
    }
  }

  try {
    const result = await operation();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Tracks authentication operations
 */
export async function trackAuthentication<T>(
  operation: () => Promise<T>,
  metadata?: {
    authType?: 'login' | 'logout' | 'signup' | 'refresh';
    provider?: string;
  }
): Promise<T> {
  const trace = new PerformanceTrace('authentication');

  if (metadata) {
    if (metadata.authType) trace.putAttribute('auth_type', metadata.authType);
    if (metadata.provider) trace.putAttribute('provider', metadata.provider);
  }

  try {
    const result = await operation();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Tracks Firestore operations
 */
export async function trackFirestoreOperation<T>(
  operation: () => Promise<T>,
  metadata?: {
    operationType?: 'read' | 'write' | 'delete' | 'query';
    collection?: string;
    documentCount?: number;
  }
): Promise<T> {
  const trace = new PerformanceTrace('firestore_operation');

  if (metadata) {
    if (metadata.operationType) trace.putAttribute('operation_type', metadata.operationType);
    if (metadata.collection) trace.putAttribute('collection', metadata.collection);
    if (metadata.documentCount) trace.putMetric('document_count', metadata.documentCount);
  }

  try {
    const result = await operation();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Tracks page load performance
 */
export function trackPageLoad(pageName: string, metadata?: Record<string, string>): void {
  const trace = new PerformanceTrace(`page_load_${pageName}`);

  trace.putAttribute('page_name', pageName);

  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      trace.putAttribute(key, value);
    });
  }

  // Automatically stop after a short delay to capture initial load
  setTimeout(() => {
    trace.stop();
  }, 100);
}

/**
 * Creates a custom trace for manual control
 */
export function startTrace(traceName: string): PerformanceTrace {
  return new PerformanceTrace(traceName);
}

/**
 * Utility to measure sync function execution time
 */
export function measureSync<T>(
  fn: () => T,
  traceName: string,
  attributes?: PerformanceAttributes
): T {
  const trace = new PerformanceTrace(traceName);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      trace.putAttribute(key, value);
    });
  }

  try {
    const result = fn();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}

/**
 * Utility to measure async function execution time
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  traceName: string,
  attributes?: PerformanceAttributes
): Promise<T> {
  const trace = new PerformanceTrace(traceName);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      trace.putAttribute(key, value);
    });
  }

  try {
    const result = await fn();
    trace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    trace.putAttribute('status', 'error');
    throw error;
  } finally {
    trace.stop();
  }
}
