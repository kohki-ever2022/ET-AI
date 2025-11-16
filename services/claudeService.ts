/**
 * Claude API Service with 3-Layer Prompt Caching
 *
 * このサービスは月間コストを約90%削減する3層キャッシング戦略を実装します。
 *
 * 【3層境界設計】
 * - 第1層：コア制約（500トークン、ヒット率100%）
 * - 第2層：IR専門知識（1500トークン、ヒット率95%）
 * - 第3層：プロジェクト固有ナレッジ（2500トークン、ヒット率70%）
 *
 * 合計約4500トークンがキャッシュされ、キャッシュ読み取りコストは通常の10%
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  CORE_CONSTRAINTS,
  detectInjectionPattern,
  validateOutput,
} from '../prompts/core-constraints';
import {
  CachedSystemPrompt,
  CachedContent,
  ClaudeAPIRequest,
  ClaudeAPIResponse,
  calculateCacheHitRate,
  calculateCostSavings,
  estimateTokenCount,
  TOKEN_LIMITS,
} from '../types/claude';
import { Knowledge, SystemPromptSection } from '../types/firestore';

// Anthropic クライアントの初期化
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
});

/**
 * 3層構造のシステムプロンプトを構築
 */
export async function buildCachedSystemPrompt(
  projectId: string,
  userMessage: string,
  getSystemPrompts: () => Promise<SystemPromptSection[]>,
  searchProjectKnowledge: (projectId: string, query: string) => Promise<Knowledge[]>
): Promise<CachedContent[]> {
  // 第2層：IR専門知識ベース（Firestoreから取得）
  const irKnowledgeSections = await getSystemPrompts();
  const irKnowledge = irKnowledgeSections
    .map((section) => `【${section.title}】\n${section.content}`)
    .join('\n\n');

  // 第3層：プロジェクト固有ナレッジ（Vector Search）
  const relevantKnowledge = await searchProjectKnowledge(projectId, userMessage);
  const projectKnowledgeText = relevantKnowledge
    .map((k) => k.content)
    .join('\n\n');

  // システムプロンプトを3層構造で構築
  const content: CachedContent[] = [
    // 第1層：コア制約（常に固定、最高ヒット率）
    {
      type: 'text',
      text: CORE_CONSTRAINTS,
      cache_control: { type: 'ephemeral' }, // ← キャッシュ境界1
    },
    // 第2層：IR専門知識（四半期ごと更新）
    {
      type: 'text',
      text: `【IR専門知識ベース】\n\n${irKnowledge}`,
      cache_control: { type: 'ephemeral' }, // ← キャッシュ境界2
    },
    // 第3層：プロジェクト固有ナレッジ（日次更新）
    {
      type: 'text',
      text: `【プロジェクト固有ナレッジ】\n\n${projectKnowledgeText}`,
      cache_control: { type: 'ephemeral' }, // ← キャッシュ境界3
    },
  ];

  return content;
}

/**
 * Claude API呼び出し（プロンプトキャッシング対応）
 */
export async function callClaudeWithCaching(
  request: ClaudeAPIRequest,
  getSystemPrompts: () => Promise<SystemPromptSection[]>,
  searchProjectKnowledge: (projectId: string, query: string) => Promise<Knowledge[]>,
  recordCacheMetrics?: (projectId: string, usage: any, metadata: any) => Promise<void>
): Promise<ClaudeAPIResponse> {
  const { projectId, userMessage, conversationHistory = [] } = request;

  // セキュリティチェック1: プロンプトインジェクション検出
  if (detectInjectionPattern(userMessage)) {
    throw new Error(
      'SUSPICIOUS_INPUT_DETECTED: 不適切な入力が検出されました。システム指示の変更を試みる入力は禁止されています。'
    );
  }

  // トークン数事前チェック
  const estimatedTokens = estimateTokenCount(userMessage);
  if (estimatedTokens > TOKEN_LIMITS.AVAILABLE_FOR_DOCUMENT) {
    throw new Error(
      'TOKEN_LIMIT_EXCEEDED: メッセージが長すぎます。要約するか、複数のチャットに分割してください。'
    );
  }

  // システムプロンプトを構築
  const systemPrompt = await buildCachedSystemPrompt(
    projectId,
    userMessage,
    getSystemPrompts,
    searchProjectKnowledge
  );

  try {
    // Claude API呼び出し
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // レスポンステキストを取得
    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // セキュリティチェック2: 出力検証
    if (!validateOutput(responseText)) {
      console.warn('Output validation failed:', responseText.substring(0, 100));
      throw new Error(
        'OUTPUT_VALIDATION_FAILED: 生成された応答に禁止ワードが含まれています。'
      );
    }

    // 使用量メトリクスを計算
    const usage = {
      inputTokens: response.usage.input_tokens || 0,
      cacheCreationInputTokens: response.usage.cache_creation_input_tokens || 0,
      cacheReadInputTokens: response.usage.cache_read_input_tokens || 0,
      outputTokens: response.usage.output_tokens || 0,
    };

    const cacheHitRate = calculateCacheHitRate(usage);
    const costSavings = calculateCostSavings(usage);

    // メトリクスを記録（オプション）
    if (recordCacheMetrics) {
      await recordCacheMetrics(projectId, response.usage, {
        userMessage,
        cacheHitRate,
        costSavings,
      });
    }

    return {
      content: responseText,
      usage,
      cacheHitRate,
      costSavings,
    };
  } catch (error: any) {
    // エラーハンドリング
    if (error.status === 429) {
      throw new Error(
        'RATE_LIMIT_EXCEEDED: APIレート制限に達しました。しばらく待ってから再試行してください。'
      );
    }

    if (error.message?.includes('too many tokens')) {
      throw new Error(
        'TOKEN_LIMIT_API_ERROR: トークン数がAPIの制限を超えました。メッセージを短縮してください。'
      );
    }

    // その他のエラー
    console.error('Claude API Error:', error);
    throw new Error(`API_ERROR: ${error.message}`);
  }
}

