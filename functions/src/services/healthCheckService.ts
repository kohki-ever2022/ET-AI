/**
 * Health Check Service
 *
 * Monitors the health of all external services:
 * - Claude API
 * - Firestore Vector Search
 * - Voyage AI Embedding
 * - Firebase Storage
 *
 * Runs periodic health checks and detects degradation/outages.
 */

import { getFirestore, collection, addDoc, getDocs, query, limit, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { ServiceType, getErrorRate } from './errorHandler';

const db = getFirestore();

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface ServiceHealth {
  service: ServiceType;
  status: HealthStatus;
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  details?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  timestamp: Date;
  services: ServiceHealth[];
  overallStatus: HealthStatus;
}

// ============================================================================
// Health Checks
// ============================================================================

/**
 * Test Claude API health
 */
async function checkClaudeAPI(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Simple health check: just test if API key is valid
    // In production, you might want to make a minimal API call
    const Anthropic = require('@anthropic-ai/sdk').default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Make a minimal request to check connectivity
    // Using a very short message to minimize cost
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });

    const responseTime = Date.now() - startTime;
    const errorRate = await getErrorRate('claude', 5);

    let status: HealthStatus = 'healthy';
    if (errorRate > 0.1 || responseTime > 5000) status = 'degraded';
    if (errorRate > 0.5 || responseTime > 10000) status = 'down';

    return {
      service: 'claude',
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate,
      metadata: {
        model: 'claude-3-haiku-20240307',
      },
    };
  } catch (error: any) {
    return {
      service: 'claude',
      status: 'down',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 1.0,
      details: error.message || 'Claude API unavailable',
      metadata: {
        error: error.toString(),
      },
    };
  }
}

/**
 * Test Firestore health
 */
async function checkFirestore(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Simple read query to test Firestore
    const testQuery = query(collection(db, 'projects'), limit(1));
    await getDocs(testQuery);

    const responseTime = Date.now() - startTime;
    const errorRate = await getErrorRate('firestore', 5);

    let status: HealthStatus = 'healthy';
    if (errorRate > 0.1 || responseTime > 2000) status = 'degraded';
    if (errorRate > 0.5 || responseTime > 5000) status = 'down';

    return {
      service: 'firestore',
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate,
    };
  } catch (error: any) {
    return {
      service: 'firestore',
      status: 'down',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 1.0,
      details: error.message || 'Firestore unavailable',
    };
  }
}

/**
 * Test Voyage AI health
 */
async function checkVoyageAI(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Make a minimal embedding request
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: ['health check'],
        model: 'voyage-2',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseTime = Date.now() - startTime;
    const errorRate = await getErrorRate('voyage', 5);

    let status: HealthStatus = 'healthy';
    if (errorRate > 0.1 || responseTime > 3000) status = 'degraded';
    if (errorRate > 0.5 || responseTime > 10000) status = 'down';

    return {
      service: 'voyage',
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate,
      metadata: {
        model: 'voyage-2',
      },
    };
  } catch (error: any) {
    return {
      service: 'voyage',
      status: 'down',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 1.0,
      details: error.message || 'Voyage AI unavailable',
    };
  }
}

/**
 * Test Firebase Storage health
 */
async function checkFirebaseStorage(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    const bucket = getStorage().bucket();

    // Simple operation: list files (limit 1)
    await bucket.getFiles({ maxResults: 1 });

    const responseTime = Date.now() - startTime;
    const errorRate = await getErrorRate('storage', 5);

    let status: HealthStatus = 'healthy';
    if (errorRate > 0.1 || responseTime > 2000) status = 'degraded';
    if (errorRate > 0.5 || responseTime > 5000) status = 'down';

    return {
      service: 'storage',
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate,
    };
  } catch (error: any) {
    return {
      service: 'storage',
      status: 'down',
      lastCheck: new Date(),
      responseTime: Date.now() - startTime,
      errorRate: 1.0,
      details: error.message || 'Firebase Storage unavailable',
    };
  }
}

/**
 * Run comprehensive health check
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  logger.info('Running health check for all services');

  try {
    // Run all health checks in parallel
    const [claude, firestore, voyage, storage] = await Promise.all([
      checkClaudeAPI(),
      checkFirestore(),
      checkVoyageAI(),
      checkFirebaseStorage(),
    ]);

    const services = [claude, firestore, voyage, storage];

    // Determine overall status
    const hasDown = services.some((s) => s.status === 'down');
    const hasDegraded = services.some((s) => s.status === 'degraded');

    let overallStatus: HealthStatus = 'healthy';
    if (hasDegraded) overallStatus = 'degraded';
    if (hasDown) overallStatus = 'down';

    const result: HealthCheckResult = {
      timestamp: new Date(),
      services,
      overallStatus,
    };

    // Log result
    logger.info('Health check completed', {
      overallStatus,
      services: services.map((s) => ({
        service: s.service,
        status: s.status,
        responseTime: s.responseTime,
      })),
    });

    // Save to Firestore
    await saveHealthCheckResult(result);

    // Send alerts if needed
    await checkAndSendAlerts(result);

    return result;
  } catch (error) {
    logger.error('Health check failed', { error });
    throw error;
  }
}

/**
 * Save health check result to Firestore
 */
async function saveHealthCheckResult(result: HealthCheckResult): Promise<void> {
  try {
    await addDoc(collection(db, 'healthChecks'), {
      timestamp: Timestamp.now(),
      overallStatus: result.overallStatus,
      services: result.services.map((s) => ({
        service: s.service,
        status: s.status,
        responseTime: s.responseTime,
        errorRate: s.errorRate,
        details: s.details,
      })),
    });
  } catch (error) {
    logger.error('Failed to save health check result', { error });
  }
}

