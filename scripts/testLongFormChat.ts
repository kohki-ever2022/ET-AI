/**
 * 長文チャット処理のパフォーマンステスト
 *
 * 10万文字の文章を使ってチャンク化処理、保存、読み取りのパフォーマンスを測定します。
 *
 * 実行方法:
 * npx tsx scripts/testLongFormChat.ts
 *
 * 環境変数:
 * - FIREBASE_PROJECT_ID: FirebaseプロジェクトID
 * - FIREBASE_CLIENT_EMAIL: サービスアカウントのメール
 * - FIREBASE_PRIVATE_KEY: サービスアカウントの秘密鍵
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';
import type { Chat, ChatChunk } from '../types/firestore';

// 定数
const MAX_CHUNK_SIZE = 5000;
const LONG_FORM_THRESHOLD = 5000;
const COLLECTIONS = {
  CHATS: 'chats',
  CHAT_CHUNKS: 'chunks',
} as const;

// Firebase Admin の初期化
const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

// ============================================================================
// テストデータ生成
// ============================================================================

/**
 * 指定した文字数のダミーテキストを生成
 */
function generateDummyText(charCount: number): string {
  const paragraphs: string[] = [];

  // 段落のテンプレート
  const templates = [
    '当社は、持続可能な社会の実現に向けて、環境保護と経済成長の両立を目指しています。',
    '中期経営計画において、デジタルトランスフォーメーションを推進し、業務効率の向上を図ります。',
    '株主の皆様への利益還元として、配当性向30%を目標に安定的な配当を継続します。',
    'ESG投資の重要性が高まる中、当社は環境・社会・ガバナンスの各分野で取り組みを強化しています。',
    '人的資本への投資として、従業員のスキルアップ支援とダイバーシティの推進を行っています。',
    'グローバル展開を加速し、アジア市場での事業拡大を目指します。',
    '研究開発投資を継続的に行い、次世代技術の開発に注力しています。',
    'コーポレートガバナンスの強化により、透明性の高い経営を実現します。',
  ];

  let currentLength = 0;

  while (currentLength < charCount) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    paragraphs.push(template);
    currentLength += template.length;
  }

  return paragraphs.join('\n\n').substring(0, charCount);
}

// ============================================================================
// ヘルパー関数（Firebase Admin用）
// ============================================================================

/**
 * 文字列を指定サイズのチャンクに分割
 */
function splitIntoChunks(content: string, maxChunkSize: number = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += maxChunkSize) {
    chunks.push(content.substring(i, i + maxChunkSize));
  }
  return chunks;
}

/**
 * コンテンツが長文かどうかを判定
 */
function isLongFormContent(content: string): boolean {
  return content.length > LONG_FORM_THRESHOLD;
}

/**
 * 長文チャットをFirestoreに保存
 */
async function saveLongFormChat(chatId: string, text: string): Promise<void> {
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const isLongForm = isLongFormContent(text);

  if (!isLongForm) {
    await chatRef.set({
      id: chatId,
      projectId: 'test-project',
      channelId: 'test-channel',
      userId: 'test-user',
      userMessage: 'テスト用メッセージ',
      aiResponse: text,
      timestamp: Timestamp.now(),
      approved: false,
      isLongForm: false,
      totalCharCount: text.length,
    });
    return;
  }

  const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
  const totalChunks = chunks.length;
  const chunksCollectionPath = `${COLLECTIONS.CHATS}/${chatId}/${COLLECTIONS.CHAT_CHUNKS}`;

  const batch = db.batch();

  batch.set(chatRef, {
    id: chatId,
    projectId: 'test-project',
    channelId: 'test-channel',
    userId: 'test-user',
    userMessage: 'テスト用メッセージ',
    aiResponse: '',
    timestamp: Timestamp.now(),
    approved: false,
    isLongForm: true,
    totalCharCount: text.length,
    totalChunks,
    chunksCollectionPath,
  });

  chunks.forEach((chunk, index) => {
    const chunkRef = chatRef.collection(COLLECTIONS.CHAT_CHUNKS).doc(String(index));
    batch.set(chunkRef, {
      chatId,
      chunkIndex: index,
      totalChunks,
      content: chunk,
      charCount: chunk.length,
      createdAt: Timestamp.now(),
    });
  });

  await batch.commit();
}

/**
 * 長文チャットをFirestoreから読み取り
 */
