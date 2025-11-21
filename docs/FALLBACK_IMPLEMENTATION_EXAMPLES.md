# Fallback Implementation Examples

## Overview

This document provides code examples for implementing fallback strategies for each service.

## 1. Claude API with Fallback

```typescript
import { detectClaudeError, logError } from '../services/errorHandler';
import { retryWithBackoff, CLAUDE_RETRY_CONFIG } from '../utils/retryStrategy';

/**
 * Send message to Claude with automatic retry and fallback
 */
export async function sendClaudeMessageWithFallback(
  message: string,
  context: {
    userId: string;
    requestId: string;
    projectId?: string;
  }
): Promise<{
  response: string;
  method: 'claude' | 'cache' | 'simplified' | 'failed';
}> {
  // Level 1: Try Claude API with retry
  const result = await retryWithBackoff(
    () => callClaudeAPI(message),
    detectClaudeError,
    CLAUDE_RETRY_CONFIG,
    context
  );

  if (result.success) {
    return {
      response: result.result!,
      method: 'claude',
    };
  }

  // Level 2: Check cache for similar query
  const cachedResponse = await checkCache(message, context.userId);
  if (cachedResponse) {
    logger.info('Using cached response', context);
    return {
      response: `[キャッシュから取得]\n\n${cachedResponse}`,
      method: 'cache',
    };
  }

  // Level 3: Try simplified mode (shorter prompt)
  const simplifiedResult = await retryWithBackoff(
    () => callClaudeAPISimplified(message),
    detectClaudeError,
    { ...CLAUDE_RETRY_CONFIG, maxAttempts: 2 },
    context
  );

  if (simplifiedResult.success) {
    return {
      response: simplifiedResult.result!,
      method: 'simplified',
    };
  }

  // Level 4: Failed completely
  await logError(result.error, {
    ...context,
    retryCount: result.attempts,
    recovered: false,
  });

  return {
    response: getUserFacingMessage(result.error),
    method: 'failed',
  };
}

async function callClaudeAPI(message: string): Promise<string> {
  const Anthropic = require('@anthropic-ai/sdk').default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8000,
    messages: [{ role: 'user', content: message }],
  });

  return response.content[0].text;
}

async function callClaudeAPISimplified(message: string): Promise<string> {
  // Use Haiku model with reduced tokens
  const Anthropic = require('@anthropic-ai/sdk').default;
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2000,
    messages: [{ role: 'user', content: truncateMessage(message, 1000) }],
  });

  return response.content[0].text;
}

async function checkCache(
  message: string,
  userId: string
): Promise<string | null> {
  const hash = hashMessage(message);
  const cacheRef = db.collection('responseCache').doc(hash);
  const cacheDoc = await cacheRef.get();

  if (cacheDoc.exists) {
    const data = cacheDoc.data()!;
    const cacheAge = Date.now() - data.timestamp.toMillis();

    // Use cache if less than 24 hours old
    if (cacheAge < 24 * 60 * 60 * 1000) {
      return data.response;
    }
  }

  return null;
}
```

## 2. Vector Search with Keyword Fallback

