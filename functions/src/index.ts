/**
 * ET-AI Cloud Functions
 *
 * Firebase Cloud Functions for ET-AI backend services:
 * - File upload and processing (PDF/DOCX)
 * - Text extraction and chunking
 * - Embedding generation with Voyage AI
 * - Knowledge management and deduplication
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Firestore and Storage instances
export const db = admin.firestore();
export const storage = admin.storage();

// ============================================================================
// File Processing Functions
// ============================================================================

export { processFileUpload, reprocessDocument } from './fileProcessing';

// ============================================================================
// Vector Search Functions
// ============================================================================

import { searchSimilarKnowledge } from './services/vectorSearchService';
import { getDuplicateStats } from './services/deduplicationService';

/**
 * Vector search HTTP endpoint
 *
 * Scaling Configuration:
 * - maxInstances: 50 (increased from 10 for 50-user support)
 * - minInstances: 2 (prevents cold starts)
 * - memory: 512MB
 * - timeout: 60s
 */
export const vectorSearch = functions
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60,
    maxInstances: 50,
    minInstances: 2,
  })
  .https.onCall(async (data, context) => {
    const { projectId, queryText, limit, threshold, category } = data;

  if (!projectId || !queryText) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'projectIdとqueryTextは必須です。'
    );
  }

  try {
    const results = await searchSimilarKnowledge({
      projectId,
      queryText,
      limit,
      threshold,
      category,
    });

    return {
      success: true,
      results,
      count: results.length,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'ベクトル検索に失敗しました。'
    );
  }
});

/**
 * Get duplicate statistics endpoint
 */
export const duplicateStats = functions.https.onCall(async (data, context) => {
  const { projectId } = data;

  if (!projectId) {
    throw new functions.https.HttpsError('invalid-argument', 'projectIdは必須です。');
  }

  try {
    const stats = await getDuplicateStats(projectId);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : '統計情報の取得に失敗しました。'
    );
  }
});

// ============================================================================
// Cost Monitoring Functions
// ============================================================================

export {
  checkBudgets,
  generateDailyCostReport,
  cleanupOldCostRecords,
} from './scheduledCostMonitoring';

// ============================================================================
// Chat Processing Functions
// ============================================================================

export { processChat } from './api/processChat';

// ============================================================================
// Firestore Triggers
// ============================================================================

export { onChatApproved } from './triggers/onChatApproved';
export { onChatModified } from './triggers/onChatModified';

// ============================================================================
// Rate Limit Monitoring (Phase 2)
// ============================================================================

export {
  monitorRateLimits,
  cleanupOldAlerts,
  generateDailyRateLimitReport,
} from './monitoring/rateLimitMonitor';

// ============================================================================
// Archive System (Phase 3)
// ============================================================================

export { scheduledArchiveJob } from './services/archiveService';

import { manualArchive, getArchiveStatistics, unarchiveChat, unarchiveChannel } from './services/archiveService';

/**
 * Manual archive trigger (callable function)
 */
export const runManualArchive = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { target, dryRun } = data;

  try {
    const result = await manualArchive({ target, dryRun });
    return {
      success: true,
      result,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Archive failed'
    );
  }
});

/**
 * Get archive statistics (callable function)
 */
export const getArchiveStats = functions.https.onCall(async (data, context) => {
  try {
    const stats = await getArchiveStatistics();
    return {
      success: true,
      stats,
    };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to get archive statistics'
    );
  }
});

/**
 * Unarchive chat (callable function)
 */
export const unarchiveChatFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { chatId } = data;

  if (!chatId) {
    throw new functions.https.HttpsError('invalid-argument', 'chatId is required');
  }

  try {
    await unarchiveChat(chatId);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to unarchive chat'
    );
  }
});

/**
 * Unarchive channel (callable function)
 */
export const unarchiveChannelFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { channelId } = data;

  if (!channelId) {
    throw new functions.https.HttpsError('invalid-argument', 'channelId is required');
  }

  try {
    await unarchiveChannel(channelId);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to unarchive channel'
    );
  }
});

// ============================================================================
// Denormalization Service (Phase 3)
// ============================================================================

import {
  propagateUserUpdate,
  propagateProjectUpdate,
  propagateChannelUpdate,
} from './services/denormalizationService';

/**
 * Firestore trigger: User update
 */
export const onUserUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const { userId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    try {
      await propagateUserUpdate(userId, {
        name: after.name,
        email: after.email,
        photoURL: after.photoURL,
      });
    } catch (error) {
      console.error('Failed to propagate user update:', error);
    }
  });

/**
 * Firestore trigger: Project update
 */
export const onProjectUpdate = functions.firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    const { projectId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    try {
      await propagateProjectUpdate(projectId, {
        name: after.name,
        description: after.description,
      });
    } catch (error) {
      console.error('Failed to propagate project update:', error);
    }
  });

/**
 * Firestore trigger: Channel update
 */
export const onChannelUpdate = functions.firestore
  .document('channels/{channelId}')
  .onUpdate(async (change, context) => {
    const { channelId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    try {
      await propagateChannelUpdate(channelId, {
        name: after.name,
        description: after.description,
      });
    } catch (error) {
      console.error('Failed to propagate channel update:', error);
    }
  });

// ============================================================================
// Reduction Validator (Phase 3)
// ============================================================================

import { runComprehensiveValidation, generateValidationReport } from './services/reductionValidator';

/**
 * Run read reduction validation (callable function)
 */
export const validateReadReduction = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
  })
  .https.onCall(async (data, context) => {
    // Require authentication (admin only)
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    try {
      const validation = await runComprehensiveValidation();
      const report = generateValidationReport(validation);

      return {
        success: true,
        validation,
        report,
      };
    } catch (error) {
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Validation failed'
      );
    }
  });

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check function
 */
export const healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ET-AI Cloud Functions',
    version: '3.0.0',
    features: [
      'File Processing (PDF/DOCX)',
      'Text Extraction',
      'Document Chunking',
      'Voyage AI Embeddings',
      'Vector Search',
      '3-Layer Deduplication',
      'Cost Monitoring & Alerts',
      'Chat Processing with RAG',
      'Auto Knowledge Addition',
      'Learning Pattern Extraction',
      'Phase 2: React Query + Caching',
      'Phase 2: Rate Limit Queue System',
      'Phase 2: Performance Monitoring',
      'Phase 3: Archive System (90-day)',
      'Phase 3: Denormalization Service',
      'Phase 3: Read Reduction Validator',
    ],
  });
});
