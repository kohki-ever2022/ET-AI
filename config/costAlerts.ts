/**
 * Cost Alert Configuration
 *
 * Default configurations for Claude API cost alerts and budgets.
 * These can be overridden through the admin dashboard or API.
 */

import { createCostAlert, createBudget } from '../services/costMonitoringService';

/**
 * Default cost alert thresholds
 */
export const DEFAULT_COST_ALERTS = [
  {
    name: 'Daily Budget Alert',
    threshold: 10.0, // $10 per day
    period: 'daily' as const,
    enabled: true,
    notificationEmails: [], // Should be configured by admin
  },
  {
    name: 'Weekly Budget Alert',
    threshold: 50.0, // $50 per week
    period: 'weekly' as const,
    enabled: true,
    notificationEmails: [],
  },
  {
    name: 'Monthly Budget Alert',
    threshold: 200.0, // $200 per month
    period: 'monthly' as const,
    enabled: true,
    notificationEmails: [],
  },
  {
    name: 'Hourly Spike Alert',
    threshold: 5.0, // $5 per hour (unusual spike)
    period: 'hourly' as const,
    enabled: true,
    notificationEmails: [],
  },
];

/**
 * Default budget configurations
 */
export const DEFAULT_BUDGETS = [
  {
    name: 'Daily Budget',
    amount: 15.0, // $15 per day
    period: 'daily' as const,
    alertAt: 80, // Alert at 80% usage
    enabled: true,
  },
  {
    name: 'Weekly Budget',
    amount: 75.0, // $75 per week
    period: 'weekly' as const,
    alertAt: 80,
    enabled: true,
  },
  {
    name: 'Monthly Budget',
    amount: 300.0, // $300 per month
    period: 'monthly' as const,
    alertAt: 80,
    enabled: true,
  },
];

/**
 * Cost thresholds by request type
 *
 * Estimated costs per request type to help with budgeting.
 * Based on average token usage patterns.
 */
export const COST_ESTIMATES = {
  // Simple Q&A (short context, short response)
  simpleQuery: {
    averageInputTokens: 2000,
    averageCacheReadTokens: 3000,
    averageOutputTokens: 500,
    estimatedCost: 0.004, // ~$0.004 per request with caching
  },

  // Document analysis (large context, detailed response)
  documentAnalysis: {
    averageInputTokens: 5000,
    averageCacheReadTokens: 8000,
    averageOutputTokens: 1500,
    estimatedCost: 0.012, // ~$0.012 per request with caching
  },

  // Report generation (large context, extensive response)
  reportGeneration: {
    averageInputTokens: 8000,
    averageCacheReadTokens: 12000,
    averageOutputTokens: 3000,
    estimatedCost: 0.025, // ~$0.025 per request with caching
  },

  // Compliance check (very large context, detailed analysis)
  complianceCheck: {
    averageInputTokens: 10000,
    averageCacheReadTokens: 15000,
    averageOutputTokens: 4000,
    estimatedCost: 0.035, // ~$0.035 per request with caching
  },
};

/**
 * Cost optimization recommendations
 */
export const COST_OPTIMIZATION_TIPS = [
  {
    title: 'プロンプトキャッシングの活用',
    description:
      'システムプロンプトとIR知識ベースはキャッシュされるため、頻繁に使用されるプロジェクトでは最大90%のコスト削減が可能です。',
    impact: 'high',
  },
  {
    title: '適切なモデル選択',
    description:
      'Claude Sonnet 4は高性能ですが、シンプルなタスクにはHaikuの使用を検討してください。',
    impact: 'medium',
  },
  {
    title: 'バッチ処理の活用',
    description:
      '複数のドキュメントを一度に処理することで、キャッシュヒット率が向上し、コストを削減できます。',
    impact: 'medium',
  },
  {
    title: '出力トークン数の最適化',
    description:
      '応答の長さを適切に制限することで、出力トークンコストを削減できます。',
    impact: 'low',
  },
  {
    title: 'コンテキストウィンドウの管理',
    description:
      '会話履歴は適切に管理し、不要な古いメッセージは削除してください。',
    impact: 'low',
  },
];

/**
 * Pricing constants (as of Claude Sonnet 4)
 * These should be updated when Anthropic changes pricing
 */
export const PRICING = {
  INPUT_PER_MILLION: 3.0, // $3.00 per million tokens
  CACHE_WRITE_PER_MILLION: 3.75, // $3.75 per million tokens
  CACHE_READ_PER_MILLION: 0.3, // $0.30 per million tokens (90% discount)
  OUTPUT_PER_MILLION: 15.0, // $15.00 per million tokens
};

/**
 * Budget recommendations by project size
 */
export const BUDGET_RECOMMENDATIONS = {
  small: {
    description: '小規模プロジェクト (1-5ユーザー、月間100-500リクエスト)',
    dailyBudget: 5.0,
    weeklyBudget: 30.0,
    monthlyBudget: 100.0,
  },
  medium: {
    description: '中規模プロジェクト (5-20ユーザー、月間500-2000リクエスト)',
    dailyBudget: 15.0,
    weeklyBudget: 75.0,
    monthlyBudget: 300.0,
  },
  large: {
    description: '大規模プロジェクト (20+ユーザー、月間2000+リクエスト)',
    dailyBudget: 50.0,
    weeklyBudget: 250.0,
    monthlyBudget: 1000.0,
  },
};

/**
 * Initialize default cost alerts for a new project
 */
export async function initializeDefaultAlerts(
  projectId: string,
  notificationEmails: string[]
): Promise<void> {
  console.log(`Initializing cost alerts for project: ${projectId}`);

  try {
    // Create default alerts
    for (const alertConfig of DEFAULT_COST_ALERTS) {
      await createCostAlert({
        projectId,
        threshold: alertConfig.threshold,
        period: alertConfig.period,
        enabled: alertConfig.enabled,
        notificationEmails,
      });
    }

    // Create default budget
    await createBudget({
      projectId,
      amount: DEFAULT_BUDGETS[2].amount, // Use monthly budget as default
      period: DEFAULT_BUDGETS[2].period,
      alertAt: DEFAULT_BUDGETS[2].alertAt,
      enabled: DEFAULT_BUDGETS[2].enabled,
    });

    console.log(`Successfully initialized cost alerts for project: ${projectId}`);
  } catch (error) {
    console.error('Failed to initialize cost alerts:', error);
    throw error;
  }
}

/**
 * Calculate expected monthly cost based on usage patterns
 */
export function calculateExpectedMonthlyCost(params: {
  dailyRequests: number;
  averageCostPerRequest: number;
}): {
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
  recommendation: 'small' | 'medium' | 'large';
} {
  const { dailyRequests, averageCostPerRequest } = params;

  const dailyCost = dailyRequests * averageCostPerRequest;
  const weeklyCost = dailyCost * 7;
  const monthlyCost = dailyCost * 30;

  let recommendation: 'small' | 'medium' | 'large';
  if (monthlyCost < 150) {
    recommendation = 'small';
  } else if (monthlyCost < 500) {
    recommendation = 'medium';
  } else {
    recommendation = 'large';
  }

  return {
    dailyCost,
    weeklyCost,
    monthlyCost,
    recommendation,
  };
}
