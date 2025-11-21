/**
 * Claude API Rate Limit Monitoring
 *
 * Tracks API usage and sends alerts when approaching limits.
 *
 * Alert Thresholds:
 * - 60%: Info - Normal usage
 * - 80%: Warning - High usage
 * - 90%: Critical - Approaching limit
 * - 100%: Emergency - Limit reached
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, serverTimestamp } from '../config/firebase';
import { claudeQueue } from '../services/claudeQueueService';

export interface RateLimitAlert {
  timestamp: number;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  metric: 'rpm' | 'tpm' | 'rpd';
  currentValue: number;
  limitValue: number;
  utilization: number; // Percentage
  message: string;
}

/**
 * Check rate limit status and send alerts
 */
export async function checkRateLimitStatus(): Promise<RateLimitAlert[]> {
  const stats = claudeQueue.getStatistics();
  const alerts: RateLimitAlert[] = [];

  // Check RPM (Requests Per Minute)
  const rpmAlert = checkMetric(
    'rpm',
    stats.currentUsage.rpm,
    stats.rateLimits.rpm,
    stats.utilization.rpm
  );
  if (rpmAlert) alerts.push(rpmAlert);

  // Check TPM (Tokens Per Minute)
  const tpmAlert = checkMetric(
    'tpm',
    stats.currentUsage.tpm,
    stats.rateLimits.tpm,
    stats.utilization.tpm
  );
  if (tpmAlert) alerts.push(tpmAlert);

  // Check RPD (Requests Per Day)
  const rpdAlert = checkMetric(
    'rpd',
    stats.currentUsage.rpd,
    stats.rateLimits.rpd,
    stats.utilization.rpd
  );
  if (rpdAlert) alerts.push(rpdAlert);

  // Store alerts in Firestore
  for (const alert of alerts) {
    await db.collection('rate_limit_alerts').add({
      ...alert,
      timestamp: serverTimestamp(),
    });
  }

  // Send notifications for critical/emergency alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency');
  if (criticalAlerts.length > 0) {
    await sendAlertNotifications(criticalAlerts);
  }

  return alerts;
}

/**
 * Check a single metric
 */
function checkMetric(
  metric: 'rpm' | 'tpm' | 'rpd',
  currentValue: number,
  limitValue: number,
  utilization: number
): RateLimitAlert | null {
  let severity: 'info' | 'warning' | 'critical' | 'emergency' | null = null;
  let message: string = '';

  if (utilization >= 100) {
    severity = 'emergency';
    message = `${metric.toUpperCase()} limit reached! ${currentValue}/${limitValue} (100%)`;
  } else if (utilization >= 90) {
    severity = 'critical';
    message = `${metric.toUpperCase()} approaching limit: ${currentValue}/${limitValue} (${utilization.toFixed(1)}%)`;
  } else if (utilization >= 80) {
    severity = 'warning';
    message = `${metric.toUpperCase()} high usage: ${currentValue}/${limitValue} (${utilization.toFixed(1)}%)`;
  } else if (utilization >= 60) {
    severity = 'info';
    message = `${metric.toUpperCase()} normal usage: ${currentValue}/${limitValue} (${utilization.toFixed(1)}%)`;
  }

  if (!severity) return null;

  return {
    timestamp: Date.now(),
    severity,
    metric,
    currentValue,
    limitValue,
    utilization,
    message,
  };
}

/**
 * Send alert notifications
 */
