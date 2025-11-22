/**
 * Tests for Notification Service
 */

import { sendNotification, sendSlackNotification } from '../notificationService';
import * as functions from 'firebase-functions';

// Mock firebase-functions
jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({
    slack: {
      webhook_url: 'https://hooks.slack.com/services/test/webhook/url',
    },
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSlackNotification', () => {
    it('should send success notification to Slack', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      });

      await sendSlackNotification({
        type: 'success',
        jobId: 'test-job-123',
        duration: 5000,
        result: {
          projectsProcessed: 10,
          chatsAnalyzed: 100,
          knowledgeArchived: 5,
          patternsExtracted: {
            vocabulary: 5,
            structure: 3,
            emphasis: 2,
            tone: 4,
            length: 1,
          },
          duplicatesFound: 0,
          duplicatesMerged: 0,
        },
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook/url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.username).toBe('ET-AI Batch Job');
      expect(payload.icon_emoji).toBe(':white_check_mark:');
      expect(payload.attachments[0].color).toBe('#36a64f');
      expect(payload.attachments[0].title).toContain('Completed');
    });

    it('should send error notification to Slack', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      });

      await sendSlackNotification({
        type: 'error',
        jobId: 'test-job-456',
        error: 'Test error message',
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.icon_emoji).toBe(':x:');
      expect(payload.attachments[0].color).toBe('#ff0000');
      expect(payload.attachments[0].title).toContain('Failed');
    });

    it('should handle missing webhook URL gracefully', async () => {
      // Mock config to return undefined
      (functions.config as jest.Mock).mockReturnValueOnce({});

      await sendSlackNotification({
        type: 'success',
        jobId: 'test-job-789',
      });

      // Should not call fetch if webhook URL is not configured
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw error
      await expect(
        sendSlackNotification({
          type: 'success',
          jobId: 'test-job-error',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('sendNotification', () => {
    it('should delegate to sendSlackNotification', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      });

      await sendNotification({
        type: 'success',
        jobId: 'test-job-delegate',
        duration: 3000,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
