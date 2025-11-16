// FirestoreのTimestampの代用
export type Timestamp = Date;

// FIX: Add ReportType enum as it was missing, causing import errors.
export enum ReportType {
    CorporateSummary = '企業概要サマリー',
    ComplianceCheck = 'コンプライアンスチェック',
}

export interface User {
    uid: string;
    email: string;
    displayName: string;
    customClaims?: {
        role: 'admin' | 'employee';
    };
}

export interface Project {
    id: string; // 例: "noritsu-koki"
    companyName: string; // 正式名称
    industry: string; // 業種
    fiscalYearEnd: string; // 決算月 (例: "3月")
    members: string[]; // ユーザーIDの配列
    knowledgeVersion: number; // ナレッジのバージョン番号
    createdBy: string; // 作成者のユーザーID
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastActivity: Timestamp; // 最終アクティビティ日時
    documents: DocumentFile[];
    channels: Channel[];
}

export interface Channel {
    id: string;
    projectId: string; // 親プロジェクトのID
    name: string; // チャンネル名
    category: 'integrated-report' | 'shareholder-communication' | 'summary' | 'interview' | 'qa' | 'other';
    visibility: {
        type: 'shared' | 'personal';
        viewableBy: string[]; // personalの場合のみ使用
    };
    target?: { // 統合報告書などの場合
        totalPages: number;
        charsPerPage: number;
        sectionTargets: {
            sectionName: string;
            targetChars: number;
        }[];
    };
    status: 'draft' | 'review' | 'approved' | 'delivered';
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastActivity: Timestamp;
    chats: Chat[];
    // FIX: Add context and draft properties to align the type with its usage in the application.
    context?: ChatContext | null;
    draft?: string;
}

export interface Chat {
    id:string;
    channelId: string; // 親チャンネルのID
    projectId: string; // 冗長だが検索効率化のため
    userId: string;
    userName: string;
    timestamp: Timestamp;
    userMessage: string;
    aiResponse: string;
    characterCount: number; // AI応答の文字数
    referencedKnowledge: string[]; // 参照したナレッジのID配列
    referencedDocuments: string[]; // 参照した文書のID配列
    approved: boolean;
    approvedBy?: string;
    approvedAt?: Timestamp;
    modifications: {
        originalText: string;
        modifiedText: string;
        modifiedBy: string;
        modifiedAt: Timestamp;
        reason?: string;
    }[];
    addedToKnowledge: boolean; // ナレッジ化済みフラグ
    context?: ChatContext | null;
    draft?: string;
    // FIX: Add updatedAt property to Chat type to allow for tracking modifications.
    updatedAt?: Timestamp;
}

export interface Knowledge {
    id: string;
    projectId: string;
    sourceType: 'uploaded-document' | 'approved-chat' | 'manual-entry' | 'learning-pattern';
    sourceId: string; // 元のドキュメント/チャットのID
    content: string; // テキスト内容
    embedding: number[]; // Voyage AI 512次元ベクトル
    category: 'company-info' | 'strategy' | 'financial' | 'governance' | 'esg' | 'human-capital' | 'expression-pattern' | 'values';
    reliability: number; // 0-100の信頼度スコア
    usageCount: number; // 参照された回数
    lastUsed?: Timestamp;
    version: number; // バージョン番号
    previousVersion?: string; // 前バージョンのID
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface LearningPattern {
    id: string;
    projectId: string;
    patternType: 'vocabulary' | 'structure' | 'emphasis' | 'tone';
    patternContent: string; // パターンの説明
    examples: string[]; // 実例の配列
    reliability: number; // 0-100の信頼度スコア
    extractedFrom: string[]; // 抽出元チャットのID配列
    validatedBy?: string;
    validatedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}


export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string | null; // For text files
  uploadDate: Date;
  status: 'scanning' | 'ready';
  estimatedTokens?: number;
  exceedsTokenLimit?: boolean;
}

export interface ChatContext {
  document: DocumentFile;
  snippet?: string; // Optional text snippet for focused context
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}