async function sendAlertNotifications(alerts: RateLimitAlert[]): Promise<void> {
  for (const alert of alerts) {
    console.error(`[Rate Limit Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);

    // TODO: Send to Slack/Email/etc
    // For now, just log to Firestore
    await db.collection('system_notifications').add({
      type: 'rate_limit_alert',
      severity: alert.severity,
      message: alert.message,
      alert,
      timestamp: serverTimestamp(),
    });
  }
}

/**
 * Scheduled function to monitor rate limits every minute
 */
export const monitorRateLimits = onSchedule('every 1 minutes', async (event) => {
  const alerts = await checkRateLimitStatus();

  if (alerts.length > 0) {
    console.log(`[Rate Limit Monitor] Generated ${alerts.length} alerts`);
    alerts.forEach(alert => {
      console.log(`  [${alert.severity.toUpperCase()}] ${alert.metric}: ${alert.utilization.toFixed(1)}%`);
    });
  } else {
    console.log('[Rate Limit Monitor] All metrics within normal range');
  }
});

/**
 * Get rate limit statistics dashboard data
 */
export async function getRateLimitDashboard(): Promise<{
  current: ReturnType<typeof claudeQueue.getStatistics>;
  recentAlerts: RateLimitAlert[];
  hourlyUsage: Array<{ hour: number; rpm: number; tpm: number }>;
}> {
  const current = claudeQueue.getStatistics();

  // Get recent alerts (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 86_400_000);
  const alertsSnapshot = await db
    .collection('rate_limit_alerts')
    .where('timestamp', '>=', oneDayAgo)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  const recentAlerts = alertsSnapshot.docs.map(doc => doc.data() as RateLimitAlert);

  // Get hourly usage for last 24 hours
  const hourlyUsage = await getHourlyUsage();

  return {
    current,
    recentAlerts,
    hourlyUsage,
  };
}

/**
 * Get hourly usage statistics
 */
async function getHourlyUsage(): Promise<Array<{ hour: number; rpm: number; tpm: number }>> {
  const usage: Array<{ hour: number; rpm: number; tpm: number }> = [];

  // Get data from last 24 hours
  const oneDayAgo = new Date(Date.now() - 86_400_000);
  const queueSnapshot = await db
    .collection('claude_queue')
    .where('queuedAt', '>=', oneDayAgo)
    .get();

  // Group by hour
  const hourlyData = new Map<number, { requests: number; tokens: number }>();

  queueSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const timestamp = data.queuedAt?.toDate?.()?.getTime() || 0;
    const hour = Math.floor(timestamp / 3_600_000); // Hour bucket

    const existing = hourlyData.get(hour) || { requests: 0, tokens: 0 };
    hourlyData.set(hour, {
      requests: existing.requests + 1,
      tokens: existing.tokens + (data.estimatedTokens || 0),
    });
  });

  // Convert to array
  for (const [hour, data] of hourlyData.entries()) {
    usage.push({
      hour,
      rpm: data.requests,
      tpm: data.tokens,
    });
  }

  return usage.sort((a, b) => a.hour - b.hour);
}

/**
 * Cleanup old alerts (older than 30 days)
 */
export const cleanupOldAlerts = onSchedule('every 24 hours', async (event) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const snapshot = await db
    .collection('rate_limit_alerts')
    .where('timestamp', '<', thirtyDaysAgo)
    .limit(500)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`[Rate Limit Monitor] Cleaned up ${snapshot.size} old alerts`);
});

/**
 * Generate daily rate limit report
 */
export const generateDailyRateLimitReport = onSchedule('every 24 hours', async (event) => {
  const dashboard = await getRateLimitDashboard();

  const report = {
    date: new Date().toISOString().split('T')[0],
    summary: {
      totalRequests: dashboard.hourlyUsage.reduce((sum, h) => sum + h.rpm, 0),
      totalTokens: dashboard.hourlyUsage.reduce((sum, h) => sum + h.tpm, 0),
      peakRPM: Math.max(...dashboard.hourlyUsage.map(h => h.rpm), 0),
      peakTPM: Math.max(...dashboard.hourlyUsage.map(h => h.tpm), 0),
    },
    alerts: {
      total: dashboard.recentAlerts.length,
      byType: {
        info: dashboard.recentAlerts.filter(a => a.severity === 'info').length,
        warning: dashboard.recentAlerts.filter(a => a.severity === 'warning').length,
        critical: dashboard.recentAlerts.filter(a => a.severity === 'critical').length,
        emergency: dashboard.recentAlerts.filter(a => a.severity === 'emergency').length,
      },
    },
    current: dashboard.current,
  };

  await db.collection('daily_rate_limit_reports').add({
    ...report,
    timestamp: serverTimestamp(),
  });

  console.log('[Rate Limit Monitor] Daily report generated:', JSON.stringify(report, null, 2));
});
