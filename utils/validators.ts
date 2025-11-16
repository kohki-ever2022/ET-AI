/**
 * バリデーションユーティリティ
 *
 * Zodを使用した厳密な型安全バリデーション
 */

import { z } from 'zod';
import {
  ChannelCategory,
  ChannelVisibility,
  SystemPromptCategory,
  UserRole,
} from '../types/firestore';

// ============================================================================
// プロジェクト関連
// ============================================================================

export const ProjectSchema = z.object({
  companyName: z.string().min(1, '企業名は必須です').max(100, '企業名は100文字以内で入力してください'),
  industry: z.string().min(1, '業種は必須です'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  members: z.array(z.string()).optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;

// ============================================================================
// チャンネル関連
// ============================================================================

const ChannelCategoryEnum = z.enum([
  'integrated-report',
  'shareholder-letter',
  'sustainability-report',
  'financial-results',
  'other',
]);

const ChannelVisibilityEnum = z.enum(['shared', 'personal']);

export const ChannelSchema = z.object({
  name: z.string().min(1, 'チャンネル名は必須です').max(100, 'チャンネル名は100文字以内で入力してください'),
  category: ChannelCategoryEnum,
  visibility: z.object({
    type: ChannelVisibilityEnum,
    viewableBy: z.array(z.string()).optional(),
  }),
});

export type ChannelInput = z.infer<typeof ChannelSchema>;

// ============================================================================
// チャット関連
// ============================================================================

export const ChatMessageSchema = z.object({
  userMessage: z
    .string()
    .min(1, 'メッセージを入力してください')
    .max(50000, 'メッセージは50,000文字以内で入力してください'),
});

export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;

// ============================================================================
// ファイルアップロード関連
// ============================================================================

export const FileUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  size: z.number().max(5 * 1024 * 1024, 'ファイルサイズは5MB以下である必要があります'),
});

export type FileUploadInput = z.infer<typeof FileUploadSchema>;

// ============================================================================
// システムプロンプト関連
// ============================================================================

const SystemPromptCategoryEnum = z.enum([
  'ir-framework',
  'tcfd',
  'human-capital',
  'sx-concept',
]);

export const SystemPromptSchema = z.object({
  category: SystemPromptCategoryEnum,
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  changeDescription: z.string().min(1).max(500),
});

export type SystemPromptInput = z.infer<typeof SystemPromptSchema>;

// ============================================================================
// ユーザー関連
// ============================================================================

export const UserEmailSchema = z.string().email('有効なメールアドレスを入力してください');

export const UserRoleSchema = z.enum(['admin', 'employee']);

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * Zodバリデーションのエラーメッセージを整形
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
}

/**
 * 安全なバリデーション実行
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatZodError(error) };
    }
    return { success: false, error: '不明なバリデーションエラー' };
  }
}

/**
 * ファイル拡張子の検証
 */
export function validateFileExtension(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.docx'];
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

/**
 * ファイルサイズの検証（バイト単位）
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 5): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * テキスト長の検証（トークン数推定）
 */
export function validateTextLength(text: string, maxTokens: number = 150000): boolean {
  const estimatedTokens = Math.ceil(text.length / 0.7); // 日本語推定
  return estimatedTokens <= maxTokens;
}
