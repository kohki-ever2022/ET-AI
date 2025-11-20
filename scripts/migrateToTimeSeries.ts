/**
 * 時系列構造への移行スクリプト
 *
 * 既存のプロジェクトを新しい「企業→年度→期」の3層時系列構造に移行します。
 *
 * 実行方法:
 * npx tsx scripts/migrateToTimeSeries.ts [projectId]
 *
 * オプション:
 * - projectId: 特定のプロジェクトのみ移行する場合に指定
 * - --dry-run: 実際の書き込みを行わず、移行プランのみを表示
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Project, FiscalYear, Period } from '../types/firestore';

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
// ヘルパー関数
// ============================================================================

/**
 * 年度の開始月から年度IDを計算
 */
function getFiscalYearId(date: Date, startMonth: number): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed to 1-indexed

  if (month < startMonth) {
    return String(year - 1);
  }
  return String(year);
}

/**
 * 年度オブジェクトを作成
 */
function createFiscalYear(
  projectId: string,
  fiscalYearId: string,
  startMonth: number
): FiscalYear {
  const year = parseInt(fiscalYearId);
  const startDate = new Date(year, startMonth - 1, 1); // startMonth is 1-indexed
  const endDate = new Date(year + 1, startMonth - 1, 0); // Last day of the month before start month

  return {
    id: fiscalYearId,
    projectId,
    startDate: Timestamp.fromDate(startDate) as any,
    endDate: Timestamp.fromDate(endDate) as any,
    label: `${fiscalYearId}年度`,
    status: 'in-progress',
    createdAt: Timestamp.now() as any,
    updatedAt: Timestamp.now() as any,
  };
}

/**
 * 期オブジェクトを作成（四半期）
 */
function createQuarterlyPeriods(
  projectId: string,
  fiscalYearId: string,
  startMonth: number
): Period[] {
  const year = parseInt(fiscalYearId);
  const periods: Period[] = [];

  for (let i = 0; i < 4; i++) {
    const quarterStartMonth = (startMonth + i * 3 - 1) % 12;
    const quarterStartYear = year + Math.floor((startMonth + i * 3 - 1) / 12);
    const startDate = new Date(quarterStartYear, quarterStartMonth, 1);

    const quarterEndMonth = (startMonth + (i + 1) * 3 - 1) % 12;
    const quarterEndYear = year + Math.floor((startMonth + (i + 1) * 3 - 1) / 12);
    const endDate = new Date(quarterEndYear, quarterEndMonth, 0); // Last day of the quarter

    periods.push({
      id: `q${i + 1}`,
      fiscalYearId,
      projectId,
      periodType: 'quarterly',
      periodNumber: i + 1,
      startDate: Timestamp.fromDate(startDate) as any,
      endDate: Timestamp.fromDate(endDate) as any,
      label: `第${i + 1}四半期`,
      shareholderCommunicationChannelIds: [],
      status: 'not-started',
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    });
  }

  return periods;
}

/**
 * 期オブジェクトを作成（半期）
 */
function createHalfYearlyPeriods(
  projectId: string,
  fiscalYearId: string,
  startMonth: number
): Period[] {
  const year = parseInt(fiscalYearId);
  const periods: Period[] = [];

  for (let i = 0; i < 2; i++) {
    const halfStartMonth = (startMonth + i * 6 - 1) % 12;
    const halfStartYear = year + Math.floor((startMonth + i * 6 - 1) / 12);
    const startDate = new Date(halfStartYear, halfStartMonth, 1);

    const halfEndMonth = (startMonth + (i + 1) * 6 - 1) % 12;
    const halfEndYear = year + Math.floor((startMonth + (i + 1) * 6 - 1) / 12);
    const endDate = new Date(halfEndYear, halfEndMonth, 0);

    periods.push({
      id: `h${i + 1}`,
      fiscalYearId,
      projectId,
      periodType: 'half-yearly',
      periodNumber: i + 1,
      startDate: Timestamp.fromDate(startDate) as any,
      endDate: Timestamp.fromDate(endDate) as any,
      label: i === 0 ? '上半期' : '下半期',
      shareholderCommunicationChannelIds: [],
      status: 'not-started',
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    });
  }

  return periods;
}

/**
 * 期オブジェクトを作成（年次）
 */
function createAnnualPeriod(
  projectId: string,
  fiscalYearId: string,
  startMonth: number
): Period {
  const year = parseInt(fiscalYearId);
  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year + 1, startMonth - 1, 0);

  return {
    id: 'full-year',
    fiscalYearId,
    projectId,
    periodType: 'annual',
    periodNumber: 1,
    startDate: Timestamp.fromDate(startDate) as any,
    endDate: Timestamp.fromDate(endDate) as any,
    label: '通期',
    shareholderCommunicationChannelIds: [],
    status: 'not-started',
    createdAt: Timestamp.now() as any,
    updatedAt: Timestamp.now() as any,
  };
}

// ============================================================================
// 移行処理
// ============================================================================

/**
 * 単一プロジェクトを移行
 */