```typescript
import { detectVectorSearchError } from '../services/errorHandler';
import { retryWithBackoff, VECTOR_SEARCH_RETRY_CONFIG } from '../utils/retryStrategy';

/**
 * Search knowledge with vector search and keyword fallback
 */
export async function searchKnowledgeWithFallback(
  query: string,
  projectId: string,
  options: {
    limit?: number;
    threshold?: number;
  } = {}
): Promise<{
  results: Knowledge[];
  method: 'vector' | 'keyword' | 'failed';
}> {
  // Level 1: Try vector search with retry
  const result = await retryWithBackoff(
    () => vectorSearch(query, projectId, options),
    (error) => detectVectorSearchError(error, 'knowledge'),
    VECTOR_SEARCH_RETRY_CONFIG
  );

  if (result.success) {
    return {
      results: result.result!,
      method: 'vector',
    };
  }

  // Level 2: Fallback to keyword search
  logger.warn('Vector search failed, using keyword search', {
    projectId,
    error: result.error,
  });

  const keywordResults = await keywordSearch(query, projectId, options);

  return {
    results: keywordResults,
    method: 'keyword',
  };
}

async function vectorSearch(
  query: string,
  projectId: string,
  options: { limit?: number; threshold?: number }
): Promise<Knowledge[]> {
  // Generate embedding for query
  const embedding = await generateEmbedding(query);

  // Search using Firestore vector search
  const knowledgeRef = collection(db, 'knowledge');
  const q = query(
    knowledgeRef,
    where('projectId', '==', projectId),
    // Vector search query here
    limit(options.limit || 10)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Knowledge));
}

async function keywordSearch(
  query: string,
  projectId: string,
  options: { limit?: number }
): Promise<Knowledge[]> {
  const keywords = extractKeywords(query);

  const knowledgeRef = collection(db, 'knowledge');
  const q = query(
    knowledgeRef,
    where('projectId', '==', projectId),
    // Use basic Firestore text search or filter by category
    limit(options.limit || 10)
  );

  const snapshot = await getDocs(q);

  // Manual keyword matching
  const results = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Knowledge))
    .filter((knowledge) => {
      const text = `${knowledge.title} ${knowledge.content}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    });

  return results.slice(0, options.limit || 10);
}

function extractKeywords(query: string): string[] {
  // Simple keyword extraction (improve with NLP in production)
  return query
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => word.toLowerCase());
}
```

## 3. Embedding with Queue Fallback

```typescript
import { detectEmbeddingError } from '../services/errorHandler';
import { retryWithReducedBatchSize, EMBEDDING_RETRY_CONFIG } from '../utils/retryStrategy';

/**
 * Generate embeddings with batch retry and queue fallback
 */
export async function generateEmbeddingsWithFallback(
  documents: Array<{ id: string; text: string }>
): Promise<{
  successful: Array<{ id: string; embedding: number[] }>;
  failed: Array<{ id: string; reason: string }>;
  method: 'immediate' | 'queued';
}> {
  const successful: Array<{ id: string; embedding: number[] }> = [];
  const failed: Array<{ id: string; reason: string }> = [];

  // Level 1: Try batch processing with reduced batch size on failure
  const result = await retryWithReducedBatchSize(
    documents,
    async (batch) => {
      const embeddings = await generateEmbeddingBatch(batch.map((d) => d.text));

      batch.forEach((doc, index) => {
        successful.push({
          id: doc.id,
          embedding: embeddings[index],
        });
      });
    },
    50, // Initial batch size
    5 // Minimum batch size
  );

  if (result.success) {
    return {
      successful,
      failed,
      method: 'immediate',
    };
  }

  // Level 2: Queue failed documents for later processing
  logger.warn('Embedding generation failed, queueing documents', {
    failedCount: documents.length - successful.length,
  });

  for (const doc of documents) {
    const alreadyProcessed = successful.some((s) => s.id === doc.id);
    if (!alreadyProcessed) {
      await queueEmbeddingJob(doc.id, doc.text);
      failed.push({
        id: doc.id,
        reason: 'Queued for later processing',
      });
    }
  }

  return {
    successful,
    failed,
    method: 'queued',
  };
}

async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: 'voyage-2',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

async function queueEmbeddingJob(documentId: string, text: string): Promise<void> {
  await db.collection('embeddingQueue').add({
    documentId,
    text: text.substring(0, 10000), // Limit size
    status: 'pending',
    attempts: 0,
    createdAt: Timestamp.now(),
  });
}
```

## 4. Storage Upload with Resumable Fallback

```typescript
import { detectStorageError } from '../services/errorHandler';
import { retryWithBackoff, STORAGE_RETRY_CONFIG } from '../utils/retryStrategy';

/**
 * Upload file with resumable upload fallback
 */
