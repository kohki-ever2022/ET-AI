/**
 * Weekly Pattern Extraction and Knowledge Maintenance
 *
 * Scheduled Cloud Function that runs every Sunday at 2 AM JST.
 * Performs:
 * 1. Analyzes approved chats from the past week
 * 2. Extracts 5 types of learning patterns
 * 3. Detects and merges duplicate knowledge
 * 4. Archives unused knowledge (90+ days)
 * 5. Updates project statistics
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { db, COLLECTIONS } from './config/firebase';
import {
  Chat,
  Knowledge,
  LearningPattern,
  PatternType,
  KnowledgeGroup,
  BatchJob,
  ArchiveLog,
} from './types';
import { generateEmbedding } from './services/embeddingService';
import { searchSimilarKnowledge } from './services/vectorSearchService';

const BATCH_SIZE = 50;
const SIMILARITY_THRESHOLD = 0.95;
const ARCHIVE_DAYS = 90;
const FUNCTION_TIMEOUT = 540; // 9 minutes

// ============================================================================
// Main Scheduled Function
// ============================================================================

/**
 * Scheduled function that runs every Sunday at 2 AM JST
 */
export const weeklyPatternExtraction = functions
  .runWith({
    memory: '2GB',
    timeoutSeconds: FUNCTION_TIMEOUT,
  })
  .pubsub.schedule('0 2 * * 0')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const jobId = uuidv4();
    console.log(`[Job ${jobId}] Starting weekly pattern extraction...`);

    // Initialize job tracking
    const jobRef = db.collection('batchJobs').doc(jobId);
    const startTime = Date.now();

    try {
      // Step 1: Initialize job
      await initializeJob(jobRef, jobId);

      // Step 2: Get target period (last 7 days)
      const targetPeriod = getTargetPeriod();
      console.log(`[Job ${jobId}] Target period:`, targetPeriod);

      await updateJobProgress(jobRef, {
        currentStep: 'Fetching approved chats',
        percentage: 10,
      });

      // Step 3: Fetch all approved chats in the period
      const approvedChats = await fetchApprovedChats(targetPeriod);
      console.log(`[Job ${jobId}] Found ${approvedChats.length} approved chats`);

      if (approvedChats.length === 0) {
        console.log(`[Job ${jobId}] No approved chats found. Completing job.`);
        await completeJob(jobRef, {
          projectsProcessed: 0,
          chatsAnalyzed: 0,
          patternsExtracted: {
            vocabulary: 0,
            structure: 0,
            emphasis: 0,
            tone: 0,
            length: 0,
          },
          duplicatesFound: 0,
          duplicatesMerged: 0,
          knowledgeArchived: 0,
        });
        return;
      }

      await updateJobProgress(jobRef, {
        currentStep: 'Extracting patterns',
        current: 0,
        total: approvedChats.length,
        percentage: 20,
      });

      // Step 4: Extract patterns from chats (grouped by project)
      const projectChats = groupChatsByProject(approvedChats);
      const patternResults = await extractPatternsFromProjects(
        projectChats,
        jobId,
        jobRef
      );

      await updateJobProgress(jobRef, {
        currentStep: 'Detecting duplicates',
        percentage: 60,
      });

      // Step 5: Detect and merge duplicate knowledge
      const deduplicationResults = await detectAndMergeDuplicates(jobId, jobRef);

      await updateJobProgress(jobRef, {
        currentStep: 'Archiving unused knowledge',
        percentage: 80,
      });

      // Step 6: Archive unused knowledge
      const archiveResults = await archiveUnusedKnowledge(jobId, jobRef);

      await updateJobProgress(jobRef, {
        currentStep: 'Updating statistics',
        percentage: 95,
      });

      // Step 7: Update project statistics
      await updateProjectStatistics(projectChats, patternResults);

      // Step 8: Complete job with results
      const result = {
        projectsProcessed: Object.keys(projectChats).length,
        chatsAnalyzed: approvedChats.length,
        patternsExtracted: patternResults,
        duplicatesFound: deduplicationResults.found,
        duplicatesMerged: deduplicationResults.merged,
        knowledgeArchived: archiveResults.archived,
      };

      await completeJob(jobRef, result);

      const duration = Date.now() - startTime;
      console.log(`[Job ${jobId}] Completed successfully in ${duration}ms`);
      console.log(`[Job ${jobId}] Results:`, result);

      // Send success notification
      await sendNotification({
        type: 'success',
        jobId,
        result,
        duration,
      });

      return result;
    } catch (error) {
      console.error(`[Job ${jobId}] Error:`, error);

      // Log error
      await logJobError(jobRef, 'main', error);

      // Mark job as failed
      await failJob(jobRef, error);

      // Send error notification
      await sendNotification({
        type: 'error',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  });

// ============================================================================
// Job Management Functions
// ============================================================================

/**
 * Initialize batch job in Firestore
 */
async function initializeJob(jobRef: FirebaseFirestore.DocumentReference, jobId: string): Promise<void> {
  const targetPeriod = getTargetPeriod();

  const job: Partial<BatchJob> = {
    id: jobId,
    type: 'weekly-pattern-extraction',
    status: 'processing',
    progress: {
      current: 0,
      total: 0,
      percentage: 0,
      currentStep: 'Initializing',
    },
    targetPeriod: {
      startDate: admin.firestore.Timestamp.fromDate(targetPeriod.startDate),
      endDate: admin.firestore.Timestamp.fromDate(targetPeriod.endDate),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    startedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    errors: [],
  };

  await jobRef.set(job);
  console.log(`[Job ${jobId}] Initialized`);
}

/**
 * Update job progress
 */
async function updateJobProgress(
  jobRef: FirebaseFirestore.DocumentReference,
  update: {
    currentStep?: string;
    current?: number;
    total?: number;
    percentage?: number;
  }
): Promise<void> {
  const currentData = (await jobRef.get()).data();
  const progress = currentData?.progress || {};

  await jobRef.update({
    'progress.currentStep': update.currentStep || progress.currentStep,
    'progress.current': update.current !== undefined ? update.current : progress.current,
    'progress.total': update.total !== undefined ? update.total : progress.total,
    'progress.percentage': update.percentage || progress.percentage,
  });
}

/**
 * Complete job successfully
 */
async function completeJob(
  jobRef: FirebaseFirestore.DocumentReference,
  result: BatchJob['result']
): Promise<void> {
  await jobRef.update({
    status: 'completed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    'progress.percentage': 100,
    'progress.currentStep': 'Completed',
    result,
  });
}

/**
 * Mark job as failed
 */
async function failJob(
  jobRef: FirebaseFirestore.DocumentReference,
  error: unknown
): Promise<void> {
  await jobRef.update({
    status: 'failed',
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Log error for job
 */
async function logJobError(
  jobRef: FirebaseFirestore.DocumentReference,
  step: string,
  error: unknown
): Promise<void> {
  const errorEntry = {
    step,
    error: error instanceof Error ? error.message : String(error),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await jobRef.update({
    errors: admin.firestore.FieldValue.arrayUnion(errorEntry),
  });
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Get target period for analysis (last 7 days)
 */
function getTargetPeriod(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * Fetch all approved chats within the target period
 */
async function fetchApprovedChats(period: {
  startDate: Date;
  endDate: Date;
}): Promise<Chat[]> {
  const snapshot = await db
    .collection(COLLECTIONS.CHATS)
    .where('approved', '==', true)
    .where(
      'approvedAt',
      '>=',
      admin.firestore.Timestamp.fromDate(period.startDate)
    )
    .where(
      'approvedAt',
      '<=',
      admin.firestore.Timestamp.fromDate(period.endDate)
    )
    .orderBy('approvedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Chat));
}

/**
 * Group chats by project ID
 */
function groupChatsByProject(chats: Chat[]): Record<string, Chat[]> {
  return chats.reduce((acc, chat) => {
    if (!acc[chat.projectId]) {
      acc[chat.projectId] = [];
    }
    acc[chat.projectId].push(chat);
    return acc;
  }, {} as Record<string, Chat[]>);
}

// ============================================================================
// Pattern Extraction Functions
// ============================================================================

/**
 * Extract patterns from all projects
 */
async function extractPatternsFromProjects(
  projectChats: Record<string, Chat[]>,
  jobId: string,
  jobRef: FirebaseFirestore.DocumentReference
): Promise<{
  vocabulary: number;
  structure: number;
  emphasis: number;
  tone: number;
  length: number;
}> {
  const results = {
    vocabulary: 0,
    structure: 0,
    emphasis: 0,
    tone: 0,
    length: 0,
  };

  for (const [projectId, chats] of Object.entries(projectChats)) {
    console.log(`Extracting patterns for project ${projectId} (${chats.length} chats)`);

    try {
      // Extract each pattern type
      const vocabulary = await extractVocabularyPattern(projectId, chats, jobId);
      if (vocabulary) results.vocabulary++;

      const structure = await extractStructurePattern(projectId, chats, jobId);
      if (structure) results.structure++;

      const emphasis = await extractEmphasisPattern(projectId, chats, jobId);
      if (emphasis) results.emphasis++;

      const tone = await extractTonePattern(projectId, chats, jobId);
      if (tone) results.tone++;

      const length = await extractLengthPattern(projectId, chats, jobId);
      if (length) results.length++;
    } catch (error) {
      console.error(`Error extracting patterns for project ${projectId}:`, error);
      await logJobError(jobRef, `pattern-extraction-${projectId}`, error);
    }
  }

  return results;
}

/**
 * Extract vocabulary pattern (TF-IDF analysis)
 */
async function extractVocabularyPattern(
  projectId: string,
  chats: Chat[],
  jobId: string
): Promise<boolean> {
  if (chats.length < 3) return false; // Need minimum chats for meaningful analysis

  // Simple tokenization and frequency analysis
  const wordFrequencies: Record<string, number> = {};
  const documentCount: Record<string, number> = {};

  chats.forEach((chat) => {
    const words = tokenize(chat.aiResponse);
    const uniqueWords = new Set(words);

    words.forEach((word) => {
      wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
    });

    uniqueWords.forEach((word) => {
      documentCount[word] = (documentCount[word] || 0) + 1;
    });
  });

  // Calculate TF-IDF scores
  const totalDocs = chats.length;
  const tfIdfScores: Record<string, number> = {};

  Object.keys(wordFrequencies).forEach((word) => {
    const tf = wordFrequencies[word] / Object.values(wordFrequencies).reduce((a, b) => a + b, 0);
    const idf = Math.log(totalDocs / (documentCount[word] || 1));
    tfIdfScores[word] = tf * idf;
  });

  // Get top 10 words
  const topWords = Object.entries(tfIdfScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);

  if (topWords.length === 0) return false;

  // Save pattern
  const pattern: Partial<LearningPattern> = {
    projectId,
    patternType: 'vocabulary',
    patternContent: `重要語彙: ${topWords.join(', ')}`,
    details: {
      tfIdfScores,
      wordFrequencies,
    },
    examples: chats.slice(0, 3).map((c) => c.aiResponse),
    extractedFrom: chats.map((c) => c.id),
    reliability: calculateReliability(chats.length, topWords.length),
    occurrenceCount: chats.length,
    confidence: calculateConfidence(topWords.length, chats.length),
    validatedBy: 'system',
    validatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    autoExtracted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    extractedByJobId: jobId,
  };

  await db.collection('learningPatterns').add(pattern);
  console.log(`Vocabulary pattern extracted for project ${projectId}`);
  return true;
}

/**
 * Extract structure pattern
 */
async function extractStructurePattern(
  projectId: string,
  chats: Chat[],
  jobId: string
): Promise<boolean> {
  if (chats.length < 3) return false;

  let hasParagraphs = 0;
  let hasLists = 0;
  let hasCodeBlocks = 0;
  let hasHeadings = 0;
  let totalParagraphs = 0;

  chats.forEach((chat) => {
    const response = chat.aiResponse;

    // Count paragraphs
    const paragraphs = response.split('\n\n').filter((p) => p.trim().length > 0);
    totalParagraphs += paragraphs.length;
    if (paragraphs.length > 1) hasParagraphs++;

    // Detect lists
    if (response.match(/^[-*]\s/m) || response.match(/^\d+\.\s/m)) hasLists++;

    // Detect code blocks
    if (response.includes('```')) hasCodeBlocks++;

    // Detect headings
    if (response.match(/^#{1,6}\s/m)) hasHeadings++;
  });

  const avgParagraphs = totalParagraphs / chats.length;
  const structurePatterns = [];

  if (hasParagraphs / chats.length > 0.5) {
    structurePatterns.push('複数段落構成');
  }
  if (hasLists / chats.length > 0.3) {
    structurePatterns.push('リスト形式');
  }
  if (hasCodeBlocks / chats.length > 0.2) {
    structurePatterns.push('コードブロック');
  }
  if (hasHeadings / chats.length > 0.2) {
    structurePatterns.push('見出し使用');
  }

  if (structurePatterns.length === 0) return false;

  const pattern: Partial<LearningPattern> = {
    projectId,
    patternType: 'structure',
    patternContent: `構造パターン: ${structurePatterns.join(', ')}`,
    details: {
      paragraphCount: Math.round(avgParagraphs),
      hasLists: hasLists > 0,
      hasCodeBlocks: hasCodeBlocks > 0,
      hasHeadings: hasHeadings > 0,
    },
    examples: chats.slice(0, 3).map((c) => c.aiResponse),
    extractedFrom: chats.map((c) => c.id),
    reliability: calculateReliability(chats.length, structurePatterns.length),
    occurrenceCount: chats.length,
    confidence: calculateConfidence(structurePatterns.length, chats.length),
    validatedBy: 'system',
    validatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    autoExtracted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    extractedByJobId: jobId,
  };

  await db.collection('learningPatterns').add(pattern);
  console.log(`Structure pattern extracted for project ${projectId}`);
  return true;
}

/**
 * Extract emphasis pattern
 */
async function extractEmphasisPattern(
  projectId: string,
  chats: Chat[],
  jobId: string
): Promise<boolean> {
  if (chats.length < 3) return false;

  let boldCount = 0;
  let italicCount = 0;
  let quoteCount = 0;

  chats.forEach((chat) => {
    const response = chat.aiResponse;

    // Count bold
    const bolds = response.match(/\*\*[^*]+\*\*/g);
    if (bolds) boldCount += bolds.length;

    // Count italic
    const italics = response.match(/\*[^*]+\*/g);
    if (italics) italicCount += italics.length;

    // Count quotes
    const quotes = response.match(/^>\s/gm);
    if (quotes) quoteCount += quotes.length;
  });

  const emphasisPatterns = [];
  if (boldCount > 0) emphasisPatterns.push('太字強調');
  if (italicCount > 0) emphasisPatterns.push('イタリック');
  if (quoteCount > 0) emphasisPatterns.push('引用');

  if (emphasisPatterns.length === 0) return false;

  const pattern: Partial<LearningPattern> = {
    projectId,
    patternType: 'emphasis',
    patternContent: `強調パターン: ${emphasisPatterns.join(', ')}`,
    details: {
      boldCount: Math.round(boldCount / chats.length),
      italicCount: Math.round(italicCount / chats.length),
      quoteCount: Math.round(quoteCount / chats.length),
    },
    examples: chats.slice(0, 3).map((c) => c.aiResponse),
    extractedFrom: chats.map((c) => c.id),
    reliability: calculateReliability(chats.length, emphasisPatterns.length),
    occurrenceCount: chats.length,
    confidence: calculateConfidence(emphasisPatterns.length, chats.length),
    validatedBy: 'system',
    validatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    autoExtracted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    extractedByJobId: jobId,
  };

  await db.collection('learningPatterns').add(pattern);
  console.log(`Emphasis pattern extracted for project ${projectId}`);
  return true;
}

/**
 * Extract tone pattern
 */
async function extractTonePattern(
  projectId: string,
  chats: Chat[],
  jobId: string
): Promise<boolean> {
  if (chats.length < 3) return false;

  let politeCount = 0;
  let casualCount = 0;
  const politePatterns: string[] = [];

  chats.forEach((chat) => {
    const response = chat.aiResponse;

    // Detect polite expressions
    const politeMarkers = [
      'です', 'ます', 'ございます', 'いただ', 'おり', 'されて'
    ];

    const casualMarkers = [
      'だよ', 'だね', 'じゃん', 'って'
    ];

    politeMarkers.forEach((marker) => {
      if (response.includes(marker)) {
        politeCount++;
        if (!politePatterns.includes(marker)) {
          politePatterns.push(marker);
        }
      }
    });

    casualMarkers.forEach((marker) => {
      if (response.includes(marker)) casualCount++;
    });
  });

  const formalityScore = Math.round(
    (politeCount / (politeCount + casualCount + 1)) * 100
  );

  const toneDescription =
    formalityScore > 70
      ? '丁寧な敬語'
      : formalityScore > 40
      ? 'ビジネス的'
      : 'カジュアル';

  const pattern: Partial<LearningPattern> = {
    projectId,
    patternType: 'tone',
    patternContent: `トーンパターン: ${toneDescription} (フォーマル度: ${formalityScore}%)`,
    details: {
      formalityScore,
      politenesPatterns: politePatterns,
    },
    examples: chats.slice(0, 3).map((c) => c.aiResponse),
    extractedFrom: chats.map((c) => c.id),
    reliability: calculateReliability(chats.length, politePatterns.length),
    occurrenceCount: chats.length,
    confidence: formalityScore,
    validatedBy: 'system',
    validatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    autoExtracted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    extractedByJobId: jobId,
  };

  await db.collection('learningPatterns').add(pattern);
  console.log(`Tone pattern extracted for project ${projectId}`);
  return true;
}

/**
 * Extract length pattern
 */
async function extractLengthPattern(
  projectId: string,
  chats: Chat[],
  jobId: string
): Promise<boolean> {
  if (chats.length < 3) return false;

  const lengths = chats.map((chat) => chat.aiResponse.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) /
    lengths.length;
  const stdDeviation = Math.sqrt(variance);

  // Group by category
  const categoryLengths: Record<string, number[]> = {};
  chats.forEach((chat) => {
    const category = chat.metadata?.category || 'general';
    if (!categoryLengths[category]) {
      categoryLengths[category] = [];
    }
    categoryLengths[category].push(chat.aiResponse.length);
  });

  const avgByCategory: Record<string, number> = {};
  Object.entries(categoryLengths).forEach(([category, lens]) => {
    avgByCategory[category] = Math.round(
      lens.reduce((a, b) => a + b, 0) / lens.length
    );
  });

  const pattern: Partial<LearningPattern> = {
    projectId,
    patternType: 'length',
    patternContent: `長さパターン: 平均 ${Math.round(avgLength)} 文字 (標準偏差: ${Math.round(stdDeviation)})`,
    details: {
      averageLength: Math.round(avgLength),
      stdDeviation: Math.round(stdDeviation),
      categoryLengths: avgByCategory,
    },
    examples: chats.slice(0, 3).map((c) => c.aiResponse),
    extractedFrom: chats.map((c) => c.id),
    reliability: calculateReliability(chats.length, Object.keys(avgByCategory).length),
    occurrenceCount: chats.length,
    confidence: Math.min(100, Math.round((chats.length / 10) * 100)),
    validatedBy: 'system',
    validatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    autoExtracted: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    extractedByJobId: jobId,
  };

  await db.collection('learningPatterns').add(pattern);
  console.log(`Length pattern extracted for project ${projectId}`);
  return true;
}

// ============================================================================
// Deduplication Functions
// ============================================================================

/**
 * Detect and merge duplicate knowledge
 */
async function detectAndMergeDuplicates(
  jobId: string,
  jobRef: FirebaseFirestore.DocumentReference
): Promise<{ found: number; merged: number }> {
  console.log('Starting duplicate detection...');

  let foundCount = 0;
  let mergedCount = 0;

  try {
    // Get all non-archived knowledge
    const snapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('archived', '==', false)
      .get();

    const allKnowledge = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Knowledge)
    );

    console.log(`Analyzing ${allKnowledge.length} knowledge items for duplicates`);

    // Group by project for efficiency
    const byProject = allKnowledge.reduce((acc, k) => {
      if (!acc[k.projectId]) acc[k.projectId] = [];
      acc[k.projectId].push(k);
      return acc;
    }, {} as Record<string, Knowledge[]>);

    for (const [projectId, knowledge] of Object.entries(byProject)) {
      // Step 1: Exact match detection
      const exactGroups = await detectExactMatches(knowledge);
      foundCount += exactGroups.length;

      // Step 2: Semantic match detection (high similarity)
      const semanticGroups = await detectSemanticMatches(knowledge, projectId);
      foundCount += semanticGroups.length;

      // Step 3: Merge groups
      const allGroups = [...exactGroups, ...semanticGroups];
      for (const group of allGroups) {
        await mergeKnowledgeGroup(group, jobId);
        mergedCount++;
      }
    }

    console.log(`Duplicate detection complete: ${foundCount} found, ${mergedCount} merged`);
  } catch (error) {
    console.error('Error in duplicate detection:', error);
    await logJobError(jobRef, 'deduplication', error);
  }

  return { found: foundCount, merged: mergedCount };
}

/**
 * Detect exact matches in knowledge
 */
async function detectExactMatches(
  knowledge: Knowledge[]
): Promise<Array<{ representative: Knowledge; duplicates: Knowledge[] }>> {
  const contentMap = new Map<string, Knowledge[]>();

  knowledge.forEach((k) => {
    const existing = contentMap.get(k.content) || [];
    existing.push(k);
    contentMap.set(k.content, existing);
  });

  const groups: Array<{ representative: Knowledge; duplicates: Knowledge[] }> = [];

  contentMap.forEach((items) => {
    if (items.length > 1) {
      // Select representative (highest reliability, most usage)
      const sorted = items.sort((a, b) => {
        if ((b.reliability || 0) !== (a.reliability || 0)) {
          return (b.reliability || 0) - (a.reliability || 0);
        }
        return (b.usageCount || 0) - (a.usageCount || 0);
      });

      groups.push({
        representative: sorted[0],
        duplicates: sorted.slice(1),
      });
    }
  });

  return groups;
}

/**
 * Detect semantic matches using embeddings
 */
async function detectSemanticMatches(
  knowledge: Knowledge[],
  projectId: string
): Promise<Array<{ representative: Knowledge; duplicates: Knowledge[] }>> {
  const groups: Array<{ representative: Knowledge; duplicates: Knowledge[] }> = [];

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < knowledge.length; i += BATCH_SIZE) {
    const batch = knowledge.slice(i, i + BATCH_SIZE);

    for (const item of batch) {
      // Skip if already marked as duplicate
      if (item.duplicateGroupId) continue;

      try {
        // Search for similar knowledge
        const similar = await searchSimilarKnowledge({
          projectId,
          queryText: item.content,
          limit: 5,
          threshold: SIMILARITY_THRESHOLD,
        });

        const duplicates = similar
          .filter((s) => s.knowledge.id !== item.id && !s.knowledge.duplicateGroupId)
          .map((s) => s.knowledge);

        if (duplicates.length > 0) {
          groups.push({
            representative: item,
            duplicates,
          });
        }
      } catch (error) {
        console.error(`Error checking similarity for knowledge ${item.id}:`, error);
      }
    }
  }

  return groups;
}

/**
 * Merge a knowledge group
 */
async function mergeKnowledgeGroup(
  group: { representative: Knowledge; duplicates: Knowledge[] },
  jobId: string
): Promise<void> {
  const { representative, duplicates } = group;

  // Create knowledge group
  const groupData: Partial<KnowledgeGroup> = {
    projectId: representative.projectId,
    representativeKnowledgeId: representative.id,
    duplicateKnowledgeIds: duplicates.map((d) => d.id),
    similarityScores: {},
    averageSimilarity: 0.95,
    detectionMethod: 'exact',
    mergedCount: duplicates.length,
    totalUsageCount:
      (representative.usageCount || 0) +
      duplicates.reduce((sum, d) => sum + (d.usageCount || 0), 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    detectedByJobId: jobId,
  };

  const groupRef = await db.collection('knowledgeGroups').add(groupData);

  // Update representative
  await db.collection(COLLECTIONS.KNOWLEDGE).doc(representative.id).update({
    isRepresentative: true,
    duplicateGroupId: groupRef.id,
  });

  // Update duplicates
  const batch = db.batch();
  duplicates.forEach((dup) => {
    const dupRef = db.collection(COLLECTIONS.KNOWLEDGE).doc(dup.id);
    batch.update(dupRef, {
      isRepresentative: false,
      duplicateGroupId: groupRef.id,
    });
  });
  await batch.commit();

  console.log(
    `Merged knowledge group: ${representative.id} with ${duplicates.length} duplicates`
  );
}

// ============================================================================
// Archive Functions
// ============================================================================

/**
 * Archive unused knowledge (90+ days)
 */
async function archiveUnusedKnowledge(
  jobId: string,
  jobRef: FirebaseFirestore.DocumentReference
): Promise<{ archived: number }> {
  console.log('Starting knowledge archival...');

  let archivedCount = 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_DAYS);

    // Query 1: Never used knowledge
    const neverUsedSnapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('archived', '==', false)
      .where('lastUsed', '==', null)
      .limit(100)
      .get();

    // Query 2: Old unused knowledge
    const oldUnusedSnapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('archived', '==', false)
      .where('lastUsed', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(100)
      .get();

    const toArchive = [
      ...neverUsedSnapshot.docs,
      ...oldUnusedSnapshot.docs,
    ].filter((doc, index, self) =>
      index === self.findIndex((d) => d.id === doc.id)
    );

    console.log(`Found ${toArchive.length} knowledge items to archive`);

    // Archive in batches
    for (let i = 0; i < toArchive.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = toArchive.slice(i, i + BATCH_SIZE);

      batchDocs.forEach((doc) => {
        const data = doc.data() as Knowledge;

        // Archive the knowledge
        batch.update(doc.ref, {
          archived: true,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          archivedReason: 'unused_90_days',
          archivedByJobId: jobId,
        });

        // Create archive log
        const logData: Partial<ArchiveLog> = {
          knowledgeId: doc.id,
          projectId: data.projectId,
          reason: 'unused_90_days',
          archivedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          archivedByJobId: jobId,
          metadata: {
            lastUsed: data.lastUsed,
            usageCount: data.usageCount,
            reliability: data.reliability,
          },
        };

        const logRef = db.collection('archiveLogs').doc();
        batch.set(logRef, logData);
      });

      await batch.commit();
      archivedCount += batchDocs.length;
    }

    console.log(`Archived ${archivedCount} knowledge items`);
  } catch (error) {
    console.error('Error in knowledge archival:', error);
    await logJobError(jobRef, 'archival', error);
  }

  return { archived: archivedCount };
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Update project statistics
 */
async function updateProjectStatistics(
  projectChats: Record<string, Chat[]>,
  patternResults: Record<string, number>
): Promise<void> {
  const batch = db.batch();

  Object.entries(projectChats).forEach(([projectId, chats]) => {
    const projectRef = db.collection(COLLECTIONS.PROJECTS).doc(projectId);

    batch.update(projectRef, {
      lastPatternAnalysisCount: chats.length,
      lastPatternAnalysisAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log('Project statistics updated');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple tokenization
 */
function tokenize(text: string): string[] {
  // Remove markdown and special characters
  const cleaned = text
    .replace(/[*_`~#>\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into words (supports Japanese and English)
  return cleaned
    .split(/[\s、。！？,\.!?]+/)
    .filter((word) => word.length > 1)
    .map((word) => word.toLowerCase());
}

/**
 * Calculate reliability score
 */
function calculateReliability(sampleSize: number, featureCount: number): number {
  // Base reliability
  let reliability = 70;

  // Increase based on sample size
  if (sampleSize >= 10) reliability += 10;
  else if (sampleSize >= 5) reliability += 5;

  // Increase based on feature count
  if (featureCount >= 5) reliability += 10;
  else if (featureCount >= 3) reliability += 5;

  return Math.min(100, Math.max(50, reliability));
}

/**
 * Calculate confidence score
 */
function calculateConfidence(featureCount: number, sampleSize: number): number {
  const base = (featureCount / 10) * 50; // Features contribute 50%
  const sample = Math.min((sampleSize / 20) * 50, 50); // Sample size contributes 50%
  return Math.min(100, Math.round(base + sample));
}

/**
 * Send notification (placeholder for email/Slack integration)
 */
async function sendNotification(params: {
  type: 'success' | 'error' | 'warning';
  jobId: string;
  result?: any;
  error?: string;
  duration?: number;
}): Promise<void> {
  // Log notification (in production, integrate with email/Slack)
  const message = params.type === 'success'
    ? `✅ Weekly Pattern Extraction completed successfully\nJob ID: ${params.jobId}\nDuration: ${params.duration}ms\nResults: ${JSON.stringify(params.result, null, 2)}`
    : `❌ Weekly Pattern Extraction failed\nJob ID: ${params.jobId}\nError: ${params.error}`;

  console.log('NOTIFICATION:', message);

  // TODO: Integrate with SendGrid, SES, or Slack
  // Example:
  // await sendEmail({
  //   to: 'admin@company.com',
  //   subject: `Weekly Pattern Extraction - ${params.type}`,
  //   body: message,
  // });
}
