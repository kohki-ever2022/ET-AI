/**
 * Chat Approval Trigger
 *
 * Firestore trigger that automatically adds approved chats to the knowledge base.
 * Implements 3-layer deduplication to prevent duplicate knowledge entries.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateEmbedding } from '../services/embeddingService';
import { searchSimilarKnowledge } from '../services/vectorSearchService';

const db = admin.firestore();

/**
 * Triggered when a chat document is updated
 * Adds approved chats to the knowledge base
 */
export const onChatApproved = functions.firestore
  .document('chats/{chatId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const chatId = context.params.chatId;

    // Only process when chat is newly approved
    if (before.approved === true || after.approved !== true) {
      return null;
    }

    console.log(`Processing approved chat: ${chatId}`);

    try {
      const content = after.aiResponse;
      const projectId = after.projectId;
      const channelId = after.channelId;

      // Step 1: Check for exact match (Layer 1)
      console.log('Checking for exact matches...');
      const exactMatch = await db
        .collection('knowledge')
        .where('projectId', '==', projectId)
        .where('content', '==', content)
        .limit(1)
        .get();

      if (!exactMatch.empty) {
        console.log(`Exact match found: ${exactMatch.docs[0].id}`);

        // Update usage count of existing knowledge
        await exactMatch.docs[0].ref.update({
          usageCount: admin.firestore.FieldValue.increment(1),
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark chat as added to knowledge
        await change.after.ref.update({
          addedToKnowledge: true,
          knowledgeId: exactMatch.docs[0].id,
        });

        return null;
      }

      // Step 2: Generate embedding
      console.log('Generating embedding...');
      const embedding = await generateEmbedding(content);

      // Step 3: Check for high similarity (Layer 2: 95%+)
      console.log('Checking for high similarity matches...');
      const similarKnowledge = await searchSimilarKnowledge({
        projectId,
        queryText: content,
        limit: 1,
        threshold: 0.95, // 95% similarity threshold
      });

      if (similarKnowledge.length > 0) {
        console.log(`High similarity match found: ${similarKnowledge[0].knowledge.id} (${(similarKnowledge[0].similarity * 100).toFixed(1)}%)`);

        // Update usage count of similar knowledge
        await db
          .collection('knowledge')
          .doc(similarKnowledge[0].knowledge.id)
          .update({
            usageCount: admin.firestore.FieldValue.increment(1),
            lastUsed: admin.firestore.FieldValue.serverTimestamp(),
          });

        // Mark chat as added to knowledge (linked to similar entry)
        await change.after.ref.update({
          addedToKnowledge: true,
          knowledgeId: similarKnowledge[0].knowledge.id,
          similarityScore: similarKnowledge[0].similarity,
        });

        return null;
      }

      // Step 4: Add as new knowledge (no duplicates found)
      console.log('Adding as new knowledge entry...');

      const category = inferCategory(channelId, after.userMessage);
      const reliability = calculateReliability(after);

      const knowledgeRef = await db.collection('knowledge').add({
        projectId,
        sourceType: 'approved-chat',
        sourceId: chatId,
        content,
        embedding,
        category,
        reliability,
        usageCount: 1,
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          channelId,
          originalQuestion: after.userMessage,
          approvedBy: after.approvedBy,
          approvedAt: after.approvedAt,
        },
      });

      console.log(`New knowledge added: ${knowledgeRef.id}`);

      // Step 5: Update chat with knowledge reference
      await change.after.ref.update({
        addedToKnowledge: true,
        knowledgeId: knowledgeRef.id,
      });

      // Step 6: Update project statistics
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          approvedChatCount: admin.firestore.FieldValue.increment(1),
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        });

      return null;
    } catch (error) {
      console.error('Error in onChatApproved trigger:', error);

      // Log error but don't fail the trigger
      await db.collection('errorLogs').add({
        trigger: 'onChatApproved',
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark chat as having an error
      await change.after.ref.update({
        addedToKnowledge: false,
        knowledgeError: error instanceof Error ? error.message : 'Unknown error',
      });

      return null;
    }
  });

/**
 * Infer knowledge category from channel and content
 */
function inferCategory(
  channelId: string,
  userMessage: string
): string {
  // Simple keyword-based categorization
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('財務') || lowerMessage.includes('financial')) {
    return 'financial';
  }
  if (lowerMessage.includes('esg') || lowerMessage.includes('環境') || lowerMessage.includes('社会')) {
    return 'esg';
  }
  if (lowerMessage.includes('ガバナンス') || lowerMessage.includes('governance')) {
    return 'governance';
  }
  if (lowerMessage.includes('戦略') || lowerMessage.includes('strategy')) {
    return 'strategy';
  }
  if (lowerMessage.includes('人材') || lowerMessage.includes('人的資本')) {
    return 'human-capital';
  }

  // Default category
  return 'company-info';
}

/**
 * Calculate reliability score based on chat metadata
 */
function calculateReliability(chatData: any): number {
  let reliability = 90; // Base reliability for approved chats

  // Increase reliability if modified and approved
  if (chatData.modifiedHistory && chatData.modifiedHistory.length > 0) {
    reliability = Math.min(95, reliability + 5);
  }

  // Decrease reliability if response is very short
  if (chatData.aiResponse.length < 100) {
    reliability -= 10;
  }

  // Increase reliability if response is detailed
  if (chatData.aiResponse.length > 500) {
    reliability = Math.min(100, reliability + 5);
  }

  return Math.max(50, Math.min(100, reliability));
}
