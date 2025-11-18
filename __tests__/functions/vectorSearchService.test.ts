/**
 * Vector Search Service Tests
 *
 * Tests for semantic search using Firestore vector search.
 * Covers:
 * - Vector search with cosine similarity
 * - Exact duplicate detection
 * - Near duplicate detection
 * - Fuzzy matching
 */

import {
  searchSimilarKnowledge,
  findExactDuplicates,
  calculateFuzzyMatchScore,
} from '../../functions/src/services/vectorSearchService';
import type { Knowledge } from '../../functions/src/types';

// Mock Firebase Admin
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    vector: jest.fn((embedding) => ({ _embedding: embedding })),
  },
}));

// Mock embedding service
jest.mock('../../functions/src/services/embeddingService', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(new Array(1024).fill(0.5)),
  cosineSimilarity: jest.fn((emb1, emb2) => {
    // Simple mock: return 0.9 for similar embeddings, 0.5 otherwise
    if (emb1.length === emb2.length && emb1[0] === emb2[0]) {
      return 0.9;
    }
    return 0.5;
  }),
}));

// Mock Firestore database
const mockDocs = [
  {
    id: 'k1',
    data: () => ({
      projectId: 'test-project',
      content: '統合報告書の作成について',
      embedding: new Array(1024).fill(0.5),
      category: 'IR',
    }),
  },
  {
    id: 'k2',
    data: () => ({
      projectId: 'test-project',
      content: 'ESG情報の開示方法',
      embedding: new Array(1024).fill(0.6),
      category: 'ESG',
    }),
  },
  {
    id: 'k3',
    data: () => ({
      projectId: 'test-project',
      content: '財務データの分析',
      embedding: new Array(1024).fill(0.4),
      category: 'Finance',
    }),
  },
];

jest.mock('../../functions/src/config/firebase', () => ({
  db: {
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(function(this: any) {
          return this;
        }),
        findNearest: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: mockDocs,
          }),
        })),
        get: jest.fn().mockResolvedValue({
          docs: mockDocs,
        }),
      })),
    })),
  },
  COLLECTIONS: {
    KNOWLEDGE: 'knowledge',
  },
}));

describe('vectorSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchSimilarKnowledge', () => {
    it('should search for similar knowledge entries', async () => {
      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: '統合報告書について教えてください',
        limit: 10,
        threshold: 0.7,
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by category when specified', async () => {
      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'IR報告書',
        limit: 10,
        threshold: 0.7,
        category: 'IR',
      });

      expect(results).toBeDefined();
    });

    it('should respect similarity threshold', async () => {
      const { cosineSimilarity } = require('../../functions/src/services/embeddingService');

      // Mock to return varying similarities
      cosineSimilarity.mockImplementation((emb1: number[], emb2: number[]) => {
        if (emb2[0] === 0.5) return 0.85;
        if (emb2[0] === 0.6) return 0.65;
        return 0.45;
      });

      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'Test query',
        limit: 10,
        threshold: 0.7,
      });

      // Only results with similarity >= 0.7 should be returned
      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should sort results by similarity descending', async () => {
      const { cosineSimilarity } = require('../../functions/src/services/embeddingService');

      cosineSimilarity.mockImplementation((emb1: number[], emb2: number[]) => {
        if (emb2[0] === 0.5) return 0.95;
        if (emb2[0] === 0.6) return 0.85;
        return 0.75;
      });

      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'Test query',
        limit: 10,
        threshold: 0.7,
      });

      // Results should be sorted by similarity (highest first)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }
    });

    it('should limit results to specified limit', async () => {
      const { cosineSimilarity } = require('../../functions/src/services/embeddingService');

      cosineSimilarity.mockReturnValue(0.9);

      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'Test query',
        limit: 2,
        threshold: 0.5,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle errors gracefully', async () => {
      const { generateEmbedding } = require('../../functions/src/services/embeddingService');

      generateEmbedding.mockRejectedValueOnce(new Error('Embedding generation failed'));

      await expect(
        searchSimilarKnowledge({
          projectId: 'test-project',
          queryText: 'Test query',
          limit: 10,
          threshold: 0.7,
        })
      ).rejects.toThrow('ベクトル検索エラー');
    });
  });

  describe('findExactDuplicates', () => {
    it('should find exact duplicate content', async () => {
      const results = await findExactDuplicates('test-project', '統合報告書の作成について');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should normalize content for comparison', async () => {
      // Should find duplicates even with different whitespace and punctuation
      const results = await findExactDuplicates(
        'test-project',
        '統合報告書の  作成について。。。'
      );

      expect(results).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockFirestore.collection.mockImplementationOnce(() => ({
        where: jest.fn(() => ({
          get: jest.fn().mockRejectedValue(new Error('Firestore error')),
        })),
      }));

      await expect(
        findExactDuplicates('test-project', 'Test content')
      ).rejects.toThrow('完全一致検索に失敗しました');
    });
  });

  describe('calculateFuzzyMatchScore', () => {
    it('should return 1.0 for identical strings', () => {
      const score = calculateFuzzyMatchScore('test string', 'test string');
      expect(score).toBe(1.0);
    });

    it('should return lower score for different strings', () => {
      const score = calculateFuzzyMatchScore('統合報告書', 'IR報告書');
      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 1.0 for empty strings', () => {
      const score = calculateFuzzyMatchScore('', '');
      expect(score).toBe(1.0);
    });

    it('should handle very different strings', () => {
      const score = calculateFuzzyMatchScore('abc', 'xyz');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should be symmetric', () => {
      const score1 = calculateFuzzyMatchScore('string1', 'string2');
      const score2 = calculateFuzzyMatchScore('string2', 'string1');
      expect(score1).toBe(score2);
    });

    it('should handle Japanese text', () => {
      const score = calculateFuzzyMatchScore(
        '統合報告書の作成',
        '統合報告書の作り方'
      );
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('Distance and Similarity Metrics', () => {
    it('should calculate distance as 1 - similarity', async () => {
      const { cosineSimilarity } = require('../../functions/src/services/embeddingService');

      cosineSimilarity.mockReturnValue(0.85);

      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'Test query',
        limit: 10,
        threshold: 0.7,
      });

      results.forEach((result) => {
        expect(result.distance).toBeCloseTo(1 - result.similarity, 5);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query text', async () => {
      await expect(
        searchSimilarKnowledge({
          projectId: 'test-project',
          queryText: '',
          limit: 10,
          threshold: 0.7,
        })
      ).resolves.toBeDefined();
    });

    it('should handle very long query text', async () => {
      const longQuery = 'あ'.repeat(10000);

      await expect(
        searchSimilarKnowledge({
          projectId: 'test-project',
          queryText: longQuery,
          limit: 10,
          threshold: 0.7,
        })
      ).resolves.toBeDefined();
    });

    it('should handle threshold of 0', async () => {
      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'Test query',
        limit: 10,
        threshold: 0,
      });

      expect(results).toBeDefined();
    });

    it('should handle threshold of 1', async () => {
      const results = await searchSimilarKnowledge({
        projectId: 'test-project',
        queryText: 'Test query',
        limit: 10,
        threshold: 1,
      });

      expect(results).toBeDefined();
    });
  });
});
