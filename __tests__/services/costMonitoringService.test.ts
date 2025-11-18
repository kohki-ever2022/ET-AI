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

  it('should aggregate usage metrics from multiple records', async () => {
    const { getDocs } = require('firebase/firestore');

    // Mock with actual data
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            projectId: 'test-project',
            userId: 'user-1',
            usage: {
              inputTokens: 1000,
              cacheCreationInputTokens: 500,
              cacheReadInputTokens: 200,
              outputTokens: 800,
            },
            cost: {
              inputCost: 0.003,
              cacheWriteCost: 0.0015,
              cacheReadCost: 0.00006,
              outputCost: 0.012,
              totalCost: 0.01656,
            },
            cacheHitRate: 0.8,
            timestamp: { toDate: () => new Date('2025-01-15') },
          }),
        },
        {
          data: () => ({
            projectId: 'test-project',
            userId: 'user-2',
            usage: {
              inputTokens: 2000,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 400,
              outputTokens: 1600,
            },
            cost: {
              inputCost: 0.006,
              cacheWriteCost: 0.003,
              cacheReadCost: 0.00012,
              outputCost: 0.024,
              totalCost: 0.03312,
            },
            cacheHitRate: 0.75,
            timestamp: { toDate: () => new Date('2025-01-16') },
          }),
        },
      ],
      empty: false,
    });

    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');
    const metrics = await getUsageMetrics(startDate, endDate, 'test-project');

    // Verify aggregation
    expect(metrics.requestCount).toBe(2);
    expect(metrics.usage.inputTokens).toBe(3000);
    expect(metrics.usage.cacheCreationInputTokens).toBe(1500);
    expect(metrics.usage.cacheReadInputTokens).toBe(600);
    expect(metrics.usage.outputTokens).toBe(2400);
    expect(metrics.cost.totalCost).toBeCloseTo(0.04968, 5);
    expect(metrics.cacheHitRate).toBeCloseTo(0.775, 3);
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

  it('should calculate budget status when budget exists', async () => {
    const { getDocs } = require('firebase/firestore');

    // Mock budget exists
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            projectId: 'test-project',
            amount: 100,
            period: 'monthly',
            alertAt: 80,
            enabled: true,
            createdAt: { toDate: () => new Date('2025-01-01') },
            updatedAt: { toDate: () => new Date('2025-01-01') },
          }),
        },
      ],
      empty: false,
    });

    // Mock usage data
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            usage: {
              inputTokens: 1000,
              cacheCreationInputTokens: 500,
              cacheReadInputTokens: 200,
              outputTokens: 800,
            },
            cost: {
              inputCost: 0.003,
              cacheWriteCost: 0.0015,
              cacheReadCost: 0.00006,
              outputCost: 0.012,
              totalCost: 0.01656,
            },
            cacheHitRate: 0.8,
            timestamp: { toDate: () => new Date('2025-01-15') },
          }),
        },
      ],
      empty: false,
    });

    const status = await getBudgetStatus('test-project');

    expect(status).toBeDefined();
    expect(status.budget).toBeDefined();
    expect(status.budget?.amount).toBe(100);
    expect(status.currentSpend).toBeCloseTo(0.01656, 5);
    expect(status.percentageUsed).toBeCloseTo(0.01656, 5);
    expect(status.remainingBudget).toBeCloseTo(99.98344, 5);
    expect(status.isOverBudget).toBe(false);
    expect(status.shouldAlert).toBe(false);
  });

  it('should detect over budget condition', async () => {
    const { getDocs } = require('firebase/firestore');

    // Mock budget
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            projectId: 'test-project',
            amount: 10,
            period: 'monthly',
            alertAt: 80,
            enabled: true,
            createdAt: { toDate: () => new Date('2025-01-01') },
          }),
        },
      ],
      empty: false,
    });

    // Mock high usage
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            usage: {
              inputTokens: 10000,
              cacheCreationInputTokens: 5000,
              cacheReadInputTokens: 2000,
              outputTokens: 8000,
            },
            cost: {
              inputCost: 3,
              cacheWriteCost: 2,
              cacheReadCost: 1,
              outputCost: 5,
              totalCost: 11,
            },
            cacheHitRate: 0.5,
            timestamp: { toDate: () => new Date('2025-01-15') },
          }),
        },
      ],
      empty: false,
    });

    const status = await getBudgetStatus('test-project');

    expect(status.isOverBudget).toBe(true);
    expect(status.currentSpend).toBe(11);
    expect(status.remainingBudget).toBe(-1);
  });

  it('should detect near alert condition', async () => {
    const { getDocs } = require('firebase/firestore');

    // Mock budget with 80% alert threshold
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            projectId: 'test-project',
            amount: 100,
            period: 'monthly',
            alertAt: 80,
            enabled: true,
            createdAt: { toDate: () => new Date('2025-01-01') },
          }),
        },
      ],
      empty: false,
    });

    // Mock usage at 85%
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            usage: {
              inputTokens: 85000,
              cacheCreationInputTokens: 40000,
              cacheReadInputTokens: 15000,
              outputTokens: 50000,
            },
            cost: {
              inputCost: 25,
              cacheWriteCost: 20,
              cacheReadCost: 10,
              outputCost: 30,
              totalCost: 85,
            },
            cacheHitRate: 0.7,
            timestamp: { toDate: () => new Date('2025-01-15') },
          }),
        },
      ],
      empty: false,
    });

    const status = await getBudgetStatus('test-project');

    expect(status.shouldAlert).toBe(true);
    expect(status.percentageUsed).toBe(85);
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

  it('should calculate cache savings from actual usage data', async () => {
    const { getDocs } = require('firebase/firestore');

    getDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            usage: {
              inputTokens: 1000,
              cacheCreationInputTokens: 500,
              cacheReadInputTokens: 2000,
              outputTokens: 800,
            },
            cost: {
              inputCost: 0.003,
              cacheWriteCost: 0.0015,
              cacheReadCost: 0.0006,
              outputCost: 0.012,
              totalCost: 0.0171,
            },
            cacheHitRate: 0.8,
            timestamp: { toDate: () => new Date() },
          }),
        },
        {
          data: () => ({
            usage: {
              inputTokens: 2000,
              cacheCreationInputTokens: 1000,
              cacheReadInputTokens: 3000,
              outputTokens: 1600,
            },
            cost: {
              inputCost: 0.006,
              cacheWriteCost: 0.003,
              cacheReadCost: 0.0009,
              outputCost: 0.024,
              totalCost: 0.0339,
            },
            cacheHitRate: 0.75,
            timestamp: { toDate: () => new Date() },
          }),
        },
      ],
      empty: false,
    });

    const efficiency = await getCacheEfficiency(30, 'test-project');

    expect(efficiency.cacheReadTokens).toBe(5000);
    expect(efficiency.actualCost).toBeCloseTo(0.051, 3);
    expect(efficiency.cacheHitRate).toBeCloseTo(0.775, 3);
    expect(efficiency.totalSavings).toBeGreaterThan(0);
  });
});
