/**
 * Performance Monitoring Service Tests
 *
 * Tests for Firebase Performance monitoring service
 */

// Mock logger first
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  warn: jest.fn(),
}));

// Mock Firebase Performance
jest.mock('firebase/performance', () => ({
  getPerformance: jest.fn(() => ({
    app: {},
  })),
  trace: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    putMetric: jest.fn(),
    incrementMetric: jest.fn(),
    putAttribute: jest.fn(),
  })),
}));

jest.mock('../../config/firebase', () => ({
  app: {},
}));

jest.mock('../../config/environment', () => ({
  env: {
    isDevelopment: false,
    features: {
      debugMode: false,
    },
    monitoring: {
      logLevel: 'info',
    },
  },
}));

import {
  PerformanceTrace,
  trackClaudeAPICall,
  trackVectorSearch,
  trackFileUpload,
  trackDocumentProcessing,
  trackAuthentication,
  trackFirestoreOperation,
  trackPageLoad,
  startTrace,
  measureSync,
  measureAsync,
} from '../../services/performanceMonitoring';

describe('PerformanceTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a trace', () => {
    const trace = new PerformanceTrace('test_trace');
    expect(trace).toBeDefined();
  });

  it('should put a metric', () => {
    const trace = new PerformanceTrace('test_trace');
    trace.putMetric('test_metric', 100);
    // No error should be thrown
  });

  it('should increment a metric', () => {
    const trace = new PerformanceTrace('test_trace');
    trace.incrementMetric('test_metric', 5);
    trace.incrementMetric('test_metric'); // default increment by 1
    // No error should be thrown
  });

  it('should put an attribute', () => {
    const trace = new PerformanceTrace('test_trace');
    trace.putAttribute('test_attr', 'test_value');
    // No error should be thrown
  });

  it('should stop the trace', () => {
    const trace = new PerformanceTrace('test_trace');
    trace.stop();
    // No error should be thrown
  });

  it('should handle error when starting trace', () => {
    const { trace: mockTrace } = require('firebase/performance');
    mockTrace.mockImplementationOnce(() => {
      throw new Error('Failed to create trace');
    });

    const trace = new PerformanceTrace('error_trace');
    expect(trace).toBeDefined();
    // Should not throw, error is caught
  });

  it('should handle error when putting metric', () => {
    const { trace: mockTrace } = require('firebase/performance');
    mockTrace.mockReturnValueOnce({
      start: jest.fn(),
      stop: jest.fn(),
      putMetric: jest.fn(() => {
        throw new Error('Failed to put metric');
      }),
      incrementMetric: jest.fn(),
      putAttribute: jest.fn(),
    });

    const trace = new PerformanceTrace('test_trace');
    trace.putMetric('test_metric', 100);
    // Should not throw, error is caught
  });

  it('should handle error when incrementing metric', () => {
    const { trace: mockTrace } = require('firebase/performance');
    mockTrace.mockReturnValueOnce({
      start: jest.fn(),
      stop: jest.fn(),
      putMetric: jest.fn(),
      incrementMetric: jest.fn(() => {
        throw new Error('Failed to increment metric');
      }),
      putAttribute: jest.fn(),
    });

    const trace = new PerformanceTrace('test_trace');
    trace.incrementMetric('test_metric', 5);
    // Should not throw, error is caught
  });

  it('should handle error when putting attribute', () => {
    const { trace: mockTrace } = require('firebase/performance');
    mockTrace.mockReturnValueOnce({
      start: jest.fn(),
      stop: jest.fn(),
      putMetric: jest.fn(),
      incrementMetric: jest.fn(),
      putAttribute: jest.fn(() => {
        throw new Error('Failed to put attribute');
      }),
    });

    const trace = new PerformanceTrace('test_trace');
    trace.putAttribute('test_attr', 'value');
    // Should not throw, error is caught
  });

  it('should handle error when stopping trace', () => {
    const { trace: mockTrace } = require('firebase/performance');
    mockTrace.mockReturnValueOnce({
      start: jest.fn(),
      stop: jest.fn(() => {
        throw new Error('Failed to stop trace');
      }),
      putMetric: jest.fn(),
      incrementMetric: jest.fn(),
      putAttribute: jest.fn(),
    });

    const trace = new PerformanceTrace('test_trace');
    trace.stop();
    // Should not throw, error is caught
  });
});

