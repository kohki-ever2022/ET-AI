/**
 * Chat Modification Trigger
 *
 * Firestore trigger that extracts learning patterns when chats are modified.
 * Analyzes differences between original and modified text to learn user preferences.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface ModificationPattern {
  type: 'vocabulary' | 'structure' | 'emphasis' | 'tone';
  description: string;
  confidence: number;
  examples: string[];
}

/**
 * Triggered when a chat document is updated
 * Extracts learning patterns from modifications
 */
export const onChatModified = functions.firestore
  .document('chats/{chatId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const chatId = context.params.chatId;

    // Only process when modifications are added
    const beforeModCount = before.modifiedHistory?.length || 0;
    const afterModCount = after.modifiedHistory?.length || 0;

    if (afterModCount <= beforeModCount) {
      return null;
    }

    console.log(`Processing chat modification: ${chatId}`);

    try {
      const latestModification = after.modifiedHistory[afterModCount - 1];
      const originalText = latestModification.originalText || after.aiResponse;
      const modifiedText = latestModification.modifiedText;
      const projectId = after.projectId;

      // Analyze the modification to extract patterns
      console.log('Analyzing modification patterns...');
      const patterns = analyzeModification(originalText, modifiedText);

      if (patterns.length === 0) {
        console.log('No patterns extracted from modification');
        return null;
      }

      // Save each pattern to learningPatterns collection
      const batch = db.batch();
      let savedCount = 0;

      for (const pattern of patterns) {
        // Check if similar pattern already exists
        const existingPattern = await db
          .collection('learningPatterns')
          .where('projectId', '==', projectId)
          .where('patternType', '==', pattern.type)
          .where('patternContent', '==', pattern.description)
          .limit(1)
          .get();

        if (!existingPattern.empty) {
          // Update existing pattern
          const patternRef = existingPattern.docs[0].ref;
          batch.update(patternRef, {
            examples: admin.firestore.FieldValue.arrayUnion(modifiedText),
            extractedFrom: admin.firestore.FieldValue.arrayUnion(chatId),
            reliability: admin.firestore.FieldValue.increment(5), // Increase confidence
            occurrenceCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Create new pattern
          const patternRef = db.collection('learningPatterns').doc();
          batch.set(patternRef, {
            projectId,
            patternType: pattern.type,
            patternContent: pattern.description,
            examples: [modifiedText],
            extractedFrom: [chatId],
            reliability: pattern.confidence,
            occurrenceCount: 1,
            validatedBy: latestModification.modifiedBy,
            validatedAt: latestModification.modifiedAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        savedCount++;
      }

      await batch.commit();
      console.log(`Saved ${savedCount} learning patterns`);

      // Update project pattern analysis count
      await db
        .collection('projects')
        .doc(projectId)
        .update({
          lastPatternAnalysisCount: admin.firestore.FieldValue.increment(savedCount),
          lastPatternAnalysisAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return null;
    } catch (error) {
      console.error('Error in onChatModified trigger:', error);

      // Log error
      await db.collection('errorLogs').add({
        trigger: 'onChatModified',
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    }
  });

/**
 * Analyze modification to extract learning patterns
 */
function analyzeModification(
  original: string,
  modified: string
): ModificationPattern[] {
  const patterns: ModificationPattern[] = [];

  // Pattern 1: Numeric specificity (adding specific numbers)
  const originalNums = extractNumbers(original);
  const modifiedNums = extractNumbers(modified);

  if (modifiedNums.length > originalNums.length) {
    patterns.push({
      type: 'emphasis',
      description: '具体的な数値を追加して説得力を向上',
      confidence: 75,
      examples: modifiedNums.map(n => `数値「${n}」を使用`),
    });
  }

  // Pattern 2: Tone change (断定的表現)
  if (detectToneChange(original, modified)) {
    patterns.push({
      type: 'tone',
      description: '推測表現から断定的表現への変更',
      confidence: 80,
      examples: [modified],
    });
  }

  // Pattern 3: Vocabulary preference (word replacements)
  const vocabularyChanges = detectVocabularyChanges(original, modified);
  if (vocabularyChanges.length > 0) {
    for (const change of vocabularyChanges) {
      patterns.push({
        type: 'vocabulary',
        description: `「${change.from}」→「${change.to}」への用語変更`,
        confidence: 85,
        examples: [modified],
      });
    }
  }

  // Pattern 4: Structure change (paragraph organization)
  if (detectStructureChange(original, modified)) {
    patterns.push({
      type: 'structure',
      description: '文章構造の改善（段落整理、箇条書き化など）',
      confidence: 70,
      examples: [modified],
    });
  }

  // Pattern 5: Length adjustment
  const lengthRatio = modified.length / original.length;
  if (lengthRatio > 1.3) {
    patterns.push({
      type: 'emphasis',
      description: '詳細な説明を追加して充実化',
      confidence: 75,
      examples: [modified],
    });
  } else if (lengthRatio < 0.7) {
    patterns.push({
      type: 'emphasis',
      description: '簡潔な表現への変更',
      confidence: 75,
      examples: [modified],
    });
  }

  return patterns;
}

/**
 * Extract numbers from text
 */
function extractNumbers(text: string): string[] {
  const numericRegex = /\d+(?:,\d{3})*(?:\.\d+)?%?/g;
  return text.match(numericRegex) || [];
}

/**
 * Detect tone changes (推測 → 断定)
 */
function detectToneChange(original: string, modified: string): boolean {
  const tentativePatterns = [
    'できます',
    'と思います',
    'かもしれません',
    '可能性があります',
    'と考えられます',
  ];

  const assertivePatterns = [
    'します',
    'です',
    'であります',
    'いたします',
    'しています',
  ];

  const hasTentativeOriginal = tentativePatterns.some(p => original.includes(p));
  const hasAssertiveModified = assertivePatterns.some(p => modified.includes(p));

  return hasTentativeOriginal && hasAssertiveModified;
}

/**
 * Detect vocabulary changes
 */
function detectVocabularyChanges(
  original: string,
  modified: string
): Array<{ from: string; to: string }> {
  const changes: Array<{ from: string; to: string }> = [];

  // Common business term replacements
  const replacementPatterns = [
    { from: 'お客様', to: 'ステークホルダー' },
    { from: '会社', to: '当社' },
    { from: '社員', to: '従業員' },
    { from: '利益', to: '企業価値' },
    { from: '目標', to: 'KPI' },
  ];

  for (const pattern of replacementPatterns) {
    if (original.includes(pattern.from) && modified.includes(pattern.to)) {
      changes.push(pattern);
    }
  }

  return changes;
}

/**
 * Detect structure changes
 */
function detectStructureChange(original: string, modified: string): boolean {
  // Check for bullet points or numbered lists
  const hasBulletsModified = /[・•\-]\s/.test(modified) || /\d+\.\s/.test(modified);
  const hasBulletsOriginal = /[・•\-]\s/.test(original) || /\d+\.\s/.test(original);

  if (!hasBulletsOriginal && hasBulletsModified) {
    return true;
  }

  // Check for paragraph breaks
  const paragraphsOriginal = original.split(/\n\n+/).length;
  const paragraphsModified = modified.split(/\n\n+/).length;

  if (paragraphsModified > paragraphsOriginal + 1) {
    return true;
  }

  return false;
}