async function loadLongFormChat(chatId: string): Promise<{ fullContent: string; loadTime: number }> {
  const startTime = performance.now();
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    throw new Error(`チャット ${chatId} が見つかりません`);
  }

  const chat = chatDoc.data() as Chat;

  if (!chat.isLongForm) {
    const loadTime = performance.now() - startTime;
    return { fullContent: chat.aiResponse, loadTime };
  }

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

  return { fullContent, loadTime };
}

/**
 * 長文チャットをストリーミング形式で読み取り
 */
async function* streamLongFormChat(chatId: string): AsyncGenerator<string, void, unknown> {
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    throw new Error(`チャット ${chatId} が見つかりません`);
  }

  const chat = chatDoc.data() as Chat;

  if (!chat.isLongForm) {
    yield chat.aiResponse;
    return;
  }

  const chunksSnapshot = await chatRef
    .collection(COLLECTIONS.CHAT_CHUNKS)
    .orderBy('chunkIndex', 'asc')
    .get();

  for (const doc of chunksSnapshot.docs) {
    const chunkData = doc.data() as ChatChunk;
    yield chunkData.content;
  }
}

/**
 * チャンク統計情報を取得
 */
async function getChunkStatistics(chatId: string): Promise<{
  totalChunks: number;
  totalCharCount: number;
  averageChunkSize: number;
  chunkSizes: number[];
}> {
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

/**
 * 長文チャットを削除
 */
async function deleteLongFormChat(chatId: string): Promise<void> {
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    return;
  }

  const chat = chatDoc.data() as Chat;

  if (chat.isLongForm) {
    const chunksSnapshot = await chatRef.collection(COLLECTIONS.CHAT_CHUNKS).get();
    const batch = db.batch();

    chunksSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    batch.delete(chatRef);
    await batch.commit();
  } else {
    await chatRef.delete();
  }
}

// ============================================================================
// テスト関数
// ============================================================================

/**
 * チャンク化処理のテスト
 */
function testChunking(text: string): void {
  console.log('\n========================================');
  console.log('1. チャンク化処理のテスト');
  console.log('========================================');

  const startTime = performance.now();
  const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
  const endTime = performance.now();

  console.log(`\n✅ チャンク化完了`);
  console.log(`  - 元の文字数: ${text.length.toLocaleString()}`);
  console.log(`  - チャンク数: ${chunks.length}`);
  console.log(`  - 処理時間: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  - チャンクサイズ: 最大${MAX_CHUNK_SIZE}文字`);

  // チャンクサイズの統計
  const chunkSizes = chunks.map(c => c.length);
  const avgChunkSize = chunkSizes.reduce((sum, size) => sum + size, 0) / chunks.length;
  const minChunkSize = Math.min(...chunkSizes);
  const maxChunkSize = Math.max(...chunkSizes);

  console.log(`\n📊 チャンクサイズの統計:`);
  console.log(`  - 平均: ${avgChunkSize.toFixed(0)}文字`);
  console.log(`  - 最小: ${minChunkSize}文字`);
  console.log(`  - 最大: ${maxChunkSize}文字`);
}

/**
 * 保存処理のテスト
 */
async function testSave(chatId: string, text: string): Promise<void> {
  console.log('\n========================================');
  console.log('2. 保存処理のテスト');
  console.log('========================================');

  const startTime = performance.now();

  await saveLongFormChat(chatId, text);

  const endTime = performance.now();

  console.log(`\n✅ 保存完了`);
  console.log(`  - chatId: ${chatId}`);
  console.log(`  - 文字数: ${text.length.toLocaleString()}`);
  console.log(`  - 処理時間: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  - スループット: ${(text.length / (endTime - startTime) * 1000).toFixed(0)} 文字/秒`);
}

/**
 * 一括読み取り処理のテスト
 */
async function testLoad(chatId: string): Promise<void> {
  console.log('\n========================================');
  console.log('3. 一括読み取り処理のテスト');
  console.log('========================================');

  const startTime = performance.now();
  const { fullContent, loadTime } = await loadLongFormChat(chatId);
  const endTime = performance.now();

  // チャンク数を取得
  const stats = await getChunkStatistics(chatId);

  console.log(`\n✅ 読み取り完了`);
  console.log(`  - chatId: ${chatId}`);
  console.log(`  - 文字数: ${fullContent.length.toLocaleString()}`);
  console.log(`  - チャンク数: ${stats.totalChunks}`);
  console.log(`  - 処理時間（サービス内部）: ${loadTime.toFixed(2)}ms`);
  console.log(`  - 処理時間（全体）: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  - スループット: ${(fullContent.length / loadTime * 1000).toFixed(0)} 文字/秒`);

  // 最初の100文字を表示
  console.log(`\n📝 読み取った内容（最初の100文字）:`);
  console.log(`  ${fullContent.substring(0, 100)}...`);
}