/**
 * ストリーミング対応版（将来の拡張用）
 */
export async function callClaudeWithCachingStream(
  request: ClaudeAPIRequest,
  getSystemPrompts: () => Promise<SystemPromptSection[]>,
  searchProjectKnowledge: (projectId: string, query: string) => Promise<Knowledge[]>,
  onChunk: (chunk: string) => void
): Promise<ClaudeAPIResponse> {
  const { projectId, userMessage, conversationHistory = [] } = request;

  // セキュリティチェック
  if (detectInjectionPattern(userMessage)) {
    throw new Error('SUSPICIOUS_INPUT_DETECTED');
  }

  const systemPrompt = await buildCachedSystemPrompt(
    projectId,
    userMessage,
    getSystemPrompts,
    searchProjectKnowledge
  );

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ],
    stream: true,
  });

  let fullText = '';
  let usage: any = {};

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullText += chunk;
        onChunk(chunk);
      }
    }

    if (event.type === 'message_stop') {
      // @ts-ignore
      usage = event.message?.usage || {};
    }
  }

  // 出力検証
  if (!validateOutput(fullText)) {
    throw new Error('OUTPUT_VALIDATION_FAILED');
  }

  const cacheHitRate = calculateCacheHitRate(usage);
  const costSavings = calculateCostSavings(usage);

  return {
    content: fullText,
    usage: {
      inputTokens: usage.input_tokens || 0,
      cacheCreationInputTokens: usage.cache_creation_input_tokens || 0,
      cacheReadInputTokens: usage.cache_read_input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
    },
    cacheHitRate,
    costSavings,
  };
}

/**
 * スマートキャッシュウォーミング
 * アクティブセッション中のみキャッシュを維持（4分ごとにping）
 */
export class SmartCacheWarmer {
  private activeUsers: Map<
    string,
    {
      projectId: string;
      lastActivity: Date;
      warmingInterval?: NodeJS.Timeout;
    }
  > = new Map();

  /**
   * ユーザーがチャンネルを開いたとき
   */
  async onChannelOpened(
    userId: string,
    projectId: string,
    getSystemPrompts: () => Promise<SystemPromptSection[]>,
    searchProjectKnowledge: (projectId: string, query: string) => Promise<Knowledge[]>
  ): Promise<void> {
    this.activeUsers.set(userId, {
      projectId,
      lastActivity: new Date(),
    });

    // 初回ウォーミング
    await this.sendWarmingRequest(projectId, getSystemPrompts, searchProjectKnowledge);

    // 4分ごとのウォーミングを開始
    const interval = setInterval(async () => {
      const user = this.activeUsers.get(userId);
      if (!user) return;

      // 最終アクティビティから10分以上経過していたら停止
      const inactiveMinutes =
        (Date.now() - user.lastActivity.getTime()) / 1000 / 60;
      if (inactiveMinutes > 10) {
        this.onChannelClosed(userId);
        return;
      }

      await this.sendWarmingRequest(projectId, getSystemPrompts, searchProjectKnowledge);
    }, 4 * 60 * 1000); // 4分

    const user = this.activeUsers.get(userId)!;
    user.warmingInterval = interval;
  }

  /**
   * ユーザーがメッセージを送信したとき
   */
  onUserActivity(userId: string): void {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.lastActivity = new Date();
    }
  }

  /**
   * ユーザーがチャンネルを閉じたとき
   */
  onChannelClosed(userId: string): void {
    const user = this.activeUsers.get(userId);
    if (user?.warmingInterval) {
      clearInterval(user.warmingInterval);
    }
    this.activeUsers.delete(userId);
  }

  /**
   * 最小限のリクエストでキャッシュを維持
   */
  private async sendWarmingRequest(
    projectId: string,
    getSystemPrompts: () => Promise<SystemPromptSection[]>,
    searchProjectKnowledge: (projectId: string, query: string) => Promise<Knowledge[]>
  ): Promise<void> {
    try {
      const systemPrompt = await buildCachedSystemPrompt(
        projectId,
        'ping',
        getSystemPrompts,
        searchProjectKnowledge
      );

      await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1, // 出力を最小化
        system: systemPrompt,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }
}

// グローバルインスタンス
export const cacheWarmer = new SmartCacheWarmer();
