/**
 * Claude API Cost Monitoring Service
 *
 * Tracks API usage, calculates costs, and provides alerting for budget management.
 * Integrates with Firebase Firestore for persistence and Cloud Functions for scheduled monitoring.
 */

import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { calculateCost, type TokenUsage, type CostBreakdown } from '../types/claude';
import { logger, error as logError, warn } from '../utils/logger';

/**
 * Cost alert configuration
 */
export interface CostAlert {
  id: string;
  projectId?: string; // Optional: alert for specific project
  threshold: number; // Dollar amount
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  notificationEmails: string[];
  lastTriggered?: Timestamp;
  createdAt: Timestamp;
}

/**
 * Usage metrics for a time period
 */
export interface UsageMetrics {
  projectId?: string;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
  usage: TokenUsage;
  cost: CostBreakdown;
  requestCount: number;
  cacheHitRate: number;
  averageCostPerRequest: number;
}

/**
 * Budget configuration
 */
export interface Budget {
  id: string;
  projectId?: string;
  amount: number; // Dollar amount
  period: 'daily' | 'weekly' | 'monthly';
  alertAt: number; // Percentage (0-100)
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Cost record for each API call
 */
export interface CostRecord {
  id: string;
  projectId: string;
  userId: string;
  channelId?: string;
  timestamp: Timestamp;
  usage: TokenUsage;
  cost: CostBreakdown;
  cacheHitRate: number;
  modelUsed: string;
}

/**
 * Records a Claude API call for cost tracking
 */
export async function recordApiUsage(
  projectId: string,
  userId: string,
  usage: TokenUsage,
  additionalData?: {
    channelId?: string;
    cacheHitRate?: number;
    modelUsed?: string;
  }
): Promise<void> {
  try {
    const cost = calculateCost(usage);
    const record: Omit<CostRecord, 'id'> = {
      projectId,
      userId,
      channelId: additionalData?.channelId,
      timestamp: serverTimestamp() as Timestamp,
      usage,
      cost,
      cacheHitRate: additionalData?.cacheHitRate || 0,
      modelUsed: additionalData?.modelUsed || 'claude-sonnet-4',
    };

    const costRecordsRef = collection(db, 'costRecords');
    await setDoc(doc(costRecordsRef), record);

    // Check if we need to trigger any alerts
    await checkCostAlerts(projectId, cost.totalCost);

    logger.info('API usage recorded', {
      projectId,
      cost: cost.totalCost,
      cacheHitRate: record.cacheHitRate,
    });
  } catch (err) {
    logError('Failed to record API usage', err as Error, { projectId, userId });
  }
}

/**
 * Gets usage metrics for a time period
 */
export async function getUsageMetrics(
  startDate: Date,
  endDate: Date,
  projectId?: string
): Promise<UsageMetrics> {
  try {
    const costRecordsRef = collection(db, 'costRecords');
    let q = query(
      costRecordsRef,
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    );

    if (projectId) {
      q = query(q, where('projectId', '==', projectId));
    }

    const snapshot = await getDocs(q);
    const records = snapshot.docs.map((doc) => doc.data() as CostRecord);

    // Aggregate metrics
    const aggregated = records.reduce(
      (acc, record) => {
        acc.usage.inputTokens += record.usage.inputTokens;
        acc.usage.cacheCreationInputTokens += record.usage.cacheCreationInputTokens;
        acc.usage.cacheReadInputTokens += record.usage.cacheReadInputTokens;
        acc.usage.outputTokens += record.usage.outputTokens;

        acc.cost.inputCost += record.cost.inputCost;
        acc.cost.cacheWriteCost += record.cost.cacheWriteCost;
        acc.cost.cacheReadCost += record.cost.cacheReadCost;
        acc.cost.outputCost += record.cost.outputCost;
        acc.cost.totalCost += record.cost.totalCost;

        acc.requestCount += 1;
        acc.cacheHitRateSum += record.cacheHitRate;

        return acc;
      },
      {
        usage: {
          inputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
          outputTokens: 0,
        },
        cost: {
          inputCost: 0,
          cacheWriteCost: 0,
          cacheReadCost: 0,
          outputCost: 0,
          totalCost: 0,
        },
        requestCount: 0,
        cacheHitRateSum: 0,
      }
    );

    const cacheHitRate =
      aggregated.requestCount > 0 ? aggregated.cacheHitRateSum / aggregated.requestCount : 0;

    return {
      projectId,
      period: {
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(endDate),
      },
      usage: aggregated.usage,
      cost: aggregated.cost,
      requestCount: aggregated.requestCount,
      cacheHitRate,
      averageCostPerRequest:
        aggregated.requestCount > 0 ? aggregated.cost.totalCost / aggregated.requestCount : 0,
    };
  } catch (err) {
    logError('Failed to get usage metrics', err as Error, { projectId });
    throw err;
  }
}

/**
 * Gets cost trends for visualization
 */
export async function getCostTrends(
  days: number,
  projectId?: string
): Promise<Array<{ date: string; cost: number; requests: number }>> {
  const trends: Array<{ date: string; cost: number; requests: number }> = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - i);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const metrics = await getUsageMetrics(startDate, endDate, projectId);

    trends.push({
      date: startDate.toISOString().split('T')[0],
      cost: metrics.cost.totalCost,
      requests: metrics.requestCount,
    });
  }

  return trends;
}

/**
 * Creates or updates a cost alert
 */
