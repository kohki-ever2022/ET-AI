/**
 * Performance Monitoring Utilities
 *
 * Tracks Firestore read/write operations and measures cache effectiveness.
 * Helps validate the 85% read reduction goal.
 */

export interface PerformanceMetrics {
  // Firestore operations
  firestoreReads: number;
  firestoreWrites: number;
  firestoreDeletes: number;

  // Cache stats
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;

  // Timing
  totalDuration: number;
  averageQueryTime: number;

  // Cost estimation (USD)
  estimatedCost: number;
}

export interface OperationLog {
  timestamp: number;
  operation: 'read' | 'write' | 'delete' | 'cache-hit' | 'cache-miss';
  collection: string;
  documentId?: string;
  duration: number;
  count: number;
}

class PerformanceMonitor {
  private logs: OperationLog[] = [];
  private sessionStart: number = Date.now();

  /**
   * Log a Firestore operation
   */
  logOperation(
    operation: 'read' | 'write' | 'delete' | 'cache-hit' | 'cache-miss',
    collection: string,
    count: number = 1,
    documentId?: string
  ): void {
    const log: OperationLog = {
      timestamp: Date.now(),
      operation,
      collection,
      documentId,
      duration: 0, // Will be set by timing wrapper
      count,
    };

    this.logs.push(log);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Firestore] ${operation} ${collection}${documentId ? `/${documentId}` : ''} (count: ${count})`
      );
    }
  }

  /**
   * Wrap an async function with performance tracking
   */
  async measureAsync<T>(
    operation: 'read' | 'write' | 'delete',
    collection: string,
    fn: () => Promise<T>,
    count: number = 1
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      const log: OperationLog = {
        timestamp: start,
        operation,
        collection,
        duration,
        count,
      };

      this.logs.push(log);

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      const log: OperationLog = {
        timestamp: start,
        operation,
        collection,
        duration,
        count,
      };

      this.logs.push(log);

      throw error;
    }
  }

  /**
   * Get current session metrics
   */
  getMetrics(): PerformanceMetrics {
    const reads = this.logs.filter(l => l.operation === 'read');
    const writes = this.logs.filter(l => l.operation === 'write');
    const deletes = this.logs.filter(l => l.operation === 'delete');
    const cacheHits = this.logs.filter(l => l.operation === 'cache-hit');
    const cacheMisses = this.logs.filter(l => l.operation === 'cache-miss');

    const totalReads = reads.reduce((sum, log) => sum + log.count, 0);
    const totalWrites = writes.reduce((sum, log) => sum + log.count, 0);
    const totalDeletes = deletes.reduce((sum, log) => sum + log.count, 0);
    const totalCacheHits = cacheHits.reduce((sum, log) => sum + log.count, 0);
    const totalCacheMisses = cacheMisses.reduce((sum, log) => sum + log.count, 0);

    const totalCacheAttempts = totalCacheHits + totalCacheMisses;
    const cacheHitRate = totalCacheAttempts > 0 ? (totalCacheHits / totalCacheAttempts) * 100 : 0;

    const totalDuration = Date.now() - this.sessionStart;
    const queryCount = reads.length + writes.length + deletes.length;
    const averageQueryTime = queryCount > 0 ? this.logs.reduce((sum, log) => sum + log.duration, 0) / queryCount : 0;

    // Firestore pricing (approximate, us-central1)
    const readCost = totalReads * 0.00000036; // $0.36 per million
    const writeCost = totalWrites * 0.0000018; // $1.80 per million
    const deleteCost = totalDeletes * 0.0000002; // $0.20 per million
    const estimatedCost = readCost + writeCost + deleteCost;

    return {
      firestoreReads: totalReads,
      firestoreWrites: totalWrites,
      firestoreDeletes: totalDeletes,
      cacheHits: totalCacheHits,
      cacheMisses: totalCacheMisses,
      cacheHitRate,
      totalDuration,
      averageQueryTime,
      estimatedCost,
    };
  }

  /**
   * Get detailed logs
   */
  getLogs(): OperationLog[] {
    return [...this.logs];
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.logs = [];
    this.sessionStart = Date.now();
  }

  /**
   * Print metrics to console
   */
  printMetrics(): void {
    const metrics = this.getMetrics();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Firestore Performance Metrics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Operations:');
    console.log(`  Reads:   ${metrics.firestoreReads.toLocaleString()}`);
    console.log(`  Writes:  ${metrics.firestoreWrites.toLocaleString()}`);
    console.log(`  Deletes: ${metrics.firestoreDeletes.toLocaleString()}`);
    console.log('');
    console.log('Cache Performance:');
    console.log(`  Hits:     ${metrics.cacheHits.toLocaleString()}`);
    console.log(`  Misses:   ${metrics.cacheMisses.toLocaleString()}`);
    console.log(`  Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    console.log('');
    console.log('Timing:');
    console.log(`  Session Duration:  ${(metrics.totalDuration / 1000).toFixed(2)}s`);
    console.log(`  Avg Query Time:    ${metrics.averageQueryTime.toFixed(2)}ms`);
    console.log('');
    console.log('Cost Estimate:');
    console.log(`  Session Cost: $${metrics.estimatedCost.toFixed(6)}`);
    console.log(`  Monthly Est:  $${(metrics.estimatedCost * 30).toFixed(2)} (extrapolated)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        metrics: this.getMetrics(),
        logs: this.logs,
        sessionStart: this.sessionStart,
        sessionEnd: Date.now(),
      },
      null,
      2
    );
  }

  /**
   * Compare with baseline
   */
  compareWithBaseline(baseline: PerformanceMetrics): {
    readsReduction: number;
    writesReduction: number;
    costSavings: number;
    cacheImpact: number;
  } {
    const current = this.getMetrics();

    const readsReduction = baseline.firestoreReads > 0
      ? ((baseline.firestoreReads - current.firestoreReads) / baseline.firestoreReads) * 100
      : 0;

    const writesReduction = baseline.firestoreWrites > 0
      ? ((baseline.firestoreWrites - current.firestoreWrites) / baseline.firestoreWrites) * 100
      : 0;

    const costSavings = baseline.estimatedCost > 0
      ? ((baseline.estimatedCost - current.estimatedCost) / baseline.estimatedCost) * 100
      : 0;

    const cacheImpact = baseline.cacheHitRate > 0
      ? current.cacheHitRate - baseline.cacheHitRate
      : current.cacheHitRate;

    return {
      readsReduction,
      writesReduction,
      costSavings,
      cacheImpact,
    };
  }
}

// Global singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const getMetrics = () => performanceMonitor.getMetrics();
  const reset = () => performanceMonitor.reset();
  const print = () => performanceMonitor.printMetrics();

  return {
    logOperation: performanceMonitor.logOperation.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getMetrics,
    reset,
    print,
  };
}

/**
 * Higher-order function to wrap Firestore calls with monitoring
 */
export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: 'read' | 'write' | 'delete',
  collection: string
): T {
  return (async (...args: any[]) => {
    return performanceMonitor.measureAsync(operation, collection, () => fn(...args), 1);
  }) as T;
}
