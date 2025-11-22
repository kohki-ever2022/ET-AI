/**
 * Manual Trigger for Batch Jobs
 *
 * HTTP Callable Function that allows admins to manually trigger batch jobs.
 * Useful for testing and emergency maintenance.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';

const db = admin.firestore();
const pubsub = new PubSub();

/**
 * Request payload for triggering batch jobs
 */
export interface TriggerBatchJobRequest {
  jobType: 'weekly-pattern-extraction' | 'knowledge-maintenance';
  targetPeriod?: {
    startDate: string; // ISO 8601 format
    endDate: string;   // ISO 8601 format
  };
}

/**
 * Response payload
 */
export interface TriggerBatchJobResponse {
  success: boolean;
  messageId: string;
  message: string;
}

/**
 * HTTP Callable Function to manually trigger batch jobs
 *
 * @param data - Request payload
 * @param context - Function context with auth info
 * @returns Response with success status and message ID
 */
export const triggerBatchJob = functions
  .region('asia-northeast1')
  .https.onCall(async (data: TriggerBatchJobRequest, context): Promise<TriggerBatchJobResponse> => {
    // Step 1: Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to trigger batch jobs.'
      );
    }

    // Step 2: Check admin role
    try {
      const userDoc = await db.collection('users').doc(context.auth.uid).get();

      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only admins can trigger batch jobs.'
        );
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to verify user permissions.'
      );
    }

    const { jobType, targetPeriod } = data;

    // Step 3: Validate job type
    if (!jobType || !['weekly-pattern-extraction', 'knowledge-maintenance'].includes(jobType)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid job type. Must be "weekly-pattern-extraction" or "knowledge-maintenance".'
      );
    }

    // Step 4: Validate target period if provided
    if (targetPeriod) {
      try {
        const startDate = new Date(targetPeriod.startDate);
        const endDate = new Date(targetPeriod.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }

        if (startDate >= endDate) {
          throw new Error('Start date must be before end date');
        }
      } catch (error) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid target period. Dates must be in ISO 8601 format and startDate must be before endDate.'
        );
      }
    }

    console.log(`Manual trigger requested for job type: ${jobType}`, {
      uid: context.auth.uid,
      email: context.auth.token.email,
      targetPeriod,
    });

    try {
      // Step 5: Determine Pub/Sub topic name
      const topicName = getTopicName(jobType);

      // Step 6: Prepare message payload
      const messagePayload = {
        manualTrigger: true,
        triggeredBy: context.auth.uid,
        triggeredByEmail: context.auth.token.email,
        triggeredAt: new Date().toISOString(),
        ...(targetPeriod && { targetPeriod }),
      };

      // Step 7: Publish message to Pub/Sub
      const messageBuffer = Buffer.from(JSON.stringify(messagePayload));
      const messageId = await pubsub.topic(topicName).publish(messageBuffer);

      console.log(`Published message to ${topicName}: ${messageId}`);

      // Step 8: Log the manual trigger in Firestore
      await db.collection('manualTriggerLogs').add({
        jobType,
        messageId,
        triggeredBy: context.auth.uid,
        triggeredByEmail: context.auth.token.email,
        triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
        targetPeriod: targetPeriod || null,
      });

      return {
        success: true,
        messageId,
        message: `Batch job "${jobType}" triggered successfully. Message ID: ${messageId}`,
      };
    } catch (error) {
      console.error('Error triggering batch job:', error);

      // Log error to Firestore
      await db.collection('errorLogs').add({
        trigger: 'triggerBatchJob',
        jobType,
        userId: context.auth.uid,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      throw new functions.https.HttpsError(
        'internal',
        'Failed to trigger batch job.',
        error instanceof Error ? error.message : undefined
      );
    }
  });

/**
 * Get Pub/Sub topic name for a given job type
 */
function getTopicName(jobType: string): string {
  switch (jobType) {
    case 'weekly-pattern-extraction':
      return 'firebase-schedule-weeklyPatternExtraction-asia-northeast1';
    case 'knowledge-maintenance':
      return 'firebase-schedule-knowledgeMaintenance-asia-northeast1';
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}