describe('trackClaudeAPICall', () => {
  it('should track successful API call', async () => {
    const mockOperation = jest.fn().mockResolvedValue({ success: true });
    const result = await trackClaudeAPICall(mockOperation, {
      projectId: 'test-project',
      modelUsed: 'claude-sonnet-4',
      inputTokens: 100,
      outputTokens: 50,
      cacheHitRate: 0.8,
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('should track failed API call', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('API Error'));

    await expect(
      trackClaudeAPICall(mockOperation, {
        projectId: 'test-project',
      })
    ).rejects.toThrow('API Error');

    expect(mockOperation).toHaveBeenCalled();
  });
});

describe('trackVectorSearch', () => {
  it('should track successful vector search', async () => {
    const mockOperation = jest.fn().mockResolvedValue({ results: [] });
    const result = await trackVectorSearch(mockOperation, {
      projectId: 'test-project',
      queryLength: 20,
      resultCount: 5,
      threshold: 0.7,
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ results: [] });
  });

  it('should track failed vector search', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Search Error'));

    await expect(
      trackVectorSearch(mockOperation)
    ).rejects.toThrow('Search Error');
  });
});

describe('trackFileUpload', () => {
  it('should track successful file upload', async () => {
    const mockOperation = jest.fn().mockResolvedValue({ fileId: 'test-123' });
    const result = await trackFileUpload(mockOperation, {
      fileSize: 1024000,
      fileType: 'application/pdf',
      processingType: 'document',
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ fileId: 'test-123' });
  });

  it('should track failed file upload', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Upload Error'));

    await expect(
      trackFileUpload(mockOperation)
    ).rejects.toThrow('Upload Error');
  });
});

describe('trackDocumentProcessing', () => {
  it('should track successful document processing', async () => {
    const mockOperation = jest.fn().mockResolvedValue({ success: true });
    const result = await trackDocumentProcessing(mockOperation, {
      documentId: 'doc-123',
      documentType: 'pdf',
      pageCount: 10,
      chunkCount: 50,
      embeddingGeneration: true,
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('should track failed document processing', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Processing Error'));

    await expect(
      trackDocumentProcessing(mockOperation, {
        documentId: 'doc-123',
      })
    ).rejects.toThrow('Processing Error');

    expect(mockOperation).toHaveBeenCalled();
  });
});

describe('trackAuthentication', () => {
  it('should track successful authentication', async () => {
    const mockOperation = jest.fn().mockResolvedValue({ user: { uid: 'test-123' } });
    const result = await trackAuthentication(mockOperation, {
      authType: 'login',
      provider: 'google',
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ user: { uid: 'test-123' } });
  });

  it('should track failed authentication', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Auth Error'));

    await expect(
      trackAuthentication(mockOperation, {
        authType: 'login',
      })
    ).rejects.toThrow('Auth Error');

    expect(mockOperation).toHaveBeenCalled();
  });
});

describe('trackFirestoreOperation', () => {
  it('should track successful Firestore operation', async () => {
    const mockOperation = jest.fn().mockResolvedValue({ docs: [] });
    const result = await trackFirestoreOperation(mockOperation, {
      operationType: 'query',
      collection: 'projects',
      documentCount: 10,
    });

    expect(mockOperation).toHaveBeenCalled();
    expect(result).toEqual({ docs: [] });
  });

  it('should track failed Firestore operation', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Firestore Error'));

    await expect(
      trackFirestoreOperation(mockOperation, {
        operationType: 'write',
      })
    ).rejects.toThrow('Firestore Error');

    expect(mockOperation).toHaveBeenCalled();
  });
});

describe('startTrace', () => {
  it('should start a custom trace', () => {
    const trace = startTrace('custom_trace');
    expect(trace).toBeDefined();
    trace.stop();
  });
});

describe('measureSync', () => {
  it('should measure synchronous function execution', () => {
    const mockFn = jest.fn(() => 42);
    const result = measureSync(mockFn, 'test_sync', {
      operation: 'test',
    });

    expect(mockFn).toHaveBeenCalled();
    expect(result).toBe(42);
  });

  it('should handle synchronous function errors', () => {
    const mockFn = jest.fn(() => {
      throw new Error('Sync Error');
    });

    expect(() => measureSync(mockFn, 'test_sync')).toThrow('Sync Error');
  });
});

describe('measureAsync', () => {
  it('should measure asynchronous function execution', async () => {
    const mockFn = jest.fn().mockResolvedValue(42);
    const result = await measureAsync(mockFn, 'test_async', {
      operation: 'test',
    });

    expect(mockFn).toHaveBeenCalled();
    expect(result).toBe(42);
  });

  it('should handle asynchronous function errors', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Async Error'));

    await expect(measureAsync(mockFn, 'test_async')).rejects.toThrow('Async Error');
  });
});

describe('trackPageLoad', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track page load without metadata', () => {
    trackPageLoad('home_page');
    // Should complete without errors
    jest.advanceTimersByTime(100);
  });

  it('should track page load with metadata', () => {
    trackPageLoad('dashboard_page', {
      userRole: 'admin',
      projectCount: '5',
    });
    // Should complete without errors
    jest.advanceTimersByTime(100);
  });

  it('should automatically stop trace after delay', () => {
    trackPageLoad('test_page');

    // Verify timer was set
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    // Fast-forward time to trigger stop
    jest.advanceTimersByTime(100);
  });
});
