/**
 * Scheduled Cost Monitoring Cloud Function
 *
 * Runs periodically to check budgets, send alerts, and generate cost reports.
 * Integrates with the cost monitoring service.
 */

import * as functions from 'firebase-functions';
import { db, COLLECTIONS } from './config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  setDoc,
  doc,
} from 'firebase/firestore';

/**
 * Scheduled function to check budgets and send alerts
 * Runs every hour
 */
export const checkBudgets = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    console.log('Running scheduled budget check...');

    try {
      // Get all enabled budgets
      const budgetsRef = collection(db, 'budgets');
      const q = query(budgetsRef, where('enabled', '==', true));
      const snapshot = await getDocs(q);

      let alertCount = 0;
      let overBudgetCount = 0;

      for (const budgetDoc of snapshot.docs) {
        const budget = budgetDoc.data();
        const budgetId = budgetDoc.id;

        // Get current period dates
        const { startDate, endDate } = getPeriodDates(budget.period);

        // Get usage for the period
        const metrics = await getUsageMetricsForBudget(
          startDate,
          endDate,
          budget.projectId
        );

        const currentSpend = metrics.totalCost;
        const percentageUsed = (currentSpend / budget.amount) * 100;

        // Check if over budget
        if (currentSpend > budget.amount) {
          overBudgetCount++;
          await sendBudgetAlert(budgetId, budget, currentSpend, percentageUsed, 'over_budget');
        }
        // Check if at alert threshold
        else if (percentageUsed >= budget.alertAt) {
          alertCount++;
          await sendBudgetAlert(budgetId, budget, currentSpend, percentageUsed, 'threshold');
        }
      }

      console.log(
        `Budget check complete: ${alertCount} alerts, ${overBudgetCount} over budget`
      );

      return {
        success: true,
        budgetsChecked: snapshot.size,
        alertsSent: alertCount,
        overBudget: overBudgetCount,
      };
    } catch (error) {
      console.error('Error checking budgets:', error);
      throw error;
    }
  });

/**
 * Scheduled function to generate daily cost reports
 * Runs every day at 9 AM JST
 */
export const generateDailyCostReport = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    console.log('Generating daily cost report...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setHours(23, 59, 59, 999);

      // Get all projects
      const projectsRef = collection(db, COLLECTIONS.PROJECTS);
      const projectsSnapshot = await getDocs(projectsRef);

      const reports: any[] = [];

      for (const projectDoc of projectsSnapshot.docs) {
        const projectId = projectDoc.id;

        const metrics = await getUsageMetricsForBudget(yesterday, today, projectId);

        reports.push({
          projectId,
          projectName: projectDoc.data().name,
          date: yesterday.toISOString().split('T')[0],
          cost: metrics.totalCost,
          requests: metrics.requestCount,
          cacheHitRate: metrics.cacheHitRate,
        });
      }

      // Save report to Firestore
      const reportsRef = collection(db, 'costReports');
      await setDoc(doc(reportsRef), {
        date: Timestamp.fromDate(yesterday),
        reports,
        generatedAt: Timestamp.now(),
      });

      console.log(`Daily cost report generated: ${reports.length} projects`);

      return {
        success: true,
        projectsReported: reports.length,
        totalCost: reports.reduce((sum, r) => sum + r.cost, 0),
      };
    } catch (error) {
      console.error('Error generating daily cost report:', error);
      throw error;
    }
  });

/**
 * Scheduled function to clean up old cost records
 * Runs every Sunday at 2 AM
 */
export const cleanupOldCostRecords = functions.pubsub
  .schedule('0 2 * * 0')
  .onRun(async (context) => {
    console.log('Cleaning up old cost records...');

    try {
      // Delete records older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const costRecordsRef = collection(db, 'costRecords');
      const q = query(
        costRecordsRef,
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      // Delete in batches
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();

      console.log(`Cleaned up ${deletedCount} old cost records`);

      return {
        success: true,
        recordsDeleted: deletedCount,
      };
    } catch (error) {
      console.error('Error cleaning up cost records:', error);
      throw error;
    }
  });

/**
 * Helper function to get usage metrics for budget checking
 */
async function getUsageMetricsForBudget(
  startDate: Date,
  endDate: Date,
  projectId?: string
): Promise<{
  totalCost: number;
  requestCount: number;
  cacheHitRate: number;
}> {
  const costRecordsRef = collection(db, 'costRecords');
  let q = query(
    costRecordsRef,
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate))
  );

  if (projectId) {
    q = query(q, where('projectId', '==', projectId));
  }

  const snapshot = await getDocs(q);
  const records = snapshot.docs.map((doc) => doc.data());

  const aggregated = records.reduce(
    (acc, record: any) => {
      acc.totalCost += record.cost?.totalCost || 0;
      acc.requestCount += 1;
      acc.cacheHitRateSum += record.cacheHitRate || 0;
      return acc;
    },
    { totalCost: 0, requestCount: 0, cacheHitRateSum: 0 }
  );

  return {
    totalCost: aggregated.totalCost,
    requestCount: aggregated.requestCount,
    cacheHitRate:
      aggregated.requestCount > 0
        ? aggregated.cacheHitRateSum / aggregated.requestCount
        : 0,
  };
}

/**
 * Helper function to get period dates
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
 * Helper function to send budget alerts
 */
async function sendBudgetAlert(
  budgetId: string,
  budget: any,
  currentSpend: number,
  percentageUsed: number,
  alertType: 'threshold' | 'over_budget'
): Promise<void> {
  // Check if we've already sent an alert recently
  const alertsRef = collection(db, 'budgetAlertHistory');
  const recentAlertsQuery = query(
    alertsRef,
    where('budgetId', '==', budgetId),
    where('alertType', '==', alertType),
    where('sentAt', '>', Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000))) // Last 6 hours
  );

  const recentAlerts = await getDocs(recentAlertsQuery);

  if (!recentAlerts.empty) {
    console.log(`Alert already sent for budget ${budgetId} in the last 6 hours`);
    return;
  }

  // Log the alert
  console.warn(`Budget alert triggered: ${alertType}`, {
    budgetId,
    amount: budget.amount,
    currentSpend,
    percentageUsed: percentageUsed.toFixed(2) + '%',
  });

  // Record alert in history
  await setDoc(doc(alertsRef), {
    budgetId,
    projectId: budget.projectId,
    alertType,
    amount: budget.amount,
    currentSpend,
    percentageUsed,
    sentAt: Timestamp.now(),
  });

  // TODO: Send email notification
  // This would integrate with SendGrid, SES, or another email service
  // For now, we just log the alert
}
