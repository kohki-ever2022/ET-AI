/**
 * Text Chunking Service
 *
 * Intelligently splits text into chunks for embedding generation:
 * - Respects token limits
 * - Preserves sentence boundaries
 * - Includes overlap for context
 * - Handles Japanese text properly
 */

import type { DocumentChunk, ChunkingOptions } from '../types';

/**
 * Default chunking options
 */
const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 500, // tokens
  overlapSize: 50, // tokens
  minChunkSize: 100, // tokens
};

/**
 * Estimates token count for text
 * Japanese text: ~0.7 characters per token
 * English text: ~4 characters per token
 */
function estimateTokenCount(text: string): number {
  // Detect if text is primarily Japanese
  const japaneseCharCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || [])
    .length;
  const isJapanese = japaneseCharCount / text.length > 0.3;

  if (isJapanese) {
    // Japanese: ~0.7 chars per token
    return Math.ceil(text.length / 0.7);
  } else {
    // English: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Splits text into sentences
 * Handles both Japanese and English sentence boundaries
 */
function splitIntoSentences(text: string): string[] {
  // Sentence boundary patterns
  const sentenceEnders = /([。！？\.!?]+[\s\n]*)/g;

  // Split by sentence enders while keeping the enders
  const parts = text.split(sentenceEnders);

  // Recombine sentences with their enders
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i];
    const ender = parts[i + 1] || '';
    if (sentence.trim()) {
      sentences.push((sentence + ender).trim());
    }
  }

  return sentences;
}

/**
 * Chunks text into manageable pieces for embedding
 */
export async function chunkText(
  text: string,
  options: Partial<ChunkingOptions> = {}
): Promise<DocumentChunk[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log('Chunking text:', {
    textLength: text.length,
    estimatedTokens: estimateTokenCount(text),
    options: opts,
  });

  // Split into sentences
  const sentences = splitIntoSentences(text);

  console.log(`Split into ${sentences.length} sentences`);

  // Build chunks
  const chunks: DocumentChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  let chunkStartIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokenCount = estimateTokenCount(sentence);

    // Check if adding this sentence would exceed max chunk size
    if (
      currentTokenCount + sentenceTokenCount > opts.maxChunkSize &&
      currentChunk.length > 0
    ) {
      // Create chunk from current sentences
      const chunkText = currentChunk.join(' ');
      const chunkEndIndex = chunkStartIndex + chunkText.length;

      chunks.push({
        chunkId: `chunk-${chunks.length}`,
        content: chunkText,
        startIndex: chunkStartIndex,
        endIndex: chunkEndIndex,
        tokenCount: currentTokenCount,
      });

      // Calculate overlap: keep last N sentences for context
      const overlapSentences = calculateOverlapSentences(
        currentChunk,
        opts.overlapSize
      );

      // Start new chunk with overlap
      currentChunk = overlapSentences;
      currentTokenCount = estimateTokenCount(currentChunk.join(' '));
      chunkStartIndex = chunkEndIndex - currentChunk.join(' ').length;
    }

    // Add sentence to current chunk
    currentChunk.push(sentence);
    currentTokenCount += sentenceTokenCount;
  }

  // Add final chunk if it meets minimum size
  if (currentChunk.length > 0 && currentTokenCount >= opts.minChunkSize) {
    const chunkText = currentChunk.join(' ');
    chunks.push({
      chunkId: `chunk-${chunks.length}`,
      content: chunkText,
      startIndex: chunkStartIndex,
      endIndex: chunkStartIndex + chunkText.length,
      tokenCount: currentTokenCount,
    });
  } else if (currentChunk.length > 0 && chunks.length > 0) {
    // If final chunk is too small, merge with previous chunk
    const lastChunk = chunks[chunks.length - 1];
    const mergedContent = lastChunk.content + ' ' + currentChunk.join(' ');
    lastChunk.content = mergedContent;
    lastChunk.endIndex = lastChunk.startIndex + mergedContent.length;
    lastChunk.tokenCount = estimateTokenCount(mergedContent);
  }

  console.log(`Created ${chunks.length} chunks`, {
    avgTokensPerChunk: chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length,
    minTokens: Math.min(...chunks.map((c) => c.tokenCount)),
    maxTokens: Math.max(...chunks.map((c) => c.tokenCount)),
  });

  return chunks;
}

/**
 * Calculates which sentences to include in overlap
 */
function calculateOverlapSentences(sentences: string[], overlapTokens: number): string[] {
  const overlapSentences: string[] = [];
  let tokenCount = 0;

  // Add sentences from the end until we reach overlap size
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokenCount(sentence);

    if (tokenCount + sentenceTokens > overlapTokens) {
      break;
    }

    overlapSentences.unshift(sentence);
    tokenCount += sentenceTokens;
  }

  return overlapSentences;
}

/**
 * Validates chunk size
 */
export function isValidChunkSize(chunk: DocumentChunk, maxTokens: number): boolean {
  return chunk.tokenCount <= maxTokens && chunk.content.length > 0;
}

/**
 * Merges small chunks together
 */
export function mergeSmallChunks(
  chunks: DocumentChunk[],
  minChunkSize: number
): DocumentChunk[] {
  const merged: DocumentChunk[] = [];
  let currentMerge: DocumentChunk | null = null;

  for (const chunk of chunks) {
    if (chunk.tokenCount < minChunkSize) {
      // Chunk is too small, merge with previous or next
      if (currentMerge) {
        // Merge with current merge
        currentMerge.content += ' ' + chunk.content;
        currentMerge.endIndex = chunk.endIndex;
        currentMerge.tokenCount += chunk.tokenCount;
      } else {
        // Start new merge
        currentMerge = { ...chunk };
      }
    } else {
      // Chunk is valid size
      if (currentMerge) {
        // Finish current merge and add it
        merged.push(currentMerge);
        currentMerge = null;
      }
      merged.push(chunk);
    }
  }

  // Add final merge if exists
  if (currentMerge) {
    merged.push(currentMerge);
  }

  return merged;
}

/**
 * Calculates overlap statistics between chunks
 */
export function calculateChunkOverlap(chunk1: DocumentChunk, chunk2: DocumentChunk): number {
  // Calculate character overlap
  const overlap = Math.max(
    0,
    Math.min(chunk1.endIndex, chunk2.endIndex) - Math.max(chunk1.startIndex, chunk2.startIndex)
  );

  return overlap;
}
