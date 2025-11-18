/**
 * Cost Monitoring Service Tests
 *
 * Tests for Claude API cost monitoring and budget management
 */

import {
  recordApiUsage,
  getUsageMetrics,
  getCostTrends,
  createCostAlert,
  createBudget,
  getBudgetStatus,
  getCacheEfficiency,
} from '../../services/costMonitoringService';

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(() => ({ id: 'test-doc-id' })),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [], empty: true }),
  query: jest.fn((...args) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  Timestamp: {
    fromDate: jest.fn((date) => ({ toDate: () => date, seconds: date.getTime() / 1000 })),
  },
}));

jest.mock('../../types/claude', () => ({
  calculateCost: jest.fn(() => ({
    inputCost: 0.003,
    cacheWriteCost: 0.001,
    cacheReadCost: 0.0001,
    outputCost: 0.015,
    totalCost: 0.0191,
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
  },
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('recordApiUsage', () => {
  it('should record API usage successfully', async () => {
    await recordApiUsage(
      'test-project',
      'test-user',
      {
        inputTokens: 1000,
        cacheCreationInputTokens: 500,
        cacheReadInputTokens: 200,
        outputTokens: 800,
      },
      {
        channelId: 'test-channel',
        cacheHitRate: 0.8,
        modelUsed: 'claude-sonnet-4',
      }
    );

    // Test should complete without errors
  });

  it('should record API usage without optional data', async () => {
    await recordApiUsage('test-project', 'test-user', {
      inputTokens: 1000,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      outputTokens: 500,
    });

    // Test should complete without errors
  });
});

describe('getUsageMetrics', () => {
  it('should get usage metrics for a time period', async () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    const metrics = await getUsageMetrics(startDate, endDate);

    expect(metrics).toBeDefined();
    expect(metrics.period).toBeDefined();
    expect(metrics.usage).toBeDefined();
    expect(metrics.cost).toBeDefined();
    expect(metrics.requestCount).toBe(0); // Empty mock data
  });

  it('should get usage metrics for a specific project', async () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    const metrics = await getUsageMetrics(startDate, endDate, 'test-project');

    expect(metrics).toBeDefined();
    expect(metrics.projectId).toBe('test-project');
  });
});

describe('getCostTrends', () => {
  it('should get cost trends for specified days', async () => {
    const trends = await getCostTrends(7);

    expect(trends).toBeDefined();
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(7);
  });

  it('should get cost trends for specific project', async () => {
    const trends = await getCostTrends(30, 'test-project');

    expect(trends).toBeDefined();
    expect(Array.isArray(trends)).toBe(true);
    expect(trends.length).toBe(30);
  });
});

describe('createCostAlert', () => {
  it('should create a cost alert', async () => {
    const alertId = await createCostAlert({
      threshold: 100,
      period: 'daily',
      enabled: true,
      notificationEmails: ['admin@example.com'],
    });

    expect(alertId).toBeDefined();
  });

  it('should create a project-specific alert', async () => {
    const alertId = await createCostAlert({
      projectId: 'test-project',
      threshold: 50,
      period: 'weekly',
      enabled: true,
      notificationEmails: ['project-admin@example.com'],
    });

    expect(alertId).toBeDefined();
  });
});

describe('createBudget', () => {
  it('should create a budget', async () => {
    const budgetId = await createBudget({
      amount: 500,
      period: 'monthly',
      alertAt: 80,
      enabled: true,
    });

    expect(budgetId).toBeDefined();
  });

  it('should create a project-specific budget', async () => {
    const budgetId = await createBudget({
      projectId: 'test-project',
      amount: 200,
      period: 'weekly',
      alertAt: 90,
      enabled: true,
    });

    expect(budgetId).toBeDefined();
  });
});

describe('getBudgetStatus', () => {
  it('should get budget status when no budget exists', async () => {
    const status = await getBudgetStatus();

    expect(status).toBeDefined();
    expect(status.currentSpend).toBe(0);
    expect(status.percentageUsed).toBe(0);
    expect(status.isOverBudget).toBe(false);
  });

  it('should get budget status for specific project', async () => {
    const status = await getBudgetStatus('test-project');

    expect(status).toBeDefined();
    expect(status.currentSpend).toBeDefined();
  });
});

describe('getCacheEfficiency', () => {
  it('should calculate cache efficiency metrics', async () => {
    const efficiency = await getCacheEfficiency(30);

    expect(efficiency).toBeDefined();
    expect(efficiency.cacheHitRate).toBeDefined();
    expect(efficiency.totalSavings).toBeDefined();
    expect(efficiency.cacheReadTokens).toBeDefined();
    expect(efficiency.actualCost).toBeDefined();
  });

  it('should calculate cache efficiency for specific project', async () => {
    const efficiency = await getCacheEfficiency(7, 'test-project');

    expect(efficiency).toBeDefined();
    expect(efficiency.cacheHitRate).toBeGreaterThanOrEqual(0);
  });
});
