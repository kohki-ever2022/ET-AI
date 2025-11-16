/**
 * Claude API 型定義
 *
 * Anthropic Claude APIとのやり取りに使用する型定義
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// プロンプトキャッシング関連
// ============================================================================

export interface CacheLayer {
  name: string;
  tokens: number;
  hitRate: number; // 0.0 ~ 1.0
  updateFrequency: 'never' | 'quarterly' | 'daily';
}

export const CACHE_LAYERS: Record<string, CacheLayer> = {
  LAYER_1_CORE_CONSTRAINTS: {
    name: 'Core Constraints',
    tokens: 500,
    hitRate: 1.0,
    updateFrequency: 'never',
  },
  LAYER_2_IR_KNOWLEDGE: {
    name: 'IR Knowledge',
    tokens: 1500,
    hitRate: 0.95,
    updateFrequency: 'quarterly',
  },
  LAYER_3_PROJECT_KNOWLEDGE: {
    name: 'Project Knowledge',
    tokens: 2500,
    hitRate: 0.70,
    updateFrequency: 'daily',
  },
};

export interface CachedContent {
  type: 'text';
  text: string;
  cache_control?: {
    type: 'ephemeral';
  };
}

export interface CachedSystemPrompt {
  role: 'user';
  content: CachedContent[];
}

// ============================================================================
// API Request/Response
// ============================================================================

export interface ClaudeAPIRequest {
  projectId: string;
  userMessage: string;
  conversationHistory?: Anthropic.MessageParam[];
}

export interface ClaudeAPIResponse {
  content: string;
  usage: {
    inputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    outputTokens: number;
  };
  cacheHitRate: number;
  costSavings: number;
}

// ============================================================================
// Token Limits
// ============================================================================

export const TOKEN_LIMITS = {
  CONTEXT_WINDOW: 200000,
  AVAILABLE_FOR_DOCUMENT: 150000,
  MAX_CHARS_ESTIMATE: 105000, // 日本語1トークン≈0.7文字
  SAFETY_MARGIN: 10000,
} as const;

// ============================================================================
// Cost Calculation
// ============================================================================

export const PRICING = {
  INPUT_PER_MILLION: 3.0, // $3.00 per MTok
  OUTPUT_PER_MILLION: 15.0, // $15.00 per MTok
  CACHE_WRITE_PER_MILLION: 3.75, // $3.75 per MTok
  CACHE_READ_PER_MILLION: 0.3, // $0.30 per MTok
} as const;

export function calculateCost(usage: {
  inputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;
}): {
  inputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  outputCost: number;
  totalCost: number;
} {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
  const cacheWriteCost = (usage.cacheCreationInputTokens / 1_000_000) * PRICING.CACHE_WRITE_PER_MILLION;
  const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * PRICING.CACHE_READ_PER_MILLION;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MILLION;

  return {
    inputCost,
    cacheWriteCost,
    cacheReadCost,
    outputCost,
    totalCost: inputCost + cacheWriteCost + cacheReadCost + outputCost,
  };
}

export function calculateCostSavings(usage: {
  cacheReadInputTokens: number;
}): number {
  const normalInputCost = (usage.cacheReadInputTokens / 1_000_000) * PRICING.INPUT_PER_MILLION;
  const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * PRICING.CACHE_READ_PER_MILLION;
  return normalInputCost - cacheReadCost;
}

export function calculateCacheHitRate(usage: {
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}): number {
  const totalCacheableTokens = usage.cacheCreationInputTokens + usage.cacheReadInputTokens;

  if (totalCacheableTokens === 0) return 0;

  return usage.cacheReadInputTokens / totalCacheableTokens;
}

// ============================================================================
// Token Estimation
// ============================================================================

export function estimateTokenCount(text: string): number {
  // 日本語：1トークン ≈ 0.7文字
  // 英語：1トークン ≈ 4文字
  // 保守的に日本語と仮定
  return Math.ceil(text.length / 0.7);
}

export function isWithinTokenLimit(text: string, limit: number = TOKEN_LIMITS.CONTEXT_WINDOW): boolean {
  return estimateTokenCount(text) <= (limit - TOKEN_LIMITS.SAFETY_MARGIN);
}
