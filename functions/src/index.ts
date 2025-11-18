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
 */
export const vectorSearch = functions.https.onCall(async (data, context) => {
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
    version: '2.0.0',
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
    ],
  });
});
