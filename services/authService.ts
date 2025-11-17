/**
 * 認証サービス（ドメイン制限 + RBAC）
 *
 * ET-AIの認証システムは、@trias.co.jpドメインのみを許可し、
 * admin（管理者）とemployee（社員）の2つのロールを提供します。
 */

import { User as FirebaseUser } from 'firebase/auth';
import { User, UserRole, isValidEmail } from '../types/firestore';

/**
 * 許可されたメールドメイン
 */
const ALLOWED_DOMAIN = '@trias.co.jp';

/**
 * メールドメインの検証
 */
export function validateEmailDomain(email: string): boolean {
  // 基本的なメール形式チェック
  if (!isValidEmail(email)) {
    return false;
  }

  // ドメインチェック
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

/**
 * ユーザー登録時のドメインチェック
 */
export function canRegister(email: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!validateEmailDomain(email)) {
    return {
      allowed: false,
      reason: `登録は ${ALLOWED_DOMAIN} ドメインのメールアドレスのみ許可されています。`,
    };
  }

  return { allowed: true };
}

/**
 * ロールの決定（メールアドレスベース）
 * 本番環境では、管理者が手動で設定することを推奨
 */
export function determineRole(email: string): UserRole {
  // デフォルトは employee
  // 特定のメールアドレスを admin として設定する場合はここで判定
  const adminEmails = [
    'admin@trias.co.jp',
    // 必要に応じて追加
  ];

  if (adminEmails.includes(email.toLowerCase())) {
    return 'admin';
  }

  return 'employee';
}

/**
 * 権限チェック: プロジェクト作成
 */
export function canCreateProject(user: User): boolean {
  return user.role === 'admin';
}

/**
 * 権限チェック: プロジェクト削除
 */
export function canDeleteProject(user: User): boolean {
  return user.role === 'admin';
}

/**
 * 権限チェック: システムプロンプト更新
 */
export function canUpdateSystemPrompt(user: User): boolean {
  return user.role === 'admin';
}

/**
 * 権限チェック: ユーザー管理
 */
export function canManageUsers(user: User): boolean {
  return user.role === 'admin';
}

/**
 * 権限チェック: チャンネル閲覧
 */
export function canViewChannel(
  user: User,
  channel: {
    visibility: {
      type: 'shared' | 'personal';
      viewableBy?: string[];
    };
    createdBy?: string;
  }
): boolean {
  // 管理者は全てのチャンネルを閲覧可能
  if (user.role === 'admin') return true;

  // 共有チャンネルは全員が閲覧可能
  if (channel.visibility.type === 'shared') return true;

  // 個人タスクチャンネルは作成者または指定されたユーザーのみ
  if (channel.visibility.type === 'personal') {
    return (
      channel.createdBy === user.uid ||
      channel.visibility.viewableBy?.includes(user.uid) ||
      false
    );
  }

  return false;
}

/**
 * 権限チェック: 他人のチャット承認
 */
export function canApproveOthersChat(user: User): boolean {
  return user.role === 'admin';
}

/**
 * 権限エラーメッセージ
 */
export const PERMISSION_ERRORS = {
  DOMAIN_NOT_ALLOWED: `登録は ${ALLOWED_DOMAIN} ドメインのメールアドレスのみ許可されています。`,
  NOT_ADMIN: 'この操作は管理者のみ実行可能です。',
  CANNOT_VIEW_CHANNEL: 'このチャンネルを閲覧する権限がありません。',
  CANNOT_CREATE_PROJECT: 'プロジェクトの作成は管理者のみ可能です。',
  CANNOT_DELETE_PROJECT: 'プロジェクトの削除は管理者のみ可能です。',
  CANNOT_UPDATE_PROMPT: 'システムプロンプトの更新は管理者のみ可能です。',
  CANNOT_MANAGE_USERS: 'ユーザー管理は管理者のみ可能です。',
} as const;

/**
 * Firebase Authenticationのカスタムクレーム設定
 * （Cloud Functionsで実行）
 */
export interface CustomClaims {
  role: UserRole;
  projectIds?: string[];
}

/**
 * ユーザー情報のマッピング（Firebase User → ET-AI User）
 */
export function mapFirebaseUserToUser(
  firebaseUser: FirebaseUser,
  role: UserRole = 'employee'
): Partial<User> {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown',
    role,
  };
}

/**
 * セッション管理
 */
export class SessionManager {
  private static instance: SessionManager;
  private currentUser: User | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  hasPermission(permission: keyof typeof PERMISSION_ERRORS): boolean {
    if (!this.currentUser) return false;

    switch (permission) {
      case 'NOT_ADMIN':
      case 'CANNOT_CREATE_PROJECT':
      case 'CANNOT_DELETE_PROJECT':
      case 'CANNOT_UPDATE_PROMPT':
      case 'CANNOT_MANAGE_USERS':
        return this.isAdmin();
      default:
        return true;
    }
  }

  logout(): void {
    this.currentUser = null;
  }
}

// シングルトンインスタンスをエクスポート
export const sessionManager = SessionManager.getInstance();

/**
 * 権限チェック: プロジェクト閲覧
 */
export function canViewProject(
  user: User,
  project: { members: string[] }
): boolean {
  // 管理者は全てのプロジェクトを閲覧可能
  if (user.role === 'admin') {
    return true;
  }

  // プロジェクトメンバーは閲覧可能
  return project.members.includes(user.uid);
}

/**
 * 権限チェック: チャンネル編集
 */
export function canEditChannel(
  user: User,
  channel: {
    createdBy?: string;
    visibility?: {
      type: 'shared' | 'personal';
    };
  }
): boolean {
  // 管理者は全てのチャンネルを編集可能
  if (user.role === 'admin') {
    return true;
  }

  // 作成者は編集可能
  return channel.createdBy === user.uid;
}

/**
 * 権限チェック: チャット承認
 */
export function canApproveChat(user: User): boolean {
  return user.role === 'admin';
}
