/**
 * Enhanced Claude API Service with Vector Search Integration
 *
 * Extends the base Claude service with:
 * - Automatic knowledge base search
 * - Context-aware knowledge injection
 * - Relevance scoring and filtering
 * - Learning pattern extraction
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { callClaudeWithCaching } from './claudeService';
import type { ClaudeAPIRequest, ClaudeAPIResponse } from '../types/claude';
import type { Knowledge, SystemPromptSection } from '../types/firestore';

const functions = getFunctions();
const db = getFirestore();

interface VectorSearchResult {
  knowledge: Knowledge;
  similarity: number;
  distance: number;
}

interface EnhancedClaudeRequest extends ClaudeAPIRequest {
  enableKnowledgeSearch?: boolean;
  searchThreshold?: number;
  maxKnowledgeItems?: number;
}

/**
 * Searches knowledge base using vector search
 */
async function searchKnowledgeBase(
  projectId: string,
  query: string,
  threshold: number = 0.7,
  limit: number = 5
): Promise<Knowledge[]> {
  try {
    const vectorSearch = httpsCallable(functions, 'vectorSearch');

    const response = await vectorSearch({
      projectId,
      queryText: query,
      limit,
      threshold,
    });

    const data = response.data as {
      success: boolean;
      results: VectorSearchResult[];
    };

    if (data.success) {
      // Return knowledge entries sorted by similarity
      return data.results.map((result) => result.knowledge);
    }

    return [];
  } catch (error) {
    console.error('Knowledge search error:', error);
    return [];
  }
}

/**
 * Builds enhanced knowledge context with relevance metadata
 */
function buildEnhancedKnowledgeContext(
  knowledgeEntries: Knowledge[],
  searchQuery: string
): string {
  if (knowledgeEntries.length === 0) {
    return '関連するナレッジが見つかりませんでした。';
  }

  const contextParts = knowledgeEntries.map((knowledge, index) => {
    const metadata: string[] = [];

    if (knowledge.metadata?.documentName) {
      metadata.push(`出典: ${knowledge.metadata.documentName}`);
    }

    if (knowledge.metadata?.pageNumber) {
      metadata.push(`ページ: ${knowledge.metadata.pageNumber}`);
    }

    if (knowledge.category) {
      metadata.push(`カテゴリ: ${knowledge.category}`);
    }

    const metadataText = metadata.length > 0 ? `\n[${metadata.join(' | ')}]` : '';

    return `【ナレッジ ${index + 1}】${metadataText}\n${knowledge.content}`;
  });

  return contextParts.join('\n\n');
}

/**
 * Calls Claude API with enhanced knowledge base context
 */
export async function callClaudeWithKnowledge(
  request: EnhancedClaudeRequest,
  getSystemPrompts: () => Promise<SystemPromptSection[]>
): Promise<ClaudeAPIResponse> {
  const {
    projectId,
    userMessage,
    conversationHistory = [],
    enableKnowledgeSearch = true,
    searchThreshold = 0.7,
    maxKnowledgeItems = 5,
  } = request;

  // Create knowledge search function
  const searchProjectKnowledge = async (
    pid: string,
    query: string
  ): Promise<Knowledge[]> => {
    if (!enableKnowledgeSearch) {
      return [];
    }

    return await searchKnowledgeBase(pid, query, searchThreshold, maxKnowledgeItems);
  };

  // Call Claude API with caching and knowledge search
  const response = await callClaudeWithCaching(
    {
      projectId,
      userMessage,
      conversationHistory,
    },
    getSystemPrompts,
    searchProjectKnowledge
  );

  // Extract and store learning patterns
  if (response.success) {
    await extractAndStoreLearningPatterns(
      projectId,
      userMessage,
      response.content,
      response.usage
    );
  }

  return response;
}

/**
 * Extracts learning patterns from conversation
 */
