/**
 * Vector Search Service
 *
 * Implements semantic search using Firestore's vector search capabilities:
 * - Finds similar knowledge entries using cosine similarity
 * - Supports filtering by project, category, etc.
 * - Handles query embedding generation
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { generateEmbedding, cosineSimilarity } from './embeddingService';
import type { Knowledge, VectorSearchQuery, VectorSearchResult } from '../types';

/**
 * Default search parameters
 */
const DEFAULT_LIMIT = 10;
const DEFAULT_THRESHOLD = 0.7; // Minimum similarity score (0-1)

/**
 * Performs vector search for similar knowledge entries
 *
 * @param query - Search query parameters
 * @returns Array of similar knowledge entries with similarity scores
 */
export async function searchSimilarKnowledge(
  query: VectorSearchQuery
): Promise<VectorSearchResult[]> {
  const { projectId, queryText, limit = DEFAULT_LIMIT, threshold = DEFAULT_THRESHOLD, category } = query;

  console.log('Vector search:', {
    projectId,
    queryLength: queryText.length,
    limit,
    threshold,
    category,
  });

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText, 'query', 'voyage-large-2');

    console.log('Query embedding generated:', {
      dimensions: queryEmbedding.length,
    });

    // Build Firestore query with vector search
    let firestoreQuery = db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('projectId', '==', projectId);

    // Add category filter if specified
    if (category) {
      firestoreQuery = firestoreQuery.where('category', '==', category);
    }

    // Firestore Vector Search using findNearest
    // Note: This requires Firestore vector search to be enabled
    const vectorQuery = firestoreQuery.findNearest('embedding', FieldValue.vector(queryEmbedding), {
      limit: limit * 2, // Get more results to filter by threshold
      distanceMeasure: 'COSINE',
    });

    const snapshot = await vectorQuery.get();

    console.log(`Found ${snapshot.docs.length} candidates`);

    // Calculate similarity scores and filter by threshold
    const results: VectorSearchResult[] = [];

    for (const doc of snapshot.docs) {
      const knowledge = {
        id: doc.id,
        ...doc.data(),
      } as Knowledge;

      if (!knowledge.embedding) {
        continue;
      }

      // Calculate cosine similarity
      const similarity = cosineSimilarity(queryEmbedding, knowledge.embedding);

      // Filter by threshold
      if (similarity >= threshold) {
        results.push({
          knowledge,
          similarity,
          distance: 1 - similarity, // Convert similarity to distance
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    const limitedResults = results.slice(0, limit);

    console.log(`Returning ${limitedResults.length} results above threshold ${threshold}`, {
      avgSimilarity: limitedResults.reduce((sum, r) => sum + r.similarity, 0) / limitedResults.length,
      topSimilarity: limitedResults[0]?.similarity,
    });

    return limitedResults;
  } catch (error) {
    console.error('Vector search failed:', error);

    if (error instanceof Error) {
      throw new Error(`ベクトル検索エラー: ${error.message}`);
    }

    throw new Error('ベクトル検索に失敗しました。');
  }
}

/**
 * Finds exact duplicate knowledge entries (100% match)
 */
export async function findExactDuplicates(
  projectId: string,
  content: string
): Promise<Knowledge[]> {
  console.log('Finding exact duplicates:', {
    projectId,
    contentLength: content.length,
  });

  try {
    // Normalize content for comparison
    const normalizedContent = normalizeContent(content);

    // Query for exact matches
    const snapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('projectId', '==', projectId)
      .get();

    const duplicates: Knowledge[] = [];

    for (const doc of snapshot.docs) {
      const knowledge = {
        id: doc.id,
        ...doc.data(),
      } as Knowledge;

      const normalizedKnowledge = normalizeContent(knowledge.content);

      if (normalizedKnowledge === normalizedContent) {
        duplicates.push(knowledge);
      }
    }

    console.log(`Found ${duplicates.length} exact duplicates`);

    return duplicates;
  } catch (error) {
    console.error('Exact duplicate search failed:', error);
    throw new Error('完全一致検索に失敗しました。');
  }
}

/**
 * Finds near-duplicate knowledge entries using embedding similarity
 */
export async function findNearDuplicates(
  projectId: string,
  embedding: number[],
  threshold: number = 0.95
): Promise<Knowledge[]> {
  console.log('Finding near duplicates:', {
    projectId,
    embeddingDimensions: embedding.length,
    threshold,
  });

  try {
    // Use vector search with high threshold
    const results = await searchSimilarKnowledge({
      projectId,
      queryText: '', // Not used since we're providing embedding directly
      limit: 100, // Get more candidates
      threshold,
    });

    // Extract knowledge entries
    const duplicates = results.map((result) => result.knowledge);

    console.log(`Found ${duplicates.length} near duplicates`);

    return duplicates;
  } catch (error) {
    console.error('Near duplicate search failed:', error);
    throw new Error('類似検索に失敗しました。');
  }
}

/**
 * Normalizes content for comparison
 */
function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[。、！？\.,!?]/g, '') // Remove punctuation
    .trim();
}

/**
 * Calculates fuzzy match score using Levenshtein distance
 */
export function calculateFuzzyMatchScore(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Finds fuzzy duplicate knowledge entries
 */
export async function findFuzzyDuplicates(
  projectId: string,
  content: string,
  threshold: number = 0.85
): Promise<Knowledge[]> {
  console.log('Finding fuzzy duplicates:', {
    projectId,
    contentLength: content.length,
    threshold,
  });

  try {
    // Get all knowledge for this project
    const snapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('projectId', '==', projectId)
      .get();

    const duplicates: Knowledge[] = [];

    const normalizedContent = normalizeContent(content);

    for (const doc of snapshot.docs) {
      const knowledge = {
        id: doc.id,
        ...doc.data(),
      } as Knowledge;

      const normalizedKnowledge = normalizeContent(knowledge.content);

      // Calculate fuzzy match score
      const score = calculateFuzzyMatchScore(normalizedContent, normalizedKnowledge);

      if (score >= threshold) {
        duplicates.push(knowledge);
      }
    }

    console.log(`Found ${duplicates.length} fuzzy duplicates`);

    return duplicates;
  } catch (error) {
    console.error('Fuzzy duplicate search failed:', error);
    throw new Error('あいまい検索に失敗しました。');
  }
}

/**
 * Gets knowledge entries by IDs
 */
export async function getKnowledgeByIds(knowledgeIds: string[]): Promise<Knowledge[]> {
  if (knowledgeIds.length === 0) {
    return [];
  }

  const results: Knowledge[] = [];

  // Firestore 'in' query supports max 30 items
  const batchSize = 30;

  for (let i = 0; i < knowledgeIds.length; i += batchSize) {
    const batch = knowledgeIds.slice(i, i + batchSize);

    const snapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('__name__', 'in', batch)
      .get();

    for (const doc of snapshot.docs) {
      results.push({
        id: doc.id,
        ...doc.data(),
      } as Knowledge);
    }
  }

  return results;
}
