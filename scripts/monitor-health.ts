#!/usr/bin/env ts-node
/**
 * Health Monitoring Script
 * 
 * Monitors error logs, health checks, and alerts from Firestore
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

interface MonitoringOptions {
  minutes?: number;
  verbose?: boolean;
}

/**
 * Get error logs from the last N minutes
 */
async function getRecentErrors(minutes: number = 60) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  
  const snapshot = await db.collection('error_logs')
    .where('timestamp', '>', admin.firestore.Timestamp.fromDate(cutoff))
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  const errors: any[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    errors.push({
      id: doc.id,
      service: data.service,
      type: data.errorType,
      severity: data.severity,
      message: data.message,
      timestamp: data.timestamp.toDate(),
      recovered: data.recovered,
      retryCount: data.retryCount,
    });
  });

  return errors;
}

/**
 * Get recent health checks
 */
async function getRecentHealthChecks(limit: number = 12) {
  const snapshot = await db.collection('healthChecks')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const checks: any[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    checks.push({
      timestamp: data.timestamp.toDate(),
      overallStatus: data.overallStatus,
      services: data.services,
    });
  });

  return checks;
}

/**
 * Get unacknowledged alerts
 */
async function getUnacknowledgedAlerts() {
  const snapshot = await db.collection('alerts')
    .where('acknowledged', '==', false)
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  const alerts: any[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    alerts.push({
      id: doc.id,
      service: data.service,
      severity: data.severity,
      status: data.status,
      timestamp: data.timestamp.toDate(),
      details: data.details,
    });
  });

  return alerts;
}

/**
 * Calculate error statistics
 */
function calculateErrorStats(errors: any[]) {
  const stats = {
    total: errors.length,
    byService: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    recoveredCount: 0,
    failedCount: 0,
  };

  errors.forEach(error => {
    // By service
    stats.byService[error.service] = (stats.byService[error.service] || 0) + 1;

    // By severity
    stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

    // Recovery stats
    if (error.recovered) {
      stats.recoveredCount++;
    } else {
      stats.failedCount++;
    }
  });

  return stats;
}

/**
 * Main monitoring function
 */
async function monitor(options: MonitoringOptions = {}) {
  const { minutes = 60, verbose = false } = options;

  console.log('========================================');
  console.log('   ET-AI Health Monitoring Dashboard');
  console.log('========================================');
  console.log(`Monitoring period: Last ${minutes} minutes`);
  console.log(`Current time: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  // 1. Get recent errors
  console.log('📊 Error Logs Analysis');
  console.log('----------------------------------------');
  
  const errors = await getRecentErrors(minutes);
  const errorStats = calculateErrorStats(errors);

  console.log(`Total errors: ${errorStats.total}`);
  console.log(`Recovered: ${errorStats.recoveredCount} (${((errorStats.recoveredCount / errorStats.total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${errorStats.failedCount} (${((errorStats.failedCount / errorStats.total) * 100).toFixed(1)}%)`);
  console.log('');

  console.log('By Service:');
  Object.entries(errorStats.byService).forEach(([service, count]) => {
    console.log(`  ${service}: ${count}`);
  });
  console.log('');

  console.log('By Severity:');
  Object.entries(errorStats.bySeverity).forEach(([severity, count]) => {
    const emoji = severity === 'emergency' ? '🚨' : severity === 'critical' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`  ${emoji} ${severity}: ${count}`);
  });
  console.log('');

  if (verbose && errors.length > 0) {
    console.log('Recent Errors (last 5):');
    errors.slice(0, 5).forEach(error => {
      console.log(`  - [${error.timestamp.toLocaleTimeString('ja-JP')}] ${error.service}/${error.type}: ${error.message}`);
      console.log(`    Severity: ${error.severity}, Recovered: ${error.recovered}, Retries: ${error.retryCount}`);
    });
    console.log('');
  }

  // 2. Get health checks
  console.log('🏥 Health Check Status');
  console.log('----------------------------------------');

  const healthChecks = await getRecentHealthChecks(12);
  
  if (healthChecks.length === 0) {
    console.log('⚠️  No health checks found. Scheduled health check may not be running.');
  } else {
    const latest = healthChecks[0];
    console.log(`Latest check: ${latest.timestamp.toLocaleString('ja-JP')}`);
    console.log(`Overall status: ${latest.overallStatus === 'healthy' ? '✅' : latest.overallStatus === 'degraded' ? '⚠️' : '❌'} ${latest.overallStatus.toUpperCase()}`);
    console.log('');

    console.log('Service Status:');
    latest.services.forEach((service: any) => {
      const icon = service.status === 'healthy' ? '✅' : service.status === 'degraded' ? '⚠️' : '❌';
      console.log(`  ${icon} ${service.service}: ${service.status.toUpperCase()}`);
      console.log(`     Response time: ${service.responseTime}ms, Error rate: ${(service.errorRate * 100).toFixed(2)}%`);
    });
    console.log('');

    // Calculate uptime
    const healthyChecks = healthChecks.filter(c => c.overallStatus === 'healthy').length;
    const uptime = (healthyChecks / healthChecks.length) * 100;
    console.log(`Uptime (last ${healthChecks.length} checks): ${uptime.toFixed(1)}%`);
  }
  console.log('');

  // 3. Get alerts
  console.log('🚨 Active Alerts');
  console.log('----------------------------------------');

  const alerts = await getUnacknowledgedAlerts();

  if (alerts.length === 0) {
    console.log('✅ No active alerts');
  } else {
    console.log(`${alerts.length} unacknowledged alert(s):`);
    console.log('');

    alerts.forEach(alert => {
      const icon = alert.severity === 'emergency' ? '🚨' : '⚠️';
      console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.service}`);
      console.log(`   Status: ${alert.status}`);
      console.log(`   Time: ${alert.timestamp.toLocaleString('ja-JP')}`);
      console.log(`   Details: ${alert.details}`);
      console.log('');
    });
  }

  console.log('========================================');
  console.log('');

  // Summary recommendations
  if (errorStats.total > 0 || alerts.length > 0) {
    console.log('📝 Recommendations:');
    if (errorStats.failedCount > errorStats.recoveredCount) {
      console.log('  - High failure rate detected. Check service logs.');
    }
    if (alerts.length > 5) {
      console.log('  - Multiple alerts active. Investigate service health.');
    }
    if (errorStats.bySeverity['emergency'] > 0) {
      console.log('  - Emergency-level errors detected. Immediate action required.');
    }
  } else {
    console.log('✅ All systems operational');
  }
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: MonitoringOptions = {
  minutes: 60,
  verbose: false,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--minutes' || args[i] === '-m') {
    options.minutes = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--verbose' || args[i] === '-v') {
    options.verbose = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: ts-node scripts/monitor-health.ts [options]');
    console.log('');
    console.log('Options:');
    console.log('  -m, --minutes <number>  Monitoring period in minutes (default: 60)');
    console.log('  -v, --verbose           Show detailed error logs');
    console.log('  -h, --help              Show this help message');
    process.exit(0);
  }
}

// Run monitoring
monitor(options)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Monitoring error:', error);
    process.exit(1);
  });