async function extractAndStoreLearningPatterns(
  projectId: string,
  userMessage: string,
  aiResponse: string,
  usage: any
): Promise<void> {
  try {
    // Extract keywords using simple TF-IDF-like approach
    const keywords = extractKeywords(userMessage);

    // Extract response patterns
    const responseLength = aiResponse.length;
    const sentenceCount = aiResponse.split(/[。！？.!?]/).filter((s) => s.trim()).length;

    // Store learning pattern
    await addDoc(collection(db, 'learningPatterns'), {
      projectId,
      keywords,
      queryLength: userMessage.length,
      responseLength,
      sentenceCount,
      tokenUsage: usage,
      extractedAt: serverTimestamp(),
      frequency: 1, // Will be updated by aggregation
    });
  } catch (error) {
    console.error('Learning pattern extraction error:', error);
    // Non-critical error, continue execution
  }
}

/**
 * Simple keyword extraction
 */
function extractKeywords(text: string, topN: number = 10): string[] {
  // Remove common Japanese particles and English stop words
  const stopWords = new Set([
    'は',
    'が',
    'を',
    'に',
    'の',
    'と',
    'で',
    'から',
    'まで',
    'より',
    'ます',
    'です',
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
  ]);

  // Split into words
  const words = text
    .toLowerCase()
    .split(/[\s、。！？,.!?]+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  // Count frequency
  const freq: Record<string, number> = {};
  words.forEach((word) => {
    freq[word] = (freq[word] || 0) + 1;
  });

  // Sort by frequency and take top N
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);

  return sorted;
}

/**
 * Analyzes knowledge base relevance for a query
 */
export async function analyzeKnowledgeRelevance(
  projectId: string,
  query: string
): Promise<{
  hasRelevantKnowledge: boolean;
  topResults: VectorSearchResult[];
  avgSimilarity: number;
  recommendedThreshold: number;
}> {
  try {
    const vectorSearch = httpsCallable(functions, 'vectorSearch');

    const response = await vectorSearch({
      projectId,
      queryText: query,
      limit: 10,
      threshold: 0.5, // Lower threshold for analysis
    });

    const data = response.data as {
      success: boolean;
      results: VectorSearchResult[];
    };

    if (!data.success || data.results.length === 0) {
      return {
        hasRelevantKnowledge: false,
        topResults: [],
        avgSimilarity: 0,
        recommendedThreshold: 0.7,
      };
    }

    const topResults = data.results.slice(0, 3);
    const avgSimilarity =
      data.results.reduce((sum, r) => sum + r.similarity, 0) / data.results.length;

    // Recommend threshold based on results
    let recommendedThreshold = 0.7;
    if (avgSimilarity >= 0.8) {
      recommendedThreshold = 0.75; // Higher quality results
    } else if (avgSimilarity < 0.6) {
      recommendedThreshold = 0.6; // Lower threshold for sparse knowledge
    }

    return {
      hasRelevantKnowledge: topResults[0].similarity >= recommendedThreshold,
      topResults,
      avgSimilarity,
      recommendedThreshold,
    };
  } catch (error) {
    console.error('Knowledge relevance analysis error:', error);
    return {
      hasRelevantKnowledge: false,
      topResults: [],
      avgSimilarity: 0,
      recommendedThreshold: 0.7,
    };
  }
}

/**
 * Batch processes multiple queries with knowledge search
 */
export async function batchProcessWithKnowledge(
  requests: EnhancedClaudeRequest[],
  getSystemPrompts: () => Promise<SystemPromptSection[]>
): Promise<ClaudeAPIResponse[]> {
  const responses: ClaudeAPIResponse[] = [];

  for (const request of requests) {
    try {
      const response = await callClaudeWithKnowledge(request, getSystemPrompts);
      responses.push(response);

      // Add delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Batch processing error:', error);
      responses.push({
        success: false,
        content: '',
        usage: { inputTokens: 0, outputTokens: 0 },
        cacheHitRate: 0,
        costSavings: 0,
        securityFlags: [],
      });
    }
  }

  return responses;
}
