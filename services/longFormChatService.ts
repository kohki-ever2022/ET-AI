/**
 * 大量文章（2万〜3万文字）のチャット管理サービス
 *
 * Firestoreの1ドキュメント制限（1MB）を回避するため、
 * 大量文章を5000文字ごとにチャンク化してサブコレクションに保存します。
 */

import { getFirestore, Timestamp, WriteBatch } from 'firebase/firestore';
import type { Chat, ChatChunk } from '../types/firestore';
import { COLLECTIONS } from '../types/firestore';

// ============================================================================
// 定数
// ============================================================================

/**
 * 1チャンクあたりの最大文字数
 * Firestoreの1ドキュメント制限（1MB）を考慮して5000文字に設定
 */
export const MAX_CHUNK_SIZE = 5000;

/**
 * 長文と判定する閾値
 * この文字数を超える場合、チャンク化して保存
 */
export const LONG_FORM_THRESHOLD = 5000;

// ============================================================================
// 型定義
// ============================================================================

export interface SaveLongFormChatParams {
  chatId: string;
  projectId: string;
  channelId: string;
  userId: string;
  userMessage: string;
  aiResponse: string;
  approved?: boolean;
  metadata?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    processingTime?: number;
  };
}

export interface LoadLongFormChatResult {
  chat: Chat;
  fullContent: string;
  loadTime: number; // ミリ秒
}

// ============================================================================
// チャンク化ユーティリティ
// ============================================================================

/**
 * 文字列を指定サイズのチャンクに分割
 */
export function splitIntoChunks(content: string, maxChunkSize: number = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < content.length; i += maxChunkSize) {
    chunks.push(content.substring(i, i + maxChunkSize));
  }

  return chunks;
}

/**
 * コンテンツが長文かどうかを判定
 */
export function isLongFormContent(content: string): boolean {
  return content.length > LONG_FORM_THRESHOLD;
}

// ============================================================================
// 書き込み処理
// ============================================================================

/**
 * 長文チャットをFirestoreに保存
 *
 * @param params - チャット保存パラメータ
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await saveLongFormChat({
 *   chatId: 'chat123',
 *   projectId: 'project456',
 *   channelId: 'channel789',
 *   userId: 'user001',
 *   userMessage: '統合報告書を作成してください',
 *   aiResponse: '...2万文字の統合報告書...',
 *   approved: false,
 *   metadata: {
 *     inputTokens: 100,
 *     outputTokens: 10000,
 *   },
 * });
 * ```
 */
export async function saveLongFormChat(params: SaveLongFormChatParams): Promise<void> {
  const db = getFirestore();
  const {
    chatId,
    projectId,
    channelId,
    userId,
    userMessage,
    aiResponse,
    approved = false,
    metadata,
  } = params;

  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);

  // aiResponseが長文かどうかをチェック
  const isLongForm = isLongFormContent(aiResponse);

  if (!isLongForm) {
    // 通常のチャットとして保存（チャンク化不要）
    await chatRef.set({
      id: chatId,
      projectId,
      channelId,
      userId,
      userMessage,
      aiResponse,
      timestamp: Timestamp.now(),
      approved,
      metadata,
      isLongForm: false,
      totalCharCount: aiResponse.length,
    } as Chat);
    return;
  }

  // チャンク化して保存
  const chunks = splitIntoChunks(aiResponse, MAX_CHUNK_SIZE);
  const totalChunks = chunks.length;
  const chunksCollectionPath = `${COLLECTIONS.CHATS}/${chatId}/${COLLECTIONS.CHAT_CHUNKS}`;

  // メインチャットドキュメント（aiResponseは空文字列）
  const chatData: Chat = {
    id: chatId,
    projectId,
    channelId,
    userId,
    userMessage,
    aiResponse: '', // 長文の場合は空にしてチャンクから読み取る
    timestamp: Timestamp.now(),
    approved,
    metadata,
    isLongForm: true,
    totalCharCount: aiResponse.length,
    totalChunks,
    chunksCollectionPath,
  };

  // バッチ書き込み開始
  const batch = db.batch();

  // メインチャットドキュメントを書き込み
  batch.set(chatRef, chatData);

  // チャンクを書き込み
  chunks.forEach((chunk, index) => {
    const chunkRef = chatRef.collection(COLLECTIONS.CHAT_CHUNKS).doc(String(index));
    const chunkData: ChatChunk = {
      chatId,
      chunkIndex: index,
      totalChunks,
      content: chunk,
      charCount: chunk.length,
      createdAt: Timestamp.now(),
    };
    batch.set(chunkRef, chunkData);
  });

  // バッチコミット
  await batch.commit();

  console.log(`✅ 長文チャット保存完了: ${chatId} (${totalChunks}チャンク, ${aiResponse.length}文字)`);
}

// ============================================================================
// 読み取り処理
// ============================================================================

/**
 * 長文チャットをFirestoreから読み取り
 *
 * @param chatId - チャットID
 * @returns Promise<LoadLongFormChatResult>
 *
 * @example
 * ```typescript
 * const { chat, fullContent, loadTime } = await loadLongFormChat('chat123');
 * console.log(`読み取り時間: ${loadTime}ms`);
 * console.log(`全文: ${fullContent}`);
 * ```
 */
