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
  sourceType: 'document' | 'approved-chat' | 'manual';
  sourceId: string;
  category?: string;
  embedding?: number[];

  // Reliability and usage tracking
  reliability?: number;  // 50-100
  usageCount?: number;
  version?: number;
  lastUsed?: Timestamp;

  metadata?: {
    documentName?: string;
    pageNumber?: number;
    chunkIndex?: number;
    extractedAt?: Timestamp;
    // Chat-specific metadata
    channelId?: string;
    originalQuestion?: string;
    approvedBy?: string;
    approvedAt?: Timestamp;
  };

  createdBy?: string;  // Optional for auto-generated knowledge
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  duplicateGroupId?: string;
  isRepresentative?: boolean;

  // Archive information
  archived?: boolean;
  archivedAt?: Timestamp;
  archivedReason?: 'unused_90_days' | 'manual' | 'duplicate' | 'low_quality';
  archivedByJobId?: string;
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
  averageSimilarity: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  detectionMethod: 'exact' | 'semantic' | 'fuzzy';
  mergedCount: number;
  totalUsageCount: number;
  detectedByJobId?: string;
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

// ============================================================================
// Chat Types
// ============================================================================

export type ChatStatus = 'queued' | 'processing' | 'completed' | 'error';

export interface Chat {
  id: string;
  channelId: string;
  projectId: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
  userMessage: string;
  aiResponse: string;
  characterCount: number;

  // Approval
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;

  // Knowledge base integration
  addedToKnowledge: boolean;
  knowledgeId?: string;
  knowledgeError?: string;
  similarityScore?: number;

  // Modification history
  modifiedHistory?: ModificationRecord[];

  // Metadata
  metadata?: {
    modelUsed: string;
    usage: {
      inputTokens: number;
      cacheCreationInputTokens: number;
      cacheReadInputTokens: number;
      outputTokens: number;
    };
    cacheHitRate: number;
    costSavings: number;
  };
}

export interface ModificationRecord {
  modifiedBy: string;
  modifiedAt: Timestamp;
  originalText: string;
  modifiedText: string;
  reason?: string;
}

// ============================================================================
// Learning Pattern Types
// ============================================================================

export type PatternType = 'vocabulary' | 'structure' | 'emphasis' | 'tone' | 'length';

export interface LearningPattern {
  id: string;
  projectId: string;
  patternType: PatternType;
  patternContent: string;

  // Pattern-specific details
  details?: {
    // Vocabulary
    tfIdfScores?: Record<string, number>;
    wordFrequencies?: Record<string, number>;

    // Structure
    paragraphCount?: number;
    hasLists?: boolean;
    hasCodeBlocks?: boolean;
    hasHeadings?: boolean;

    // Emphasis
    boldCount?: number;
    italicCount?: number;
    quoteCount?: number;

    // Tone
    formalityScore?: number;      // 0-100
    politenesPatterns?: string[];

    // Length
    averageLength?: number;
    stdDeviation?: number;
    categoryLengths?: Record<string, number>;
  };

  // Examples and sources
  examples: string[];
  extractedFrom: string[];  // chat IDs

  // Reliability metrics
  reliability: number;      // 50-100
  occurrenceCount: number;
  confidence?: number;      // Confidence score

  // Validator info
  validatedBy: string;
  validatedAt: Timestamp;
  autoExtracted?: boolean;  // Auto-extraction flag

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Batch job reference
  extractedByJobId?: string;
}

// ============================================================================
// Channel Types
// ============================================================================

export interface Channel {
  id: string;
  projectId: string;
  name: string;
  description?: string;

  // Statistics
  messageCount: number;
  lastMessageAt?: Timestamp;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;

  // Members
  members: string[];  // User IDs

  // Statistics
  approvedChatCount?: number;
  lastPatternAnalysisCount?: number;
  lastPatternAnalysisAt?: Timestamp;
  lastActivity?: Timestamp;

  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// Queue Types
// ============================================================================

export interface ProcessingQueueItem {
  id: string;
  chatId: string;
  projectId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// Batch Job Types
// ============================================================================

export type BatchJobType = 'weekly-pattern-extraction' | 'knowledge-maintenance' | 'archive-cleanup';
export type BatchJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface BatchJob {
  id: string;
  type: BatchJobType;
  status: BatchJobStatus;

  // Progress tracking
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentStep: string;
  };

  // Target period
  targetPeriod: {
    startDate: Timestamp;
    endDate: Timestamp;
  };

  // Timestamps
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  // Results
  result?: {
    projectsProcessed: number;
    chatsAnalyzed: number;
    patternsExtracted: {
      vocabulary: number;
      structure: number;
      emphasis: number;
      tone: number;
      length: number;
    };
    duplicatesFound: number;
    duplicatesMerged: number;
    knowledgeArchived: number;
  };

  // Errors
  errors?: Array<{
    step: string;
    error: string;
    timestamp: Timestamp;
  }>;
}

// ============================================================================
// Archive Types
// ============================================================================

export type ArchiveReason = 'unused_90_days' | 'manual' | 'duplicate' | 'low_quality';

export interface ArchiveLog {
  id: string;
  knowledgeId: string;
  projectId: string;
  reason: ArchiveReason;
  archivedAt: Timestamp;
  archivedByJobId?: string;
  metadata?: {
    lastUsed?: Timestamp;
    usageCount?: number;
    reliability?: number;
  };
}
