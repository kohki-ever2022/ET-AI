/**
 * Tests for Manual Batch Job Trigger
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Mock dependencies
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn((collectionName: string) => ({
      doc: jest.fn((docId: string) => ({
        get: jest.fn(),
      })),
      add: jest.fn(),
    })),
    FieldValue: {
      serverTimestamp: jest.fn(() => 'TIMESTAMP'),
    },
  })),
}));

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: jest.fn(() => ({
    topic: jest.fn((topicName: string) => ({
      publish: jest.fn().mockResolvedValue('test-message-id'),
    })),
  })),
}));

describe('triggerBatchJob', () => {
  let mockDb: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ role: 'admin' }),
              }),
            })),
          };
        }
        return {
          add: jest.fn().mockResolvedValue({ id: 'test-log-id' }),
        };
      }),
    };

    (admin.firestore as jest.Mock).mockReturnValue(mockDb);

    mockContext = {
      auth: {
        uid: 'test-user-id',
        token: {
          email: 'admin@trias.co.jp',
        },
      },
    };
  });

  describe('Authentication and Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      await expect(
        triggerBatchJob(
          { jobType: 'weekly-pattern-extraction' },
          { auth: null }
        )
      ).rejects.toThrow('unauthenticated');
    });

    it('should reject non-admin users', async () => {
      mockDb.collection.mockReturnValueOnce({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'employee' }), // Not admin
          }),
        })),
      });

      const { triggerBatchJob } = require('../triggerBatchJob');

      await expect(
        triggerBatchJob(
          { jobType: 'weekly-pattern-extraction' },
          mockContext
        )
      ).rejects.toThrow('permission-denied');
    });

    it('should allow admin users to trigger jobs', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      const result = await triggerBatchJob(
        { jobType: 'weekly-pattern-extraction' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid job types', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      await expect(
        triggerBatchJob(
          { jobType: 'invalid-job-type' as any },
          mockContext
        )
      ).rejects.toThrow('invalid-argument');
    });

    it('should accept valid job types', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      const result1 = await triggerBatchJob(
        { jobType: 'weekly-pattern-extraction' },
        mockContext
      );
      expect(result1.success).toBe(true);

      const result2 = await triggerBatchJob(
        { jobType: 'knowledge-maintenance' },
        mockContext
      );
      expect(result2.success).toBe(true);
    });

    it('should validate target period dates', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      // Invalid date format
      await expect(
        triggerBatchJob(
          {
            jobType: 'weekly-pattern-extraction',
            targetPeriod: {
              startDate: 'invalid-date',
              endDate: '2025-01-01',
            },
          },
          mockContext
        )
      ).rejects.toThrow('invalid-argument');

      // Start date after end date
      await expect(
        triggerBatchJob(
          {
            jobType: 'weekly-pattern-extraction',
            targetPeriod: {
              startDate: '2025-01-10',
              endDate: '2025-01-01',
            },
          },
          mockContext
        )
      ).rejects.toThrow('invalid-argument');
    });

    it('should accept valid target period', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      const result = await triggerBatchJob(
        {
          jobType: 'weekly-pattern-extraction',
          targetPeriod: {
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-01-07T23:59:59Z',
          },
        },
        mockContext
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Pub/Sub Integration', () => {
    it('should publish message to correct topic', async () => {
      const { PubSub } = require('@google-cloud/pubsub');
      const mockPublish = jest.fn().mockResolvedValue('test-message-id');
      const mockTopic = jest.fn(() => ({ publish: mockPublish }));

      (PubSub as jest.Mock).mockImplementation(() => ({
        topic: mockTopic,
      }));

      const { triggerBatchJob } = require('../triggerBatchJob');

      await triggerBatchJob(
        { jobType: 'weekly-pattern-extraction' },
        mockContext
      );

      expect(mockTopic).toHaveBeenCalledWith(
        'firebase-schedule-weeklyPatternExtraction-asia-northeast1'
      );
      expect(mockPublish).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log manual trigger to Firestore', async () => {
      const { triggerBatchJob } = require('../triggerBatchJob');

      await triggerBatchJob(
        {
          jobType: 'weekly-pattern-extraction',
          targetPeriod: {
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-01-07T23:59:59Z',
          },
        },
        mockContext
      );

      const manualTriggerLogsCollection = mockDb.collection('manualTriggerLogs');
      expect(manualTriggerLogsCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          jobType: 'weekly-pattern-extraction',
          triggeredBy: 'test-user-id',
          triggeredByEmail: 'admin@trias.co.jp',
        })
      );
    });
  });
});