export async function loadLongFormChat(chatId: string): Promise<LoadLongFormChatResult> {
  const startTime = performance.now();
  const db = getFirestore();

  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    throw new Error(`チャット ${chatId} が見つかりません`);
  }

  const chat = chatDoc.data() as Chat;

  // 通常のチャット（チャンク化されていない）
  if (!chat.isLongForm) {
    const loadTime = performance.now() - startTime;
    return {
      chat,
      fullContent: chat.aiResponse,
      loadTime,
    };
  }

  // チャンク化されたチャット
  const chunksSnapshot = await chatRef
    .collection(COLLECTIONS.CHAT_CHUNKS)
    .orderBy('chunkIndex', 'asc')
    .get();

  const chunks: string[] = [];
  chunksSnapshot.docs.forEach((doc) => {
    const chunkData = doc.data() as ChatChunk;
    chunks.push(chunkData.content);
  });

  const fullContent = chunks.join('');
  const loadTime = performance.now() - startTime;

  console.log(
    `✅ 長文チャット読み取り完了: ${chatId} (${chunks.length}チャンク, ${fullContent.length}文字, ${loadTime.toFixed(2)}ms)`
  );

  return {
    chat,
    fullContent,
    loadTime,
  };
}

// ============================================================================
// ストリーミング読み取り
// ============================================================================

/**
 * 長文チャットをストリーミング形式で読み取り
 * 大量文章を段階的に表示する場合に使用
 *
 * @param chatId - チャットID
 * @returns AsyncGenerator<string>
 *
 * @example
 * ```typescript
 * const stream = streamLongFormChat('chat123');
 * for await (const chunk of stream) {
 *   console.log('チャンク受信:', chunk);
 *   // UIに段階的に表示
 * }
 * ```
 */
export async function* streamLongFormChat(chatId: string): AsyncGenerator<string, void, unknown> {
  const db = getFirestore();

  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    throw new Error(`チャット ${chatId} が見つかりません`);
  }

  const chat = chatDoc.data() as Chat;

  // 通常のチャット
  if (!chat.isLongForm) {
    yield chat.aiResponse;
    return;
  }

  // チャンク化されたチャット
  const chunksSnapshot = await chatRef
    .collection(COLLECTIONS.CHAT_CHUNKS)
    .orderBy('chunkIndex', 'asc')
    .get();

  for (const doc of chunksSnapshot.docs) {
    const chunkData = doc.data() as ChatChunk;
    yield chunkData.content;
  }
}

// ============================================================================
// 更新処理
// ============================================================================

/**
 * 長文チャットの承認ステータスを更新
 *
 * @param chatId - チャットID
 * @param approved - 承認状態
 * @param approvedBy - 承認者のUID
 */
export async function updateLongFormChatApproval(
  chatId: string,
  approved: boolean,
  approvedBy: string
): Promise<void> {
  const db = getFirestore();
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);

  await chatRef.update({
    approved,
    approvedBy,
    approvedAt: approved ? Timestamp.now() : null,
  });

  console.log(`✅ チャット承認ステータス更新: ${chatId} -> ${approved}`);
}

// ============================================================================
// 削除処理
// ============================================================================

/**
 * 長文チャットを削除（チャンクも含めて削除）
 *
 * @param chatId - チャットID
 */
export async function deleteLongFormChat(chatId: string): Promise<void> {
  const db = getFirestore();
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    console.warn(`⚠️  チャット ${chatId} が見つかりません`);
    return;
  }

  const chat = chatDoc.data() as Chat;

  // チャンク化されたチャットの場合、チャンクも削除
  if (chat.isLongForm) {
    const chunksSnapshot = await chatRef.collection(COLLECTIONS.CHAT_CHUNKS).get();

    const batch = db.batch();
    chunksSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // メインチャットも削除
    batch.delete(chatRef);

    await batch.commit();
    console.log(`✅ 長文チャット削除完了: ${chatId} (${chunksSnapshot.size}チャンク削除)`);
  } else {
    // 通常のチャット
    await chatRef.delete();
    console.log(`✅ チャット削除完了: ${chatId}`);
  }
}

// ============================================================================
// ユーティリティ
// ============================================================================

/**
 * チャンク統計情報を取得
 */
export async function getChunkStatistics(chatId: string): Promise<{
  totalChunks: number;
  totalCharCount: number;
  averageChunkSize: number;
  chunkSizes: number[];
}> {
  const db = getFirestore();
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    throw new Error(`チャット ${chatId} が見つかりません`);
  }

  const chat = chatDoc.data() as Chat;

  if (!chat.isLongForm) {
    return {
      totalChunks: 1,
      totalCharCount: chat.aiResponse.length,
      averageChunkSize: chat.aiResponse.length,
      chunkSizes: [chat.aiResponse.length],
    };
  }

  const chunksSnapshot = await chatRef.collection(COLLECTIONS.CHAT_CHUNKS).get();

  const chunkSizes: number[] = [];
  chunksSnapshot.docs.forEach((doc) => {
    const chunkData = doc.data() as ChatChunk;
    chunkSizes.push(chunkData.charCount);
  });

  const totalCharCount = chunkSizes.reduce((sum, size) => sum + size, 0);
  const averageChunkSize = totalCharCount / chunkSizes.length;

  return {
    totalChunks: chunkSizes.length,
    totalCharCount,
    averageChunkSize,
    chunkSizes,
  };
}