export async function createCostAlert(alert: Omit<CostAlert, 'id' | 'createdAt'>): Promise<string> {
  try {
    const alertsRef = collection(db, 'costAlerts');
    const newAlert: Omit<CostAlert, 'id'> = {
      ...alert,
      createdAt: serverTimestamp() as Timestamp,
    };

    const docRef = doc(alertsRef);
    await setDoc(docRef, newAlert);

    logger.info('Cost alert created', { alertId: docRef.id, threshold: alert.threshold });
    return docRef.id;
  } catch (err) {
    logError('Failed to create cost alert', err as Error);
    throw err;
  }
}

/**
 * Checks if any cost alerts should be triggered
 */
async function checkCostAlerts(projectId: string, costIncurred: number): Promise<void> {
  try {
    const alertsRef = collection(db, 'costAlerts');
    const q = query(alertsRef, where('enabled', '==', true));
    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const alert = doc.data() as CostAlert;

      // Skip if alert is project-specific and doesn't match
      if (alert.projectId && alert.projectId !== projectId) {
        continue;
      }

      // Get current period usage
      const { startDate, endDate } = getPeriodDates(alert.period);
      const metrics = await getUsageMetrics(startDate, endDate, alert.projectId);

      // Check if threshold exceeded
      if (metrics.cost.totalCost >= alert.threshold) {
        await triggerCostAlert(doc.id, alert, metrics);
      }
    }
  } catch (err) {
    logError('Failed to check cost alerts', err as Error, { projectId });
  }
}

/**
 * Triggers a cost alert notification
 */
async function triggerCostAlert(
  alertId: string,
  alert: CostAlert,
  metrics: UsageMetrics
): Promise<void> {
  try {
    // Check if alert was recently triggered (avoid spam)
    const now = new Date();
    if (alert.lastTriggered) {
      const lastTriggeredDate = alert.lastTriggered.toDate();
      const hoursSinceLastTrigger = (now.getTime() - lastTriggeredDate.getTime()) / (1000 * 60 * 60);

      // Don't trigger if alerted in the last 6 hours
      if (hoursSinceLastTrigger < 6) {
        return;
      }
    }

    // Log alert
    warn('Cost alert triggered', {
      alertId,
      threshold: alert.threshold,
      currentCost: metrics.cost.totalCost,
      period: alert.period,
    });

    // Update last triggered timestamp
    const alertRef = doc(db, 'costAlerts', alertId);
    await setDoc(
      alertRef,
      {
        lastTriggered: serverTimestamp(),
      },
      { merge: true }
    );

    // TODO: Send email notification via Cloud Function
    // This would typically call a Cloud Function that sends email via SendGrid, etc.
  } catch (err) {
    logError('Failed to trigger cost alert', err as Error, { alertId });
  }
}

/**
 * Gets start and end dates for a period
 */
function getPeriodDates(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (period) {
    case 'hourly':
      startDate.setHours(startDate.getHours() - 1);
      break;
    case 'daily':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

/**
 * Creates or updates a budget
 */
export async function createBudget(budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const budgetsRef = collection(db, 'budgets');
    const newBudget: Omit<Budget, 'id'> = {
      ...budget,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = doc(budgetsRef);
    await setDoc(docRef, newBudget);

    logger.info('Budget created', { budgetId: docRef.id, amount: budget.amount });
    return docRef.id;
  } catch (err) {
    logError('Failed to create budget', err as Error);
    throw err;
  }
}

/**
 * Gets current budget status
 */
export async function getBudgetStatus(projectId?: string): Promise<{
  budget?: Budget;
  currentSpend: number;
  percentageUsed: number;
  remainingBudget: number;
  isOverBudget: boolean;
  shouldAlert: boolean;
}> {
  try {
    // Find active budget
    const budgetsRef = collection(db, 'budgets');
    let q = query(budgetsRef, where('enabled', '==', true), limit(1));

    if (projectId) {
      q = query(q, where('projectId', '==', projectId));
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return {
        currentSpend: 0,
        percentageUsed: 0,
        remainingBudget: 0,
        isOverBudget: false,
        shouldAlert: false,
      };
    }

    const budget = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Budget;

    // Get current period usage
    const { startDate, endDate } = getPeriodDates(budget.period);
    const metrics = await getUsageMetrics(startDate, endDate, projectId);

    const currentSpend = metrics.cost.totalCost;
    const percentageUsed = (currentSpend / budget.amount) * 100;
    const remainingBudget = budget.amount - currentSpend;
    const isOverBudget = currentSpend > budget.amount;
    const shouldAlert = percentageUsed >= budget.alertAt;

    return {
      budget,
      currentSpend,
      percentageUsed,
      remainingBudget,
      isOverBudget,
      shouldAlert,
    };
  } catch (err) {
    logError('Failed to get budget status', err as Error, { projectId });
    throw err;
  }
}

/**
 * Gets cache efficiency metrics
 */
export async function getCacheEfficiency(
  days: number,
  projectId?: string
): Promise<{
  cacheHitRate: number;
  totalSavings: number;
  cacheReadTokens: number;
  normalInputTokens: number;
  estimatedCostWithoutCache: number;
  actualCost: number;
}> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const metrics = await getUsageMetrics(startDate, now, projectId);

  // Calculate what the cost would have been without caching
  const estimatedCostWithoutCache =
    metrics.cost.totalCost +
    (metrics.usage.cacheReadInputTokens * 3.0) / 1000000 -
    (metrics.usage.cacheReadInputTokens * 0.3) / 1000000;

  const totalSavings = estimatedCostWithoutCache - metrics.cost.totalCost;

  return {
    cacheHitRate: metrics.cacheHitRate,
    totalSavings,
    cacheReadTokens: metrics.usage.cacheReadInputTokens,
    normalInputTokens: metrics.usage.inputTokens,
    estimatedCostWithoutCache,
    actualCost: metrics.cost.totalCost,
  };
}
