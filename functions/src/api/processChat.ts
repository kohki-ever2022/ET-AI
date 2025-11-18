/**
 * Process Chat Cloud Function
 *
 * HTTP Callable Function that processes user chat messages through Claude API.
 * Includes status management, progress tracking, and comprehensive error handling.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { validateInput, validateOutput } from '../security/validation';
import { buildSystemPrompt } from '../prompts/buildPrompt';
import { callClaudeWithCaching } from '../services/claudeService';

const db = admin.firestore();

interface ProcessChatRequest {
  chatId: string;
  userMessage: string;
  projectId: string;
  channelId: string;
}

interface ChatStatus {
  status: 'queued' | 'processing' | 'completed' | 'error';
  queuePosition?: number;
  progress?: {
    step: string;
    percentage: number;
  };
  error?: {
    type: string;
    message: string;
    retryable: boolean;
  };
}

// Simple in-memory queue for rate limiting
const processingQueue = new Set<string>();
const MAX_CONCURRENT = 5;

/**
 * Process a chat message through Claude API
 */
export const processChat = functions.https.onCall(
  async (data: ProcessChatRequest, context) => {
    // Step 1: Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        '認証が必要です。ログインしてください。'
      );
    }

    const userId = context.auth.uid;
    const { chatId, userMessage, projectId, channelId } = data;

    // Validate required fields
    if (!chatId || !userMessage || !projectId || !channelId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '必須パラメータが不足しています。'
      );
    }

    console.log(`Processing chat request: ${chatId} from user: ${userId}`);

    try {
      // Step 2: Check if user has access to project
      const projectDoc = await db.collection('projects').doc(projectId).get();
      if (!projectDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'プロジェクトが見つかりません。');
      }

      const project = projectDoc.data();
      if (!project?.members.includes(userId)) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'このプロジェクトへのアクセス権限がありません。'
        );
      }

      // Step 3: Queue management
      await updateChatStatus(chatId, {
        status: 'queued',
        queuePosition: processingQueue.size + 1,
      });

      // Wait if queue is full
      while (processingQueue.size >= MAX_CONCURRENT) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      processingQueue.add(chatId);

      try {
        // Step 4: Input validation (security check)
        await updateChatStatus(chatId, {
          status: 'processing',
          progress: { step: '入力を検証中', percentage: 10 },
        });

        validateInput(userMessage);

        // Step 5: Build system prompt with RAG
        await updateChatStatus(chatId, {
          status: 'processing',
          progress: { step: 'システムプロンプト構築中', percentage: 20 },
        });

        const systemPrompt = await buildSystemPrompt(projectId, userMessage);

        // Step 6: Call Claude API with caching and retry
        await updateChatStatus(chatId, {
          status: 'processing',
          progress: { step: 'AI応答生成中', percentage: 40 },
        });

        const response = await callClaudeWithRetry(
          userMessage,
          systemPrompt,
          projectId,
          (percentage) => {
            updateChatStatus(chatId, {
              status: 'processing',
              progress: { step: 'AI応答生成中', percentage: 40 + percentage * 0.4 },
            }).catch(console.error);
          }
        );

        // Step 7: Output validation
        await updateChatStatus(chatId, {
          status: 'processing',
          progress: { step: '出力を検証中', percentage: 80 },
        });

        validateOutput(response.content);

        // Step 8: Save to Firestore
        await updateChatStatus(chatId, {
          status: 'processing',
          progress: { step: 'データを保存中', percentage: 90 },
        });

        await db.collection('chats').doc(chatId).set({
          channelId,
          projectId,
          userId,
          userName: context.auth.token.name || context.auth.token.email,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          userMessage,
          aiResponse: response.content,
          characterCount: response.content.length,
          approved: false,
          addedToKnowledge: false,
          metadata: {
            modelUsed: response.modelUsed,
            usage: response.usage,
            cacheHitRate: response.cacheHitRate,
            costSavings: response.costSavings,
          },
        });

        // Step 9: Update channel activity
        await db
          .collection('channels')
          .doc(channelId)
          .update({
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            messageCount: admin.firestore.FieldValue.increment(1),
          });

        // Step 10: Mark as completed
        await updateChatStatus(chatId, {
          status: 'completed',
          progress: { step: '完了', percentage: 100 },
        });

        console.log(`Chat processed successfully: ${chatId}`);

        return {
          success: true,
          chatId,
          characterCount: response.content.length,
          cacheHitRate: response.cacheHitRate,
        };
      } finally {
        // Remove from processing queue
        processingQueue.delete(chatId);
      }
    } catch (error) {
      console.error('Error processing chat:', error);

      // Log error to Firestore
      await logError(error, {
        userId,
        projectId,
        channelId,
        chatId,
        userMessage: userMessage.substring(0, 100), // First 100 chars only
      });

      // Update status to error
      await updateChatStatus(chatId, {
        status: 'error',
        error: {
          type: classifyError(error),
          message: getUserFriendlyErrorMessage(error),
          retryable: isRetryableError(error),
        },
      });

      // Throw user-friendly error
      throw new functions.https.HttpsError(
        'internal',
        getUserFriendlyErrorMessage(error)
      );
    }
  }
);

/**
 * Call Claude API with retry logic
 */
async function callClaudeWithRetry(
  userMessage: string,
  systemPrompt: string,
  projectId: string,
  onProgress?: (percentage: number) => void,
  maxRetries = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (onProgress) onProgress((attempt - 1) / maxRetries);

      const response = await callClaudeWithCaching({
        userMessage,
        systemPrompt,
        projectId,
      });

      if (onProgress) onProgress(1.0);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Claude API call failed (attempt ${attempt}/${maxRetries}):`, error);

      // Don't retry if it's a validation error
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Claude API call failed after retries');
}

/**
 * Update chat status in Firestore
 */
async function updateChatStatus(chatId: string, status: ChatStatus): Promise<void> {
  try {
    await db.collection('chatStatus').doc(chatId).set(
      {
        ...status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to update chat status:', error);
    // Don't throw - status updates are non-critical
  }
}

/**
 * Log error to Firestore
 */
async function logError(error: unknown, context: Record<string, any>): Promise<void> {
  try {
    await db.collection('errorLogs').add({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

/**
 * Classify error type
 */
function classifyError(error: unknown): string {
  if (error instanceof functions.https.HttpsError) {
    return error.code;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('rate limit') || message.includes('quota')) {
    return 'rate-limit';
  }
  if (message.includes('timeout')) {
    return 'timeout';
  }
  if (message.includes('network') || message.includes('ECONNREFUSED')) {
    return 'network';
  }
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 'auth';
  }

  return 'unknown';
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  const errorType = classifyError(error);
  return ['rate-limit', 'timeout', 'network'].includes(errorType);
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof functions.https.HttpsError) {
    return error.message;
  }

  const errorType = classifyError(error);

  switch (errorType) {
    case 'rate-limit':
      return 'リクエストが多すぎます。しばらく待ってから再試行してください。';
    case 'timeout':
      return 'タイムアウトしました。もう一度お試しください。';
    case 'network':
      return 'ネットワークエラーが発生しました。接続を確認してください。';
    case 'auth':
      return '認証エラーが発生しました。再度ログインしてください。';
    default:
      return 'エラーが発生しました。もう一度お試しください。';
  }
}