/**
 * Check health status and send alerts if needed
 */
async function checkAndSendAlerts(result: HealthCheckResult): Promise<void> {
  for (const service of result.services) {
    if (service.status === 'down') {
      await sendAlert('emergency', service);
    } else if (service.status === 'degraded') {
      await sendAlert('warning', service);
    }
  }
}

/**
 * Send alert (placeholder - implement actual notification)
 */
async function sendAlert(severity: 'warning' | 'emergency', service: ServiceHealth): Promise<void> {
  logger.warn(`ALERT [${severity.toUpperCase()}]: ${service.service} is ${service.status}`, {
    service: service.service,
    status: service.status,
    errorRate: service.errorRate,
    responseTime: service.responseTime,
    details: service.details,
  });

  // Save alert to Firestore
  await addDoc(collection(db, 'alerts'), {
    timestamp: Timestamp.now(),
    severity,
    service: service.service,
    status: service.status,
    errorRate: service.errorRate,
    responseTime: service.responseTime,
    details: service.details,
    acknowledged: false,
  });

  // TODO: Implement actual notifications
  // - Email to admin
  // - Slack notification
  // - PagerDuty for emergency
}

// ============================================================================
// Scheduled Health Checks
// ============================================================================

/**
 * Scheduled health check: Every 5 minutes
 */
export const scheduledHealthCheck = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async (event) => {
    logger.info('Starting scheduled health check');

    try {
      const result = await runHealthCheck();

      logger.info('Scheduled health check completed', {
        overallStatus: result.overallStatus,
      });

      return {
        success: true,
        result,
      };
    } catch (error) {
      logger.error('Scheduled health check failed', { error });
      throw error;
    }
  }
);

/**
 * Get recent health status
 */
export async function getRecentHealthStatus(minutes: number = 60): Promise<{
  services: Record<ServiceType, HealthStatus>;
  recentChecks: HealthCheckResult[];
}> {
  const cutoffTime = Timestamp.fromMillis(Date.now() - minutes * 60 * 1000);

  const healthChecksRef = collection(db, 'healthChecks');
  const q = query(
    healthChecksRef,
    // where('timestamp', '>', cutoffTime), // Uncomment when index is ready
    limit(12) // Last hour if checks run every 5 minutes
  );

  const snapshot = await getDocs(q);
  const recentChecks: HealthCheckResult[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      timestamp: data.timestamp.toDate(),
      services: data.services,
      overallStatus: data.overallStatus,
    };
  });

  // Get current status for each service
  const services: Record<ServiceType, HealthStatus> = {
    claude: 'healthy',
    firestore: 'healthy',
    voyage: 'healthy',
    storage: 'healthy',
  };

  if (recentChecks.length > 0) {
    const latest = recentChecks[0];
    for (const service of latest.services) {
      services[service.service] = service.status;
    }
  }

  return {
    services,
    recentChecks,
  };
}

/**
 * Get health dashboard data
 */
export async function getHealthDashboard(): Promise<{
  currentStatus: Record<ServiceType, HealthStatus>;
  averageResponseTime: Record<ServiceType, number>;
  errorRates: Record<ServiceType, number>;
  uptime: Record<ServiceType, number>;
  recentAlerts: any[];
}> {
  const { services, recentChecks } = await getRecentHealthStatus(60);

  // Calculate average response time
  const avgResponseTime: Record<ServiceType, number> = {
    claude: 0,
    firestore: 0,
    voyage: 0,
    storage: 0,
  };

  const counts: Record<ServiceType, number> = {
    claude: 0,
    firestore: 0,
    voyage: 0,
    storage: 0,
  };

  for (const check of recentChecks) {
    for (const service of check.services) {
      avgResponseTime[service.service] += service.responseTime;
      counts[service.service]++;
    }
  }

  for (const service of Object.keys(avgResponseTime) as ServiceType[]) {
    if (counts[service] > 0) {
      avgResponseTime[service] = Math.round(avgResponseTime[service] / counts[service]);
    }
  }

  // Get current error rates
  const errorRates: Record<ServiceType, number> = {
    claude: await getErrorRate('claude', 5),
    firestore: await getErrorRate('firestore', 5),
    voyage: await getErrorRate('voyage', 5),
    storage: await getErrorRate('storage', 5),
  };

  // Calculate uptime (percentage of healthy checks)
  const uptime: Record<ServiceType, number> = {
    claude: 0,
    firestore: 0,
    voyage: 0,
    storage: 0,
  };

  for (const service of Object.keys(uptime) as ServiceType[]) {
    let healthyCount = 0;
    for (const check of recentChecks) {
      const serviceCheck = check.services.find((s) => s.service === service);
      if (serviceCheck?.status === 'healthy') {
        healthyCount++;
      }
    }
    uptime[service] =
      recentChecks.length > 0 ? (healthyCount / recentChecks.length) * 100 : 100;
  }

  // Get recent alerts
  const alertsRef = collection(db, 'alerts');
  const alertsQuery = query(alertsRef, limit(10));
  const alertsSnapshot = await getDocs(alertsQuery);

  const recentAlerts = alertsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate(),
  }));

  return {
    currentStatus: services,
    averageResponseTime: avgResponseTime,
    errorRates,
    uptime,
    recentAlerts,
  };
}
