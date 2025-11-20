/**
 * Processing Queue Service
 *
 * Firestore-based persistent queue for managing concurrent chat processing.
 * Ensures that only MAX_CONCURRENT chats are processed simultaneously across
 * all Cloud Functions instances.
 */

import * as admin from 'firebase-admin';
import type { ProcessingQueueItem } from '../types';

const db = admin.firestore();

const QUEUE_COLLECTION = 'processingQueue';
const MAX_CONCURRENT = 5;
const QUEUE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Add a chat to the processing queue
 */
export async function enqueueChat(
  chatId: string,
  projectId: string
): Promise<{ position: number; queueId: string }> {
  // Clean up stale queue items first
  await cleanupStaleQueueItems();

  // Get current queue position
  const queueSnapshot = await db
    .collection(QUEUE_COLLECTION)
    .where('status', 'in', ['queued', 'processing'])
    .orderBy('createdAt', 'asc')
    .get();

  const position = queueSnapshot.size + 1;

  // Add to queue
  const queueRef = await db.collection(QUEUE_COLLECTION).add({
    chatId,
    projectId,
    status: 'queued',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  } as Partial<ProcessingQueueItem>);

  console.log(`Chat ${chatId} added to queue at position ${position}`);

  return { position, queueId: queueRef.id };
}

/**
 * Wait until chat can start processing (queue position available)
 */
export async function waitForQueueSlot(queueId: string): Promise<void> {
  const maxWaitTime = 10 * 60 * 1000; // 10 minutes max wait
  const startTime = Date.now();
  const pollInterval = 1000; // Check every second

  while (Date.now() - startTime < maxWaitTime) {
    // Clean up stale items
    await cleanupStaleQueueItems();

    // Get current processing count
    const processingSnapshot = await db
      .collection(QUEUE_COLLECTION)
      .where('status', '==', 'processing')
      .get();

    const processingCount = processingSnapshot.size;

    if (processingCount < MAX_CONCURRENT) {
      // Slot available - mark as processing
      await db.collection(QUEUE_COLLECTION).doc(queueId).update({
        status: 'processing',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Chat from queue ${queueId} started processing (${processingCount + 1}/${MAX_CONCURRENT})`);
      return;
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Queue wait timeout exceeded');
}

/**
 * Mark chat processing as completed and remove from queue
 */
export async function dequeueChat(
  queueId: string,
  status: 'completed' | 'failed'
): Promise<void> {
  try {
    await db.collection(QUEUE_COLLECTION).doc(queueId).update({
      status,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Chat queue ${queueId} marked as ${status}`);

    // Delete the queue item after a short delay (for debugging)
    setTimeout(async () => {
      try {
        await db.collection(QUEUE_COLLECTION).doc(queueId).delete();
      } catch (error) {
        console.error('Error deleting queue item:', error);
      }
    }, 5000); // 5 seconds
  } catch (error) {
    console.error('Error dequeuing chat:', error);
  }
}

/**
 * Get current queue position for a chat
 */
export async function getQueuePosition(queueId: string): Promise<number> {
  const queueDoc = await db.collection(QUEUE_COLLECTION).doc(queueId).get();

  if (!queueDoc.exists) {
    return -1;
  }

  const queueData = queueDoc.data() as ProcessingQueueItem;

  if (queueData.status === 'processing') {
    return 0; // Currently processing
  }

  if (queueData.status !== 'queued') {
    return -1; // Not in queue
  }

  // Count items ahead in queue
  const aheadSnapshot = await db
    .collection(QUEUE_COLLECTION)
    .where('status', '==', 'queued')
    .where('createdAt', '<', queueData.createdAt)
    .get();

  return aheadSnapshot.size + 1;
}

/**
 * Clean up stale queue items (stuck in processing for too long)
 */
async function cleanupStaleQueueItems(): Promise<void> {
  const staleThreshold = new Date(Date.now() - QUEUE_TIMEOUT_MS);

  try {
    const staleSnapshot = await db
      .collection(QUEUE_COLLECTION)
      .where('status', '==', 'processing')
      .where('startedAt', '<', admin.firestore.Timestamp.fromDate(staleThreshold))
      .get();

    if (staleSnapshot.empty) {
      return;
    }

    const batch = db.batch();
    let count = 0;

    staleSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'failed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: 'Processing timeout',
      });
      count++;
    });

    await batch.commit();

    if (count > 0) {
      console.warn(`Cleaned up ${count} stale queue items`);
    }
  } catch (error) {
    console.error('Error cleaning up stale queue items:', error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  queued: number;
  processing: number;
  available: number;
}> {
  const snapshot = await db
    .collection(QUEUE_COLLECTION)
    .where('status', 'in', ['queued', 'processing'])
    .get();

  let queued = 0;
  let processing = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as ProcessingQueueItem;
    if (data.status === 'queued') queued++;
    if (data.status === 'processing') processing++;
  });

  return {
    queued,
    processing,
    available: Math.max(0, MAX_CONCURRENT - processing),
  };
}
