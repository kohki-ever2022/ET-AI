/**
 * Enhanced Claude Service Tests
 *
 * Tests for the enhanced Claude service with vector search integration.
 * Covers:
 * - Knowledge base search
 * - TF-IDF keyword extraction
 * - Learning pattern storage
 * - Knowledge relevance analysis
 */

import {
  callClaudeWithKnowledge,
  analyzeKnowledgeRelevance,
} from '../../services/enhancedClaudeService';
import type { SystemPromptSection, Knowledge } from '../../types/firestore';

// Mock Firebase functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn((functions, name) => {
    if (name === 'vectorSearch') {
      return jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              knowledge: {
                id: 'k1',
                projectId: 'test-project',
                content: 'Test knowledge 1',
                source: 'document',
                embedding: new Array(1024).fill(0.5),
              },
              similarity: 0.85,
              distance: 0.15,
            },
            {
              knowledge: {
                id: 'k2',
                projectId: 'test-project',
                content: 'Test knowledge 2',
                source: 'document',
                embedding: new Array(1024).fill(0.4),
              },
              similarity: 0.75,
              distance: 0.25,
            },
          ],
        },
      });
    }
    return jest.fn();
  }),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'test-doc-id' }),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
}));

// Mock claudeService
jest.mock('../../services/claudeService', () => ({
  callClaudeWithCaching: jest.fn().mockResolvedValue({
    content: 'Test response from Claude',
    usage: {
      inputTokens: 1000,
      cacheCreationInputTokens: 4500,
      cacheReadInputTokens: 0,
      outputTokens: 200,
    },
    cacheHitRate: 0,
    costSavings: 0,
  }),
}));

describe('enhancedClaudeService', () => {
  describe('callClaudeWithKnowledge', () => {
    const mockGetSystemPrompts = jest.fn().mockResolvedValue([
      { id: '1', title: 'IR知識', content: 'IR content' },
    ] as SystemPromptSection[]);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call Claude with knowledge search enabled', async () => {
      const response = await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'Tell me about IR reporting',
          conversationHistory: [],
          enableKnowledgeSearch: true,
          searchThreshold: 0.7,
          maxKnowledgeItems: 5,
        },
        mockGetSystemPrompts
      );

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('usage');
      expect(response.content).toBe('Test response from Claude');
    });

    it('should skip knowledge search when disabled', async () => {
      const response = await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'Test question',
          conversationHistory: [],
          enableKnowledgeSearch: false,
        },
        mockGetSystemPrompts
      );

      expect(response).toHaveProperty('content');
      expect(response.content).toBe('Test response from Claude');
    });

    it('should use default search parameters', async () => {
      const response = await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'Test question',
          conversationHistory: [],
        },
        mockGetSystemPrompts
      );

      expect(response).toHaveProperty('content');
    });

    it('should handle conversation history', async () => {
      const response = await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'Follow-up question',
          conversationHistory: [
            { role: 'user', content: 'Previous question' },
            { role: 'assistant', content: 'Previous answer' },
          ],
        },
        mockGetSystemPrompts
      );

      expect(response).toHaveProperty('content');
    });
  });

  describe('analyzeKnowledgeRelevance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should analyze knowledge relevance and return metrics', async () => {
      const result = await analyzeKnowledgeRelevance('test-project', 'Test query about IR');

      expect(result).toHaveProperty('hasRelevantKnowledge');
      expect(result).toHaveProperty('topResults');
      expect(result).toHaveProperty('avgSimilarity');
      expect(result).toHaveProperty('recommendedThreshold');

      expect(result.topResults).toHaveLength(2);
      expect(result.topResults[0].similarity).toBe(0.85);
      expect(result.topResults[1].similarity).toBe(0.75);

      // Average similarity: (0.85 + 0.75) / 2 = 0.8
      expect(result.avgSimilarity).toBe(0.8);
    });

    it('should recommend higher threshold for high-quality results', async () => {
      const result = await analyzeKnowledgeRelevance('test-project', 'High quality query');

      // Average similarity is 0.8, so recommended threshold should be 0.75
      expect(result.recommendedThreshold).toBe(0.75);
    });

    it('should detect relevant knowledge when similarity is high', async () => {
      const result = await analyzeKnowledgeRelevance('test-project', 'Relevant query');

      // Top result similarity (0.85) >= recommended threshold (0.75)
      expect(result.hasRelevantKnowledge).toBe(true);
    });
  });

  describe('Knowledge Search Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle search errors gracefully', async () => {
      // Mock error from vector search
      const { httpsCallable } = require('firebase/functions');
      httpsCallable.mockImplementationOnce(() => {
        return jest.fn().mockRejectedValue(new Error('Search failed'));
      });

      const response = await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'Test question',
          conversationHistory: [],
        },
        mockGetSystemPrompts
      );

      // Should still return response even if search fails
      expect(response).toHaveProperty('content');
    });
  });

  describe('TF-IDF Keyword Extraction', () => {
    // Note: extractKeywords is a private function, but we test it indirectly
    // through callClaudeWithKnowledge which stores learning patterns

    it('should extract and store learning patterns', async () => {
      const { addDoc } = require('firebase/firestore');

      await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'IR報告書の作成方法について教えてください。統合報告書とESG情報の開示が重要です。',
          conversationHistory: [],
        },
        mockGetSystemPrompts
      );

      // Learning patterns should be stored
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('Cost and Usage Tracking', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return usage metrics from Claude API', async () => {
      const response = await callClaudeWithKnowledge(
        {
          projectId: 'test-project',
          userMessage: 'Test question',
          conversationHistory: [],
        },
        mockGetSystemPrompts
      );

      expect(response.usage).toEqual({
        inputTokens: 1000,
        cacheCreationInputTokens: 4500,
        cacheReadInputTokens: 0,
        outputTokens: 200,
      });

      expect(response.cacheHitRate).toBe(0);
      expect(response.costSavings).toBe(0);
    });
  });
});