async function migrateProject(
  projectId: string,
  dryRun: boolean = false
): Promise<void> {
  console.log(`\n========================================`);
  console.log(`移行開始: ${projectId}`);
  console.log(`========================================`);

  const projectRef = db.collection('projects').doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    console.error(`❌ プロジェクト ${projectId} が見つかりません`);
    return;
  }

  const project = projectSnap.data() as Project;

  // 既に移行済みかチェック
  if (project.currentFiscalYearId) {
    console.log(`⚠️  プロジェクト ${projectId} は既に移行済みです`);
    return;
  }

  // デフォルト値を設定
  const fiscalYearStartMonth = project.fiscalYearStartMonth || 4; // デフォルトは4月
  const shareholderCommunicationFrequency = project.shareholderCommunicationFrequency || 'semi-annual';

  console.log(`\n📊 プロジェクト情報:`);
  console.log(`  - 企業名: ${project.companyName}`);
  console.log(`  - 年度開始月: ${fiscalYearStartMonth}月`);
  console.log(`  - 株主通信頻度: ${shareholderCommunicationFrequency}`);

  // 現在の年度を決定
  const now = new Date();
  const currentFiscalYearId = getFiscalYearId(now, fiscalYearStartMonth);

  console.log(`\n📅 作成する年度: ${currentFiscalYearId}年度`);

  // 年度を作成
  const fiscalYear = createFiscalYear(projectId, currentFiscalYearId, fiscalYearStartMonth);

  // 期を作成
  let periods: Period[];
  let currentPeriodId: string;

  switch (shareholderCommunicationFrequency) {
    case 'quarterly':
      periods = createQuarterlyPeriods(projectId, currentFiscalYearId, fiscalYearStartMonth);
      // 現在の期を決定
      const currentQuarter = Math.floor((now.getMonth() - fiscalYearStartMonth + 13) % 12 / 3) + 1;
      currentPeriodId = `q${currentQuarter}`;
      console.log(`\n📊 期の種類: 四半期 (Q1, Q2, Q3, Q4)`);
      break;

    case 'semi-annual':
      periods = createHalfYearlyPeriods(projectId, currentFiscalYearId, fiscalYearStartMonth);
      // 現在の期を決定
      const currentHalf = Math.floor((now.getMonth() - fiscalYearStartMonth + 13) % 12 / 6) + 1;
      currentPeriodId = `h${currentHalf}`;
      console.log(`\n📊 期の種類: 半期 (上半期, 下半期)`);
      break;

    case 'annual':
      periods = [createAnnualPeriod(projectId, currentFiscalYearId, fiscalYearStartMonth)];
      currentPeriodId = 'full-year';
      console.log(`\n📊 期の種類: 年次 (通期)`);
      break;

    default:
      throw new Error(`不明な株主通信頻度: ${shareholderCommunicationFrequency}`);
  }

  console.log(`\n📝 作成する期:`);
  periods.forEach(period => {
    const start = period.startDate.toDate().toISOString().split('T')[0];
    const end = period.endDate.toDate().toISOString().split('T')[0];
    console.log(`  - ${period.id}: ${period.label} (${start} 〜 ${end})`);
  });

  console.log(`\n✅ 現在の期: ${currentPeriodId}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN モード: 実際の書き込みはスキップします`);
    return;
  }

  // Firestoreに書き込み
  console.log(`\n💾 Firestoreへの書き込み開始...`);

  const batch = db.batch();

  // プロジェクトを更新
  batch.update(projectRef, {
    fiscalYearStartMonth,
    shareholderCommunicationFrequency,
    currentFiscalYearId,
    currentPeriodId,
    updatedAt: Timestamp.now(),
  });

  // 年度を作成
  const fiscalYearRef = projectRef.collection('fiscalYears').doc(currentFiscalYearId);
  batch.set(fiscalYearRef, fiscalYear);

  // 期を作成
  for (const period of periods) {
    const periodRef = fiscalYearRef.collection('periods').doc(period.id);
    batch.set(periodRef, period);
  }

  await batch.commit();

  console.log(`✅ 移行完了: ${projectId}`);
}

/**
 * すべてのプロジェクトを移行
 */
async function migrateAllProjects(dryRun: boolean = false): Promise<void> {
  console.log(`\n🚀 全プロジェクトの移行を開始します`);

  const projectsSnap = await db.collection('projects').where('status', '==', 'active').get();

  console.log(`\n📊 対象プロジェクト数: ${projectsSnap.size}`);

  for (const projectDoc of projectsSnap.docs) {
    try {
      await migrateProject(projectDoc.id, dryRun);
    } catch (error) {
      console.error(`❌ プロジェクト ${projectDoc.id} の移行に失敗:`, error);
    }
  }

  console.log(`\n✅ 全プロジェクトの移行が完了しました`);
}

// ============================================================================
// メイン処理
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const projectId = args.find(arg => !arg.startsWith('--'));

  console.log(`\n========================================`);
  console.log(`時系列構造への移行スクリプト`);
  console.log(`========================================`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN モード: 実際の書き込みは行いません\n`);
  }

  try {
    if (projectId) {
      await migrateProject(projectId, dryRun);
    } else {
      await migrateAllProjects(dryRun);
    }

    console.log(`\n✨ 移行処理が完了しました\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ エラーが発生しました:`, error);
    process.exit(1);
  }
}

// スクリプト実行
main();
