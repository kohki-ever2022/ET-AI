/**
 * 長文チャットビューアコンポーネント
 *
 * 統合報告書のような大量文章（2万〜3万文字）を効率的に表示します。
 * ストリーミング形式で段階的に表示することで、UXを向上させます。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { streamLongFormChat, loadLongFormChat } from '../services/longFormChatService';
import type { Chat } from '../types/firestore';

// ============================================================================
// 型定義
// ============================================================================

export interface LongFormChatViewerProps {
  chatId: string;
  enableStreaming?: boolean; // ストリーミング表示を有効化（デフォルト: true）
  onLoadComplete?: (chat: Chat, loadTime: number) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// LongFormChatViewerコンポーネント
// ============================================================================

/**
 * 長文チャットビューア
 *
 * @example
 * ```tsx
 * <LongFormChatViewer
 *   chatId="chat123"
 *   enableStreaming={true}
 *   onLoadComplete={(chat, loadTime) => {
 *     console.log(`読み込み完了: ${loadTime}ms`);
 *   }}
 * />
 * ```
 */
export const LongFormChatViewer: React.FC<LongFormChatViewerProps> = ({
  chatId,
  enableStreaming = true,
  onLoadComplete,
  onError,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [progress, setProgress] = useState<{
    loaded: number;
    total: number;
    percentage: number;
  }>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  // ストリーミング読み込み
  const loadWithStreaming = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setContent('');

      let accumulatedContent = '';
      let chunkCount = 0;

      const stream = streamLongFormChat(chatId);

      for await (const chunk of stream) {
        accumulatedContent += chunk;
        chunkCount++;

        setContent(accumulatedContent);

        // 進捗状況を更新（概算）
        setProgress((prev) => ({
          ...prev,
          loaded: chunkCount,
        }));
      }

      setLoading(false);

      // チャット情報を取得（完全な情報を得るため）
      const { chat: fullChat, loadTime } = await loadLongFormChat(chatId);
      setChat(fullChat);

      if (onLoadComplete) {
        onLoadComplete(fullChat, loadTime);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);

      if (onError) {
        onError(error);
      }
    }
  }, [chatId, onLoadComplete, onError]);

  // 一括読み込み
  const loadWithoutStreaming = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { chat: fullChat, fullContent, loadTime } = await loadLongFormChat(chatId);

      setChat(fullChat);
      setContent(fullContent);
      setLoading(false);

      if (onLoadComplete) {
        onLoadComplete(fullChat, loadTime);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);

      if (onError) {
        onError(error);
      }
    }
  }, [chatId, onLoadComplete, onError]);

  // コンポーネントマウント時に読み込み
  useEffect(() => {
    if (enableStreaming) {
      loadWithStreaming();
    } else {
      loadWithoutStreaming();
    }
  }, [chatId, enableStreaming, loadWithStreaming, loadWithoutStreaming]);

  // ============================================================================
  // レンダリング
  // ============================================================================

  // エラー表示
  if (error) {
    return (
      <div className="long-form-chat-viewer error">
        <div className="error-message">
          <h3>❌ エラーが発生しました</h3>
          <p>{error.message}</p>
          <button
            onClick={() => {
              if (enableStreaming) {
                loadWithStreaming();
              } else {
                loadWithoutStreaming();
              }
            }}
            className="retry-button"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ローディング表示
  if (loading && content === '') {
    return (
      <div className="long-form-chat-viewer loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>チャットを読み込み中...</p>
        </div>
      </div>
    );
  }

  // コンテンツ表示
  return (
    <div className="long-form-chat-viewer">
      {/* メタ情報 */}
      {chat && (
        <div className="chat-meta">
          <div className="meta-item">
            <span className="meta-label">文字数:</span>
            <span className="meta-value">{chat.totalCharCount?.toLocaleString() || 'N/A'}</span>
          </div>
          {chat.isLongForm && (
            <div className="meta-item">
              <span className="meta-label">チャンク数:</span>
              <span className="meta-value">{chat.totalChunks}</span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-label">種類:</span>
            <span className="meta-value">{chat.isLongForm ? '長文' : '通常'}</span>
          </div>
        </div>
      )}

      {/* ローディングインジケーター（ストリーミング中） */}
      {loading && (
        <div className="streaming-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.percentage}%` }}></div>
          </div>
          <p className="progress-text">読み込み中... ({progress.loaded} チャンク)</p>
        </div>
      )}

      {/* チャットコンテンツ */}
      <div className="chat-content">
        <div className="user-message">
          <strong>ユーザー:</strong>
          <p>{chat?.userMessage || ''}</p>
        </div>

        <div className="ai-response">
          <strong>AI応答:</strong>
          <div className="response-content whitespace-pre-wrap">{content}</div>
        </div>
      </div>

      {/* スタイル */}
      <style jsx>{`
        .long-form-chat-viewer {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
            Arial, sans-serif;
        }

        .chat-meta {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
          font-size: 14px;
        }

        .meta-item {
          display: flex;
          gap: 8px;
        }

        .meta-label {
          font-weight: 600;
          color: #666;
        }

        .meta-value {
          color: #333;
        }

        .streaming-progress {
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4caf50, #8bc34a);
          transition: width 0.3s ease;
        }

        .progress-text {
          margin-top: 8px;
          font-size: 14px;
          color: #666;
          text-align: center;
        }

        .chat-content {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
        }

        .user-message,
        .ai-response {
          margin-bottom: 20px;
        }

        .user-message strong,
        .ai-response strong {
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
          color: #333;
        }

        .user-message p {
          color: #555;
          line-height: 1.6;
        }

        .response-content {
          color: #333;
          line-height: 1.8;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .loading-spinner p {
          margin-top: 20px;
          color: #666;
          font-size: 16px;
        }

        .error-message {
          padding: 40px 20px;
          text-align: center;
        }

        .error-message h3 {
          color: #e74c3c;
          margin-bottom: 15px;
        }

        .error-message p {
          color: #666;
          margin-bottom: 20px;
        }

        .retry-button {
          padding: 10px 24px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .retry-button:hover {
          background: #2980b9;
        }

        .whitespace-pre-wrap {
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// シンプルバージョン（スタイルなし）
// ============================================================================

/**
 * 長文チャットビューア（シンプル版）
 * 外部CSSを使用する場合に使用
 */
export const SimpleLongFormChatViewer: React.FC<LongFormChatViewerProps> = ({
  chatId,
  enableStreaming = true,
  onLoadComplete,
  onError,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (enableStreaming) {
          const stream = streamLongFormChat(chatId);
          let accumulatedContent = '';

          for await (const chunk of stream) {
            accumulatedContent += chunk;
            setContent(accumulatedContent);
          }
        } else {
          const { fullContent, chat, loadTime } = await loadLongFormChat(chatId);
          setContent(fullContent);

          if (onLoadComplete) {
            onLoadComplete(chat, loadTime);
          }
        }

        setLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);

        if (onError) {
          onError(error);
        }
      }
    }

    load();
  }, [chatId, enableStreaming, onLoadComplete, onError]);

  if (error) {
    return <div className="error">エラー: {error.message}</div>;
  }

  if (loading && content === '') {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="long-form-chat-content">
      <div className="whitespace-pre-wrap">{content}</div>
    </div>
  );
};

export default LongFormChatViewer;
