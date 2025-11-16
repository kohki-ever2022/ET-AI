/**
 * Firebase Admin SDK Configuration
 *
 * Centralized configuration for Firebase services used across Cloud Functions.
 * This module provides typed access to Firestore and Storage with proper initialization.
 */

import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export Firebase Admin instances
export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
export const FieldValueExport = FieldValue;
export { Timestamp };

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

/**
 * Collection names (matching types/firestore.ts)
 */
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  CHANNELS: 'channels',
  CHATS: 'chats',
  KNOWLEDGE: 'knowledge',
  DOCUMENTS: 'documents',
  SYSTEM_PROMPTS: 'system_prompts',
  LEARNING_PATTERNS: 'learningPatterns',
  CACHE_METRICS: 'cacheMetrics',
  ERROR_LOGS: 'error_logs',
  CHAT_STATUS: 'chat_status',
  KNOWLEDGE_GROUPS: 'knowledgeGroups',
} as const;

/**
 * Storage bucket paths
 */
export const STORAGE_PATHS = {
  DOCUMENTS: 'documents',
  PROCESSED: 'processed',
  TEMP: 'temp',
} as const;

/**
 * Helper to get collection reference with type safety
 */
export function getCollection<T = admin.firestore.DocumentData>(
  collectionName: string
): admin.firestore.CollectionReference<T> {
  return db.collection(collectionName) as admin.firestore.CollectionReference<T>;
}

/**
 * Helper to get document reference with type safety
 */
export function getDocument<T = admin.firestore.DocumentData>(
  collectionName: string,
  documentId: string
): admin.firestore.DocumentReference<T> {
  return db.collection(collectionName).doc(documentId) as admin.firestore.DocumentReference<T>;
}

/**
 * Helper to create server timestamp
 */
export function serverTimestamp(): admin.firestore.FieldValue {
  return FieldValue.serverTimestamp();
}

/**
 * Helper to increment a field
 */
export function increment(value: number): admin.firestore.FieldValue {
  return FieldValue.increment(value);
}

/**
 * Helper to create array union
 */
export function arrayUnion(...elements: any[]): admin.firestore.FieldValue {
  return FieldValue.arrayUnion(...elements);
}

/**
 * Helper to create array remove
 */
export function arrayRemove(...elements: any[]): admin.firestore.FieldValue {
  return FieldValue.arrayRemove(...elements);
}

/**
 * Error logging helper
 */
export interface ErrorLogData {
  userId?: string;
  projectId?: string;
  channelId?: string;
  errorType: 'rate_limit' | 'token_limit' | 'api_error' | 'network_error' | 'validation_error';
  errorMessage: string;
  stackTrace?: string;
  userMessage?: string;
  context?: Record<string, any>;
  timestamp: admin.firestore.FieldValue;
}

/**
 * Log error to Firestore
 */
export async function logError(errorData: Omit<ErrorLogData, 'timestamp'>): Promise<void> {
  try {
    await getCollection(COLLECTIONS.ERROR_LOGS).add({
      ...errorData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Fallback to console if Firestore logging fails
    console.error('[Error Logging Failed]', errorData, error);
  }
}

/**
 * Cache metrics logging helper
 */
export interface CacheMetricsData {
  projectId: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  cacheHitRate: number;
  costSavings: number;
  layer1HitRate: number;
  layer2HitRate: number;
  layer3HitRate: number;
  timestamp: admin.firestore.FieldValue;
}

/**
 * Log cache metrics to Firestore
 */
export async function logCacheMetrics(
  metricsData: Omit<CacheMetricsData, 'timestamp'>
): Promise<void> {
  try {
    await getCollection(COLLECTIONS.CACHE_METRICS).add({
      ...metricsData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('[Cache Metrics Logging Failed]', metricsData, error);
  }
}