export async function uploadFileWithFallback(
  file: Buffer,
  fileName: string,
  options: {
    userId: string;
    projectId: string;
  }
): Promise<{
  url: string;
  method: 'direct' | 'resumable' | 'chunked';
}> {
  const fileSize = file.length;

  // Level 1: Try direct upload for small files (<10MB)
  if (fileSize < 10 * 1024 * 1024) {
    const result = await retryWithBackoff(
      () => directUpload(file, fileName),
      (error) => detectStorageError(error, fileName, fileSize),
      STORAGE_RETRY_CONFIG,
      options
    );

    if (result.success) {
      return {
        url: result.result!,
        method: 'direct',
      };
    }
  }

  // Level 2: Try resumable upload for medium files (<100MB)
  if (fileSize < 100 * 1024 * 1024) {
    const result = await retryWithBackoff(
      () => resumableUpload(file, fileName),
      (error) => detectStorageError(error, fileName, fileSize),
      STORAGE_RETRY_CONFIG,
      options
    );

    if (result.success) {
      return {
        url: result.result!,
        method: 'resumable',
      };
    }
  }

  // Level 3: Chunked upload for large files
  const url = await chunkedUpload(file, fileName, options);

  return {
    url,
    method: 'chunked',
  };
}

async function directUpload(file: Buffer, fileName: string): Promise<string> {
  const bucket = getStorage().bucket();
  const fileRef = bucket.file(fileName);

  await fileRef.save(file, {
    metadata: {
      contentType: detectContentType(fileName),
    },
  });

  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
  });

  return url;
}

async function resumableUpload(file: Buffer, fileName: string): Promise<string> {
  const bucket = getStorage().bucket();
  const fileRef = bucket.file(fileName);

  await fileRef.save(file, {
    resumable: true,
    metadata: {
      contentType: detectContentType(fileName),
    },
  });

  const [url] = await fileRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  return url;
}

async function chunkedUpload(
  file: Buffer,
  fileName: string,
  options: { userId: string; projectId: string }
): Promise<string> {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const chunks = [];

  for (let i = 0; i < file.length; i += chunkSize) {
    chunks.push(file.slice(i, i + chunkSize));
  }

  logger.info(`Uploading in ${chunks.length} chunks`, {
    fileName,
    fileSize: file.length,
  });

  const bucket = getStorage().bucket();
  const tempFiles: string[] = [];

  // Upload each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunkFileName = `${fileName}.part${i}`;
    const chunkRef = bucket.file(chunkFileName);

    await chunkRef.save(chunks[i]);
    tempFiles.push(chunkFileName);

    logger.info(`Uploaded chunk ${i + 1}/${chunks.length}`, { fileName });
  }

  // Combine chunks (this would need server-side logic)
  // For now, we'll just use the first chunk URL
  const finalRef = bucket.file(fileName);
  await finalRef.save(file);

  // Clean up temp files
  await Promise.all(tempFiles.map((name) => bucket.file(name).delete().catch(() => {})));

  const [url] = await finalRef.getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });

  return url;
}
```

## Integration Example

### Update Cloud Function to use fallback strategies

```typescript
// functions/src/api/processChat.ts

import { sendClaudeMessageWithFallback } from '../services/fallbackStrategies';

export const processChat = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
    maxInstances: 30,
    minInstances: 2,
  })
  .https.onCall(async (data: ProcessChatRequest, context) => {
    // ... existing code ...

    // Use fallback-enabled Claude API
    const result = await sendClaudeMessageWithFallback(userMessage, {
      userId: context.auth!.uid,
      requestId: data.requestId || uuidv4(),
      projectId: data.projectId,
    });

    logger.info('Chat processed', {
      method: result.method,
      userId: context.auth!.uid,
    });

    return {
      response: result.response,
      recoveryMethod: result.method !== 'claude' ? result.method : undefined,
    };
  });
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Owner**: Engineering Team
