/**
 * Type definitions for ET-AI Cloud Functions
 *
 * These types mirror the main application types to ensure consistency
 * between frontend and backend.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'admin' | 'employee';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  originalName: string;
  contentType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  size: number;
  uploadedBy: string;
  uploadedAt: Timestamp;
  status: DocumentStatus;
  storageUrl: string;
  processedTextUrl?: string;
  extractedText?: string;
  chunks?: DocumentChunk[];
  errorMessage?: string;
}

export interface DocumentChunk {
  chunkId: string;
  content: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  embedding?: number[];
}

// ============================================================================
// Knowledge Types
// ============================================================================

export interface Knowledge {
  id: string;
  projectId: string;
  content: string;
  source: 'document' | 'chat' | 'manual';
  sourceId: string;
  category?: string;
  embedding?: number[];
  metadata?: {
    documentName?: string;
    pageNumber?: number;
    chunkIndex?: number;
    extractedAt?: Timestamp;
  };
  createdBy: string;
  createdAt: Timestamp;
  duplicateGroupId?: string;
  isRepresentative?: boolean;
}

// ============================================================================
// Deduplication Types
// ============================================================================

export interface KnowledgeGroup {
  id: string;
  projectId: string;
  representativeKnowledgeId: string;
  duplicateKnowledgeIds: string[];
  similarityScores: Record<string, number>;
  createdAt: Timestamp;
  detectionMethod: 'exact' | 'semantic' | 'fuzzy';
}

// ============================================================================
// Embedding Types
// ============================================================================

export interface EmbeddingRequest {
  texts: string[];
  model?: 'voyage-large-2' | 'voyage-code-2';
  inputType?: 'document' | 'query';
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}

// ============================================================================
// File Processing Types
// ============================================================================

export interface FileProcessingResult {
  success: boolean;
  documentId?: string;
  extractedText?: string;
  chunkCount?: number;
  embeddingCount?: number;
  knowledgeIds?: string[];
  duplicatesFound?: number;
  error?: string;
}

export interface TextExtractionResult {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    characterCount: number;
  };
}

export interface ChunkingOptions {
  maxChunkSize: number; // in tokens
  overlapSize: number; // in tokens
  minChunkSize: number; // in tokens
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorType = 'rate_limit' | 'token_limit' | 'api_error' | 'network_error' | 'validation_error';

export interface ErrorLog {
  userId?: string;
  projectId?: string;
  channelId?: string;
  errorType: ErrorType;
  errorMessage: string;
  stackTrace?: string;
  userMessage?: string;
  context?: Record<string, any>;
  timestamp: Timestamp;
}

// ============================================================================
// Vector Search Types
// ============================================================================

export interface VectorSearchQuery {
  projectId: string;
  queryText: string;
  limit?: number;
  threshold?: number;
  category?: string;
}

export interface VectorSearchResult {
  knowledge: Knowledge;
  similarity: number;
  distance: number;
}
