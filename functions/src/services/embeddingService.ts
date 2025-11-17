/**
 * Embedding Generation Service
 *
 * Generates vector embeddings using Voyage AI:
 * - voyage-large-2: 1024 dimensions, general purpose
 * - voyage-code-2: 1536 dimensions, code-focused
 *
 * Handles batching and rate limiting for optimal performance.
 */

import PQueue from 'p-queue';
import pRetry from 'p-retry';
import type { EmbeddingRequest } from '../types';

/**
 * Voyage AI API configuration
 */
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

/**
 * Embedding models
 */
export const EMBEDDING_MODELS = {
  LARGE: 'voyage-large-2', // 1024 dimensions
  CODE: 'voyage-code-2', // 1536 dimensions
} as const;

/**
 * Rate limiting queue
 * Voyage AI limits: 300 requests/minute, 1M tokens/minute
 */
const embeddingQueue = new PQueue({
  concurrency: 5, // Process 5 requests concurrently
  interval: 60000, // 1 minute
  intervalCap: 300, // Max 300 requests per minute
});

/**
 * Generates embeddings for an array of texts
 *
 * @param texts - Array of text strings to embed
 * @param inputType - Type of input: 'document' or 'query'
 * @param model - Embedding model to use
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: 'document' | 'query' = 'document',
  model: 'voyage-large-2' | 'voyage-code-2' = 'voyage-large-2'
): Promise<number[][]> {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not configured');
  }

  if (texts.length === 0) {
    return [];
  }

  console.log(`Generating embeddings for ${texts.length} texts`, {
    model,
    inputType,
  });

  try {
    // Split into batches of 128 (Voyage AI limit)
    const batchSize = 128;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    console.log(`Split into ${batches.length} batches`);

    // Process batches with rate limiting
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Add to queue with retry logic
      const embeddings = await embeddingQueue.add(() =>
        pRetry(() => generateEmbeddingBatch(batch, inputType, model), {
          retries: 3,
          onFailedAttempt: (error) => {
            console.warn(
              `Embedding generation attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`
            );
          },
        })
      );

      if (embeddings) {
        allEmbeddings.push(...embeddings);
      }

      console.log(`Processed batch ${i + 1}/${batches.length}`);
    }

    console.log(`Generated ${allEmbeddings.length} embeddings`);

    return allEmbeddings;
  } catch (error) {
    console.error('Embedding generation failed:', error);

    if (error instanceof Error) {
      throw new Error(`埋め込み生成エラー: ${error.message}`);
    }

    throw new Error('埋め込み生成に失敗しました。');
  }
}

/**
 * Generates embeddings for a single batch
 */
async function generateEmbeddingBatch(
  texts: string[],
  inputType: 'document' | 'query',
  model: string
): Promise<number[][]> {
  const request: EmbeddingRequest = {
    texts,
    model: model as 'voyage-large-2' | 'voyage-code-2',
    inputType,
  };

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: request.texts,
      model: request.model,
      input_type: request.inputType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voyage AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Extract embeddings from response
  const embeddings: number[][] = data.data.map((item: any) => item.embedding);

  return embeddings;
}

/**
 * Generates embedding for a single text (convenience method)
 */
export async function generateEmbedding(
  text: string,
  inputType: 'document' | 'query' = 'document',
  model: 'voyage-large-2' | 'voyage-code-2' = 'voyage-large-2'
): Promise<number[]> {
  const embeddings = await generateEmbeddings([text], inputType, model);
  return embeddings[0];
}

/**
 * Calculates cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    magnitude1 += embedding1[i] * embedding1[i];
    magnitude2 += embedding2[i] * embedding2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculates Euclidean distance between two embeddings
 */
export function euclideanDistance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimension');
  }

  let sumSquaredDiff = 0;

  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sumSquaredDiff += diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Normalizes an embedding vector
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return embedding;
  }

  return embedding.map((val) => val / magnitude);
}

/**
 * Validates embedding dimensions
 */
export function validateEmbeddingDimensions(
  embedding: number[],
  expectedDimensions: number
): boolean {
  return embedding.length === expectedDimensions;
}

/**
 * Gets expected dimensions for a model
 */
export function getModelDimensions(model: 'voyage-large-2' | 'voyage-code-2'): number {
  return model === 'voyage-large-2' ? 1024 : 1536;
}
