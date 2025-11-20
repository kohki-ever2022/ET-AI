/**
 * ローカルシミュレーションテスト
 *
 * Firebase接続なしで長文チャット処理のチャンク化ロジックをテストします。
 *
 * 実行方法:
 * npx tsx scripts/testLongFormChatLocal.ts
 */

// 定数
const MAX_CHUNK_SIZE = 5000;
const LONG_FORM_THRESHOLD = 5000;

// ============================================================================
// チャンク化ユーティリティ
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

// ============================================================================
// テストデータ生成
// ============================================================================

/**
 * 指定した文字数のダミーテキストを生成
 */
function generateDummyText(charCount: number): string {
  const paragraphs: string[] = [];

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
// テスト関数
// ============================================================================

/**
 * チャンク化処理のテスト
 */
function testChunking(text: string): void {
  console.log('\n========================================');
  console.log('チャンク化処理のテスト');
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

  // 各チャンクの詳細
  console.log(`\n📦 チャンク詳細:`);
  chunks.forEach((chunk, index) => {
    const preview = chunk.substring(0, 50).replace(/\n/g, ' ');
    console.log(`  - チャンク #${index}: ${chunk.length}文字 "${preview}..."`);
  });
}

/**
 * 再結合テスト
 */
function testReassembly(text: string): void {
  console.log('\n========================================');
  console.log('再結合テスト');
  console.log('========================================');

  const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);

  console.log(`\n🔗 チャンクを再結合中...`);
  const startTime = performance.now();
  const reassembled = chunks.join('');
  const endTime = performance.now();

  const isIdentical = reassembled === text;

  console.log(`\n✅ 再結合完了`);
  console.log(`  - 元の文字数: ${text.length.toLocaleString()}`);
  console.log(`  - 再結合後の文字数: ${reassembled.length.toLocaleString()}`);
  console.log(`  - 処理時間: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  - 一致: ${isIdentical ? '✅ はい' : '❌ いいえ'}`);

  if (!isIdentical) {
    console.error(`\n❌ エラー: 再結合後のテキストが元のテキストと一致しません！`);
    console.error(`  - 差分: ${Math.abs(text.length - reassembled.length)}文字`);
  }
}

/**
 * パフォーマンステスト
 */
function testPerformance(charCounts: number[]): void {
  console.log('\n========================================');
  console.log('パフォーマンステスト');
  console.log('========================================');

  console.log(`\n📈 様々な文字数でのパフォーマンス測定:`);

  const results: Array<{
    chars: number;
    chunks: number;
    chunkingTime: number;
    reassemblyTime: number;
    throughput: number;
  }> = [];

  for (const charCount of charCounts) {
    const text = generateDummyText(charCount);

    // チャンク化
    const chunkStart = performance.now();
    const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);
    const chunkEnd = performance.now();
    const chunkingTime = chunkEnd - chunkStart;

    // 再結合
    const reassemblyStart = performance.now();
    const reassembled = chunks.join('');
    const reassemblyEnd = performance.now();
    const reassemblyTime = reassemblyEnd - reassemblyStart;

    const throughput = Math.floor((charCount / chunkingTime) * 1000);

    results.push({
      chars: charCount,
      chunks: chunks.length,
      chunkingTime,
      reassemblyTime,
      throughput,
    });

    console.log(`\n  ${charCount.toLocaleString()}文字:`);
    console.log(`    - チャンク数: ${chunks.length}`);
    console.log(`    - チャンク化: ${chunkingTime.toFixed(2)}ms`);
    console.log(`    - 再結合: ${reassemblyTime.toFixed(2)}ms`);
    console.log(`    - スループット: ${throughput.toLocaleString()} 文字/秒`);
  }

  // サマリー
  console.log(`\n📊 サマリー:`);
  const avgThroughput =
    results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
  console.log(`  - 平均スループット: ${avgThroughput.toFixed(0)} 文字/秒`);
}

/**
 * 統合報告書シミュレーション
 */
function testIntegratedReport(): void {
  console.log('\n========================================');
  console.log('統合報告書シミュレーション');
  console.log('========================================');

  // 典型的な統合報告書: 2万〜3万文字
  const reportSizes = [
    { label: '小規模', chars: 20000 },
    { label: '中規模', chars: 30000 },
    { label: '大規模', chars: 50000 },
  ];

  for (const { label, chars } of reportSizes) {
    console.log(`\n📄 ${label}統合報告書（${chars.toLocaleString()}文字）:`);

    const text = generateDummyText(chars);
    const chunks = splitIntoChunks(text, MAX_CHUNK_SIZE);

    console.log(`  - チャンク数: ${chunks.length}`);
    console.log(`  - チャンクあたり平均: ${Math.floor(chars / chunks.length)}文字`);
    console.log(`  - Firestoreドキュメント数: 1（メイン） + ${chunks.length}（チャンク） = ${chunks.length + 1}`);

    // 推定コスト（Firestoreの読み取り料金）
    const readCost = (chunks.length + 1) * 0.00036; // $0.36 per 100K reads
    console.log(`  - 推定読み取りコスト: $${readCost.toFixed(6)} / 回`);
  }
}

// ============================================================================
// メイン処理
// ============================================================================

function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  長文チャット処理ローカルテスト      ║');
  console.log('╚════════════════════════════════════════╝');

  // 1. 基本的なチャンク化テスト
  console.log('\n\n' + '='.repeat(60));
  console.log('テストケース 1: 基本的なチャンク化（10,000文字）');
  console.log('='.repeat(60));
  const text1 = generateDummyText(10000);
  testChunking(text1);

  // 2. 再結合テスト
  testReassembly(text1);

  // 3. パフォーマンステスト
  console.log('\n\n' + '='.repeat(60));
  console.log('テストケース 2: パフォーマンステスト');
  console.log('='.repeat(60));
  testPerformance([5000, 10000, 20000, 30000, 50000, 100000]);

  // 4. 統合報告書シミュレーション
  console.log('\n\n' + '='.repeat(60));
  console.log('テストケース 3: 統合報告書シミュレーション');
  console.log('='.repeat(60));
  testIntegratedReport();

  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  すべてのテストが完了しました！      ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// スクリプト実行
main();
