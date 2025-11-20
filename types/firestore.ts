/**
 * ET-AI Firestore データモデル定義
 *
 * このファイルは完全設計仕様書に基づいた型定義を提供します。
 * すべてのFirestoreコレクションのスキーマを厳密に定義しています。
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// Users Collection
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
// Projects Collection
// ============================================================================

export interface Project {
  id: string;
  companyName: string;
  industry: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  members: string[]; // UID配列
  approvedChatCount?: number;
  lastPatternAnalysisCount?: number;
  lastPatternAnalysisAt?: Timestamp;
  status: 'active' | 'archived';

  // 時系列構造の管理
  fiscalYearStartMonth: number; // 例: 4（4月始まり）
  shareholderCommunicationFrequency: 'annual' | 'semi-annual' | 'quarterly';
  currentFiscalYearId?: string; // 現在の年度ID
  currentPeriodId?: string; // 現在の期ID
}

// ============================================================================
// Fiscal Years Collection (Sub-collection of Projects)
// ============================================================================

export type FiscalYearStatus = 'planning' | 'in-progress' | 'completed';

export interface FiscalYear {
  id: string; // 例: "2024"
  projectId: string;
  startDate: Timestamp; // 例: 2024-04-01
  endDate: Timestamp; // 例: 2025-03-31
  label: string; // 例: "2024年度"
  status: FiscalYearStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Periods Collection (Sub-collection of Fiscal Years)
// ============================================================================

export type PeriodType = 'quarterly' | 'half-yearly' | 'annual';
export type PeriodStatus = 'not-started' | 'in-progress' | 'completed' | 'archived';

export interface Period {
  id: string; // 例: "q1", "q2", "q3", "q4", "h1", "h2", "full-year"
  fiscalYearId: string;
  projectId: string;
  periodType: PeriodType;
  periodNumber: number; // 1, 2, 3, 4（四半期の場合）、1, 2（半期の場合）、1（通期の場合）
  startDate: Timestamp;
  endDate: Timestamp;
  label: string; // 例: "第1四半期", "上半期", "通期"

  // IR資料の参照
  integratedReportChannelId?: string; // この期の統合報告書チャンネル
  shareholderCommunicationChannelIds: string[]; // この期の株主通信チャンネル

  // 財務データ（オプション、将来的に追加）
  revenue?: number;
  operatingProfit?: number;
  netIncome?: number;

  status: PeriodStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// Channels Collection
// ============================================================================

export type ChannelCategory =
  | 'integrated-report'
  | 'shareholder-letter'
  | 'sustainability-report'
  | 'financial-results'
  | 'other';

export type ChannelVisibility = 'shared' | 'personal';

export interface Channel {
  id: string;
  projectId: string;
  name: string;
  category: ChannelCategory;
  visibility: {
    type: ChannelVisibility;
    viewableBy?: string[]; // 'personal'の場合のみ使用
  };
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt?: Timestamp;
  messageCount: number;

  // 時系列構造との関連付け
  fiscalYearId?: string; // 年度ID（例: "2024"）
  periodId?: string; // 期ID（例: "h1", "q1"）
}

// ============================================================================
// Chats Collection
// ============================================================================

export interface Chat {
  id: string;
  projectId: string;
  channelId: string;
  userId: string;
  userMessage: string;
  aiResponse: string;
  timestamp: Timestamp;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Timestamp;
  modifiedHistory?: Array<{
    version: number;
    content: string;
    modifiedBy: string;
    modifiedAt: Timestamp;
    reason?: string;
  }>;
  metadata?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    processingTime?: number;
  };
}

// ============================================================================
// Knowledge Collection（ナレッジベース）
// ============================================================================

export type KnowledgeSourceType =
  | 'uploaded-document'
  | 'approved-chat'
  | 'manual-entry';

export type KnowledgeCategory =
  | 'document'
  | 'pattern'
  | 'vocabulary'
  | 'style'
  | 'numeric'
  | 'structure';

export interface Knowledge {
  id: string;
  projectId: string;
  sourceType: KnowledgeSourceType;
  sourceId: string; // documentId or chatId
  content: string;
  embedding: number[]; // Voyage AI Embedding (1024次元)
  category: KnowledgeCategory;
  reliability: number; // 0-100
  usageCount: number;
  lastUsed?: Timestamp;
  chunkIndex?: number;
  totalChunks?: number;
  version?: number;
  metadata?: {
    documentName?: string;
    pageNumber?: number;
    sectionTitle?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // 時系列構造との関連付け（ナレッジ検索の優先順位付けに使用）
  fiscalYearId?: string; // 年度ID（例: "2024"）
  periodId?: string; // 期ID（例: "h1", "q1"）
}

// ============================================================================
// Documents Collection（アップロードファイル）
// ============================================================================

export interface Document {
  id: string;
  projectId: string;
  filename: string;
  contentType: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fullText: string;
  summarizedText?: string; // トークン超過時の要約版
  metadata?: {
    pages?: number;
    info?: any;
    messages?: any[];
  };
  storagePath: string;
  characterCount: number;
  estimatedTokens?: number;
  exceedsTokenLimit?: boolean;
  sections?: Array<{
    title: string;
    charCount: number;
  }>;
  uploadedBy: string;
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
  status: 'uploading' | 'processing' | 'processed' | 'error';
  error?: string;
}

// ============================================================================
// System Prompts Collection（第2層：IR専門知識）
// ============================================================================

export type SystemPromptCategory =
  | 'ir-framework'
  | 'tcfd'
  | 'human-capital'
  | 'sx-concept';

export interface SystemPromptSection {
  id: string;
  category: SystemPromptCategory;
  title: string;
  content: string; // プロンプトの内容
  version: number;
  effectiveFrom: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'draft' | 'active' | 'archived';
  changelog: Array<{
    version: number;
    changes: string;
    updatedBy: string;
    updatedAt: Timestamp;
  }>;
}

// ============================================================================
// Learning Patterns Collection（学習パターン）
// ============================================================================

export type PatternType = 'vocabulary' | 'style' | 'numeric' | 'structure';

export interface LearningPattern {
  id: string;
  projectId: string;
  type: PatternType;
  pattern: string;
  examples: string[];
  confidence: number; // 0-100
  extractedFrom: string[]; // chatId配列
  createdAt: Timestamp;
}

// ============================================================================
// Cache Metrics Collection（キャッシュメトリクス）
// ============================================================================

export interface CacheMetrics {
  id: string;
  timestamp: Timestamp;
  projectId: string;
  userId: string;
  channelId: string;

  // APIレスポンスから取得
  inputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;

  // 計算される指標
  cacheHitRate: number; // 0.0 ~ 1.0
  costSavings: number; // USD
}

// ============================================================================
// Error Logs Collection
// ============================================================================

export type ErrorType = 'rate_limit' | 'token_limit' | 'api_error' | 'network_error' | 'validation_error';

export interface ErrorLog {
  id: string;
  timestamp: Timestamp;
  userId: string;
  projectId: string;
  channelId: string;
  errorType: ErrorType;
  errorMessage: string;
  stackTrace?: string;
  userMessage: string;
  systemPromptVersion: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
}

// ============================================================================
// Chat Status Collection（リアルタイムステータス）
// ============================================================================

export type ChatStatusType = 'queued' | 'processing' | 'completed' | 'error';

export interface ChatStatus {
  chatId: string;
  status: ChatStatusType;
  queuePosition?: number;
  estimatedWaitTime?: number;
  error?: {
    type: ErrorType;
    message: string;
    retryable: boolean;
  };
  progress?: {
    step: string;
    percentage: number;
  };
}

// ============================================================================
// Knowledge Groups Collection（関連ナレッジグループ化）
// ============================================================================

export interface KnowledgeGroup {
  id: string;
  projectId: string;
  members: string[]; // knowledgeId配列
  avgSimilarity: number; // 0.0 ~ 1.0
  representativeId: string; // 代表となるknowledgeId
  createdAt: Timestamp;
}

// ============================================================================
// Firestore Collection Names（コレクション名定数）
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  FISCAL_YEARS: 'fiscalYears', // Sub-collection of projects
  PERIODS: 'periods', // Sub-collection of fiscalYears
  CHANNELS: 'channels',
  CHATS: 'chats',
  KNOWLEDGE: 'knowledge',
  DOCUMENTS: 'documents',
  SYSTEM_PROMPTS: 'system_prompts',
  LEARNING_PATTERNS: 'learningPatterns',
  CACHE_METRICS: 'cacheMetrics',
  ERROR_LOGS: 'error_logs',
  CHAT_STATUS: 'chat_status',
  KNOWLEDGE_GROUPS: 'knowledgeGroups',
} as const;

// ============================================================================
// Firestore Security Rules用の型ガード
// ============================================================================

export function isValidEmail(email: string): boolean {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return false;
  }

  return email.endsWith('@trias.co.jp');
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function canViewChannel(user: User, channel: Channel): boolean {
  if (isAdmin(user)) return true;

  if (channel.visibility.type === 'shared') return true;

  if (channel.visibility.type === 'personal') {
    return channel.visibility.viewableBy?.includes(user.uid) || false;
  }

  return false;
}

export function canDeleteProject(user: User): boolean {
  return isAdmin(user);
}
