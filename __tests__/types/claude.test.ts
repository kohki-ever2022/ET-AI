/**
 * Claude Types Tests
 *
 * Tests for cost calculation and token management utilities.
 * Covers:
 * - Cost calculation for different token types
 * - Cache hit rate calculation
 * - Cost savings calculation
 * - Token estimation
 * - Token limit validation
 */

import {
  calculateCost,
  calculateCacheHitRate,
  calculateCostSavings,
  estimateTokenCount,
  isWithinTokenLimit,
  PRICING,
  TOKEN_LIMITS,
  CACHE_LAYERS,
} from '../../types/claude';

describe('claude types', () => {
  describe('calculateCost', () => {
    it('should calculate total cost correctly', () => {
      const usage = {
        inputTokens: 1000,
        cacheCreationInputTokens: 4500,
        cacheReadInputTokens: 0,
        outputTokens: 200,
      };

      const cost = calculateCost(usage);

      // Input: 1000 tokens * $3.00 / 1M = $0.003
      expect(cost.inputCost).toBeCloseTo(0.003, 6);

      // Cache write: 4500 tokens * $3.75 / 1M = $0.016875
      expect(cost.cacheWriteCost).toBeCloseTo(0.016875, 6);

      // Cache read: 0 tokens * $0.30 / 1M = $0.00
      expect(cost.cacheReadCost).toBeCloseTo(0.0, 6);

      // Output: 200 tokens * $15.00 / 1M = $0.003
      expect(cost.outputCost).toBeCloseTo(0.003, 6);

      // Total: $0.003 + $0.016875 + $0.00 + $0.003 = $0.022875
      expect(cost.totalCost).toBeCloseTo(0.022875, 6);
    });

    it('should calculate cost with cache reads (second request)', () => {
      const usage = {
        inputTokens: 1000,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 4500,
        outputTokens: 200,
      };

      const cost = calculateCost(usage);

      // Cache read: 4500 tokens * $0.30 / 1M = $0.00135
      expect(cost.cacheReadCost).toBeCloseTo(0.00135, 6);

      // Total: $0.003 + $0.00 + $0.00135 + $0.003 = $0.00735
      expect(cost.totalCost).toBeCloseTo(0.00735, 6);
    });

    it('should handle zero tokens', () => {
      const usage = {
        inputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        outputTokens: 0,
      };

      const cost = calculateCost(usage);

      expect(cost.inputCost).toBe(0);
      expect(cost.cacheWriteCost).toBe(0);
      expect(cost.cacheReadCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });

    it('should handle large token counts', () => {
      const usage = {
        inputTokens: 100000,
        cacheCreationInputTokens: 50000,
        cacheReadInputTokens: 0,
        outputTokens: 4000,
      };

      const cost = calculateCost(usage);

      // Input: 100000 * $3.00 / 1M = $0.30
      expect(cost.inputCost).toBeCloseTo(0.3, 6);

      // Cache write: 50000 * $3.75 / 1M = $0.1875
      expect(cost.cacheWriteCost).toBeCloseTo(0.1875, 6);

      // Output: 4000 * $15.00 / 1M = $0.06
      expect(cost.outputCost).toBeCloseTo(0.06, 6);

      expect(cost.totalCost).toBeCloseTo(0.5475, 6);
    });
  });

  describe('calculateCacheHitRate', () => {
    it('should calculate 0% hit rate on first request', () => {
      const usage = {
        cacheCreationInputTokens: 4500,
        cacheReadInputTokens: 0,
      };

      const hitRate = calculateCacheHitRate(usage);

      expect(hitRate).toBe(0);
    });

    it('should calculate 100% hit rate on cached request', () => {
      const usage = {
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 4500,
      };

      const hitRate = calculateCacheHitRate(usage);

      expect(hitRate).toBe(1.0);
    });

    it('should calculate partial hit rate', () => {
      const usage = {
        cacheCreationInputTokens: 1000,
        cacheReadInputTokens: 3000,
      };

      const hitRate = calculateCacheHitRate(usage);

      // 3000 / (1000 + 3000) = 0.75
      expect(hitRate).toBeCloseTo(0.75, 6);
    });

    it('should handle zero cacheable tokens', () => {
      const usage = {
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
      };

      const hitRate = calculateCacheHitRate(usage);

      expect(hitRate).toBe(0);
    });
  });

  describe('calculateCostSavings', () => {
    it('should calculate cost savings from cache reads', () => {
      const usage = {
        cacheReadInputTokens: 4500,
      };

      const savings = calculateCostSavings(usage);

      // Normal cost: 4500 * $3.00 / 1M = $0.0135
      // Cache cost: 4500 * $0.30 / 1M = $0.00135
      // Savings: $0.0135 - $0.00135 = $0.01215
      expect(savings).toBeCloseTo(0.01215, 6);
    });

    it('should calculate zero savings with no cache reads', () => {
      const usage = {
        cacheReadInputTokens: 0,
      };

      const savings = calculateCostSavings(usage);

      expect(savings).toBe(0);
    });

    it('should demonstrate 90% cost reduction', () => {
      const usage = {
        cacheReadInputTokens: 4500,
      };

      const normalCost = (usage.cacheReadInputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
      const cacheCost = (usage.cacheReadInputTokens / 1_000_000) * PRICING.CACHE_READ_PER_MILLION;
      const savings = calculateCostSavings(usage);

      const reductionPercentage = (savings / normalCost) * 100;

      // Cache read cost is 90% cheaper than normal input cost
      expect(reductionPercentage).toBeCloseTo(90, 1);
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate tokens for Japanese text', () => {
      const text = 'あいうえお'; // 5 characters
      const tokens = estimateTokenCount(text);

      // Japanese: 1 token ≈ 0.7 chars
      // 5 chars / 0.7 ≈ 7.14 tokens, ceil = 8
      expect(tokens).toBe(Math.ceil(5 / 0.7));
    });

    it('should estimate tokens for English text', () => {
      const text = 'This is a test sentence.'; // 24 characters
      const tokens = estimateTokenCount(text);

      // Conservative estimate using Japanese ratio (0.7 chars/token)
      expect(tokens).toBe(Math.ceil(24 / 0.7));
    });

    it('should estimate tokens for mixed text', () => {
      const text = '統合報告書 IR Report'; // Mixed Japanese and English
      const tokens = estimateTokenCount(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 0.7));
    });

    it('should handle empty string', () => {
      const text = '';
      const tokens = estimateTokenCount(text);

      expect(tokens).toBe(0);
    });

    it('should handle very long text', () => {
      const text = 'あ'.repeat(100000);
      const tokens = estimateTokenCount(text);

      expect(tokens).toBe(Math.ceil(100000 / 0.7));
    });
  });

  describe('isWithinTokenLimit', () => {
    it('should return true for text within limit', () => {
      const text = 'あ'.repeat(1000); // ~1429 tokens
      const result = isWithinTokenLimit(text);

      expect(result).toBe(true);
    });

    it('should return false for text exceeding limit', () => {
      // Context window: 200k tokens
      // Safety margin: 10k tokens
      // Available: 190k tokens
      // Need > 190k tokens: 190k * 0.7 = 133,000 chars
      const text = 'あ'.repeat(150000); // ~214,286 tokens
      const result = isWithinTokenLimit(text);

      expect(result).toBe(false);
    });

    it('should respect custom limit', () => {
      const text = 'あ'.repeat(10000); // ~14,286 tokens
      const customLimit = 10000;

      const result = isWithinTokenLimit(text, customLimit);

      expect(result).toBe(false); // exceeds 10k - 10k safety = 0 tokens
    });

    it('should account for safety margin', () => {
      // Available for document: 150k tokens
      // Safety margin: 10k tokens
      // Actual limit: 140k tokens
      // 140k * 0.7 = 98,000 chars

      const text = 'あ'.repeat(100000); // ~142,857 tokens
      const result = isWithinTokenLimit(text, TOKEN_LIMITS.AVAILABLE_FOR_DOCUMENT);

      expect(result).toBe(false);
    });
  });

  describe('PRICING constants', () => {
    it('should have correct pricing values', () => {
      expect(PRICING.INPUT_PER_MILLION).toBe(3.0);
      expect(PRICING.OUTPUT_PER_MILLION).toBe(15.0);
      expect(PRICING.CACHE_WRITE_PER_MILLION).toBe(3.75);
      expect(PRICING.CACHE_READ_PER_MILLION).toBe(0.3);
    });

    it('should demonstrate 90% cache read savings', () => {
      const cacheReadCost = PRICING.CACHE_READ_PER_MILLION;
      const normalInputCost = PRICING.INPUT_PER_MILLION;
      const savingsPercentage = ((normalInputCost - cacheReadCost) / normalInputCost) * 100;

      expect(savingsPercentage).toBeCloseTo(90, 1);
    });
  });

  describe('TOKEN_LIMITS constants', () => {
    it('should have correct token limit values', () => {
      expect(TOKEN_LIMITS.CONTEXT_WINDOW).toBe(200000);
      expect(TOKEN_LIMITS.AVAILABLE_FOR_DOCUMENT).toBe(150000);
      expect(TOKEN_LIMITS.SAFETY_MARGIN).toBe(10000);
    });

    it('should have consistent max chars estimate', () => {
      // 150k tokens * 0.7 chars/token = 105k chars
      expect(TOKEN_LIMITS.MAX_CHARS_ESTIMATE).toBe(105000);
    });
  });

  describe('CACHE_LAYERS constants', () => {
    it('should have 3 cache layers', () => {
      expect(Object.keys(CACHE_LAYERS)).toHaveLength(3);
    });

    it('should have Layer 1 with 100% hit rate', () => {
      expect(CACHE_LAYERS.LAYER_1_CORE_CONSTRAINTS.hitRate).toBe(1.0);
      expect(CACHE_LAYERS.LAYER_1_CORE_CONSTRAINTS.tokens).toBe(500);
      expect(CACHE_LAYERS.LAYER_1_CORE_CONSTRAINTS.updateFrequency).toBe('never');
    });

    it('should have Layer 2 with 95% hit rate', () => {
      expect(CACHE_LAYERS.LAYER_2_IR_KNOWLEDGE.hitRate).toBe(0.95);
      expect(CACHE_LAYERS.LAYER_2_IR_KNOWLEDGE.tokens).toBe(1500);
      expect(CACHE_LAYERS.LAYER_2_IR_KNOWLEDGE.updateFrequency).toBe('quarterly');
    });

    it('should have Layer 3 with 70% hit rate', () => {
      expect(CACHE_LAYERS.LAYER_3_PROJECT_KNOWLEDGE.hitRate).toBe(0.70);
      expect(CACHE_LAYERS.LAYER_3_PROJECT_KNOWLEDGE.tokens).toBe(2500);
      expect(CACHE_LAYERS.LAYER_3_PROJECT_KNOWLEDGE.updateFrequency).toBe('daily');
    });

    it('should total ~4500 tokens', () => {
      const totalTokens = Object.values(CACHE_LAYERS).reduce(
        (sum, layer) => sum + layer.tokens,
        0
      );

      expect(totalTokens).toBe(4500);
    });
  });

  describe('Real-world cost scenarios', () => {
    it('should calculate cost for typical first request', () => {
      // First request: cache creation
      const usage = {
        inputTokens: 500, // User message
        cacheCreationInputTokens: 4500, // 3-layer system prompt
        cacheReadInputTokens: 0,
        outputTokens: 300,
      };

      const cost = calculateCost(usage);
      const hitRate = calculateCacheHitRate(usage);

      expect(hitRate).toBe(0);
      expect(cost.totalCost).toBeGreaterThan(0);
    });

    it('should calculate cost for subsequent cached request', () => {
      // Subsequent request: cache hit
      const usage = {
        inputTokens: 500,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 4500, // Cache hit on all 3 layers
        outputTokens: 300,
      };

      const cost = calculateCost(usage);
      const hitRate = calculateCacheHitRate(usage);
      const savings = calculateCostSavings(usage);

      expect(hitRate).toBe(1.0);
      expect(savings).toBeGreaterThan(0);

      // Should be much cheaper than first request
      expect(cost.totalCost).toBeLessThan(0.01);
    });

    it('should calculate monthly cost savings with high cache hit rate', () => {
      const monthlyRequests = 10000;
      const avgCacheReadTokens = 4500;

      const totalSavings = monthlyRequests * calculateCostSavings({
        cacheReadInputTokens: avgCacheReadTokens,
      });

      // Should save significant amount per month
      expect(totalSavings).toBeGreaterThan(100); // > $100/month
    });
  });
});
