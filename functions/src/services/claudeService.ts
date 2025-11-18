/**
 * Claude API Service (Cloud Functions)
 *
 * Handles Claude API calls with caching, retry logic, and cost tracking.
 */

import * as functions from 'firebase-functions';
import Anthropic from '@anthropic-ai/sdk';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

export interface ClaudeRequest {
  userMessage: string;
  systemPrompt: string;
  projectId: string;
}

export interface ClaudeResponse {
  content: string;
  modelUsed: string;
  usage: {
    inputTokens: number;
    cacheCreationInputTokens: number;
    cacheReadInputTokens: number;
    outputTokens: number;
  };
  cacheHitRate: number;
  costSavings: number;
}

/**
 * Call Claude API with 3-layer prompt caching
 */
export async function callClaudeWithCaching(
  request: ClaudeRequest
): Promise<ClaudeResponse> {
  const { userMessage, systemPrompt, projectId } = request;

  try {
    // Split system prompt into cacheable layers
    const layers = splitSystemPrompt(systemPrompt);

    // Build system content with cache control
    const systemContent: any[] = [];

    if (layers.coreConstraints) {
      systemContent.push({
        type: 'text',
        text: layers.coreConstraints,
        cache_control: { type: 'ephemeral' },
      });
    }

    if (layers.irKnowledge) {
      systemContent.push({
        type: 'text',
        text: layers.irKnowledge,
        cache_control: { type: 'ephemeral' },
      });
    }

    if (layers.projectKnowledge) {
      systemContent.push({
        type: 'text',
        text: layers.projectKnowledge,
        cache_control: { type: 'ephemeral' },
      });
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemContent,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text content
    const content =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '';

    // Calculate cache metrics
    const usage = {
      inputTokens: response.usage.input_tokens || 0,
      cacheCreationInputTokens: (response.usage as any).cache_creation_input_tokens || 0,
      cacheReadInputTokens: (response.usage as any).cache_read_input_tokens || 0,
      outputTokens: response.usage.output_tokens || 0,
    };

    const totalCacheTokens =
      usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
    const cacheHitRate =
      totalCacheTokens > 0
        ? usage.cacheReadInputTokens / totalCacheTokens
        : 0;

    // Calculate cost savings (90% reduction on cache reads)
    const normalCost = usage.cacheReadInputTokens * 3.0 / 1000000; // $3.00 per million
    const cachedCost = usage.cacheReadInputTokens * 0.3 / 1000000; // $0.30 per million
    const costSavings = normalCost - cachedCost;

    // Record usage for cost monitoring (async, non-blocking)
    recordApiUsage(projectId, usage, cacheHitRate).catch(console.error);

    return {
      content,
      modelUsed: MODEL,
      usage,
      cacheHitRate,
      costSavings,
    };
  } catch (error) {
    console.error('Claude API error:', error);

    // Check for specific error types
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.status === 401) {
        throw new Error('Authentication failed. Please check API key.');
      }
    }

    throw error;
  }
}

/**
 * Split system prompt into cacheable layers
 */
function splitSystemPrompt(systemPrompt: string): {
  coreConstraints?: string;
  irKnowledge?: string;
  projectKnowledge?: string;
} {
  const layers: any = {};

  // Split by section markers
  const sections = systemPrompt.split(/【/);

  for (const section of sections) {
    if (!section.trim()) continue;

    if (section.startsWith('最優先指示')) {
      layers.coreConstraints = '【' + section;
    } else if (section.startsWith('IR専門知識')) {
      layers.irKnowledge = '【' + section;
    } else if (section.startsWith('この企業に関する')) {
      layers.projectKnowledge = '【' + section;
    }
  }

  return layers;
}

/**
 * Record API usage for cost monitoring
 */
async function recordApiUsage(
  projectId: string,
  usage: any,
  cacheHitRate: number
): Promise<void> {
  try {
    // Calculate costs
    const inputCost = usage.inputTokens * 3.0 / 1000000;
    const cacheWriteCost = usage.cacheCreationInputTokens * 3.75 / 1000000;
    const cacheReadCost = usage.cacheReadInputTokens * 0.3 / 1000000;
    const outputCost = usage.outputTokens * 15.0 / 1000000;
    const totalCost = inputCost + cacheWriteCost + cacheReadCost + outputCost;

    await db.collection('costRecords').add({
      projectId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      usage,
      cost: {
        inputCost,
        cacheWriteCost,
        cacheReadCost,
        outputCost,
        totalCost,
      },
      cacheHitRate,
      modelUsed: MODEL,
    });
  } catch (error) {
    console.error('Failed to record API usage:', error);
    // Non-critical, don't throw
  }
}