/**
 * ストリーミング読み取り処理のテスト
 */
async function testStream(chatId: string): Promise<void> {
  console.log('\n========================================');
  console.log('4. ストリーミング読み取り処理のテスト');
  console.log('========================================');

  const startTime = performance.now();
  let totalChars = 0;
  let chunkCount = 0;

  const stream = streamLongFormChat(chatId);

  for await (const chunk of stream) {
    chunkCount++;
    totalChars += chunk.length;

    // 最初のチャンクのみ詳細を表示
    if (chunkCount === 1) {
      console.log(`\n📦 チャンク #${chunkCount}:`);
      console.log(`  - 文字数: ${chunk.length}`);
      console.log(`  - 内容（最初の50文字）: ${chunk.substring(0, 50)}...`);
    }
  }

  const endTime = performance.now();

  console.log(`\n✅ ストリーミング読み取り完了`);
  console.log(`  - chatId: ${chatId}`);
  console.log(`  - 総文字数: ${totalChars.toLocaleString()}`);
  console.log(`  - チャンク数: ${chunkCount}`);
  console.log(`  - 処理時間: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  - スループット: ${(totalChars / (endTime - startTime) * 1000).toFixed(0)} 文字/秒`);
}

/**
 * 統計情報取得のテスト
 */
async function testStatistics(chatId: string): Promise<void> {
  console.log('\n========================================');
  console.log('5. 統計情報取得のテスト');
  console.log('========================================');

  const stats = await getChunkStatistics(chatId);

  console.log(`\n📊 チャンク統計:`);
  console.log(`  - 総文字数: ${stats.totalCharCount.toLocaleString()}`);
  console.log(`  - チャンク数: ${stats.totalChunks}`);
  console.log(`  - 平均チャンクサイズ: ${stats.averageChunkSize.toFixed(0)}文字`);
  console.log(`  - チャンクサイズ分布:`);

  // ヒストグラム表示
  const bins = [0, 1000, 2000, 3000, 4000, 5000];
  const histogram = bins.map((bin, i) => {
    const nextBin = bins[i + 1] || Infinity;
    const count = stats.chunkSizes.filter(size => size >= bin && size < nextBin).length;
    return { range: `${bin}-${nextBin === Infinity ? '∞' : nextBin}`, count };
  });

  histogram.forEach(({ range, count }) => {
    const bar = '█'.repeat(Math.floor(count / stats.totalChunks * 50));
    console.log(`    ${range.padEnd(12)}: ${bar} (${count})`);
  });
}

/**
 * クリーンアップ（テストデータ削除）
 */
async function cleanup(chatId: string): Promise<void> {
  console.log('\n========================================');
  console.log('6. クリーンアップ');
  console.log('========================================');

  await deleteLongFormChat(chatId);

  console.log(`\n✅ テストデータ削除完了`);
  console.log(`  - chatId: ${chatId}`);
}

// ============================================================================
// メイン処理
// ============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  長文チャット処理パフォーマンステスト  ║');
  console.log('╚════════════════════════════════════════╝');

  const testChatId = `test-long-form-chat-${Date.now()}`;

  // テスト設定
  const testConfigs = [
    { chars: 10000, label: '1万文字' },
    { chars: 30000, label: '3万文字' },
    { chars: 100000, label: '10万文字' },
  ];

  for (const config of testConfigs) {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`テストケース: ${config.label}（${config.chars.toLocaleString()}文字）`);
    console.log('='.repeat(60));

    const chatId = `${testChatId}-${config.chars}`;
    const text = generateDummyText(config.chars);

    try {
      // 1. チャンク化テスト
      testChunking(text);

      // 2. 保存テスト
      await testSave(chatId, text);

      // 3. 一括読み取りテスト
      await testLoad(chatId);

      // 4. ストリーミング読み取りテスト
      await testStream(chatId);

      // 5. 統計情報取得テスト
      await testStatistics(chatId);

      // 6. クリーンアップ
      await cleanup(chatId);
    } catch (error) {
      console.error(`\n❌ エラーが発生しました:`, error);
    }
  }

  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  すべてのテストが完了しました！      ║');
  console.log('╚════════════════════════════════════════╝\n');

  process.exit(0);
}

// スクリプト実行
main();
