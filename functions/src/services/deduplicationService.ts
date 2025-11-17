/**
 * 3-Layer Deduplication Detection System
 *
 * Detects and groups duplicate knowledge entries using three methods:
 * 1. Exact Match: 100% identical content (normalized)
 * 2. Semantic Match: 95%+ embedding similarity
 * 3. Fuzzy Match: 85%+ Levenshtein similarity
 *
 * Groups duplicates and marks one as representative.
 */

import { db, COLLECTIONS, serverTimestamp } from '../config/firebase';
import {
  findExactDuplicates,
  findFuzzyDuplicates,
  calculateFuzzyMatchScore,
} from './vectorSearchService';
import { cosineSimilarity } from './embeddingService';
import type { Knowledge, KnowledgeGroup } from '../types';

/**
 * Detection thresholds
 */
const THRESHOLDS = {
  EXACT: 1.0, // 100% match
  SEMANTIC: 0.95, // 95% embedding similarity
  FUZZY: 0.85, // 85% Levenshtein similarity
};

/**
 * Detects duplicates for newly added knowledge entries
 *
 * @param projectId - Project ID
 * @param knowledgeIds - IDs of new knowledge entries to check
 * @returns Number of duplicates found
 */
export async function detectDuplicates(
  projectId: string,
  knowledgeIds: string[]
): Promise<number> {
  console.log('Starting 3-layer deduplication:', {
    projectId,
    knowledgeCount: knowledgeIds.length,
  });

  let totalDuplicatesFound = 0;

  try {
    // Get all new knowledge entries
    const knowledgeDocs = await Promise.all(
      knowledgeIds.map((id) => db.collection(COLLECTIONS.KNOWLEDGE).doc(id).get())
    );

    const knowledgeEntries: Knowledge[] = knowledgeDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Knowledge));

    console.log(`Processing ${knowledgeEntries.length} knowledge entries`);

    // Process each knowledge entry
    for (const knowledge of knowledgeEntries) {
      const duplicatesFound = await detectDuplicatesForEntry(knowledge);
      totalDuplicatesFound += duplicatesFound;
    }

    console.log(`Deduplication complete: ${totalDuplicatesFound} total duplicates found`);

    return totalDuplicatesFound;
  } catch (error) {
    console.error('Deduplication failed:', error);
    throw new Error('重複検出に失敗しました。');
  }
}

/**
 * Detects duplicates for a single knowledge entry
 */
async function detectDuplicatesForEntry(knowledge: Knowledge): Promise<number> {
  console.log(`Checking duplicates for knowledge: ${knowledge.id}`);

  const duplicates: Map<
    string,
    {
      knowledge: Knowledge;
      method: 'exact' | 'semantic' | 'fuzzy';
      score: number;
    }
  > = new Map();

  // Layer 1: Exact match detection
  const exactDuplicates = await findExactDuplicates(knowledge.projectId, knowledge.content);

  for (const duplicate of exactDuplicates) {
    if (duplicate.id !== knowledge.id) {
      duplicates.set(duplicate.id, {
        knowledge: duplicate,
        method: 'exact',
        score: 1.0,
      });
    }
  }

  console.log(`Layer 1 (Exact): Found ${exactDuplicates.length - 1} duplicates`);

  // Layer 2: Semantic match detection (using embeddings)
  if (knowledge.embedding && knowledge.embedding.length > 0) {
    const semanticDuplicates = await findSemanticDuplicates(knowledge);

    for (const duplicate of semanticDuplicates) {
      if (duplicate.id !== knowledge.id && !duplicates.has(duplicate.id)) {
        const similarity = cosineSimilarity(
          knowledge.embedding!,
          duplicate.embedding || []
        );

        if (similarity >= THRESHOLDS.SEMANTIC) {
          duplicates.set(duplicate.id, {
            knowledge: duplicate,
            method: 'semantic',
            score: similarity,
          });
        }
      }
    }

    console.log(`Layer 2 (Semantic): Found ${semanticDuplicates.length} duplicates`);
  }

  // Layer 3: Fuzzy match detection
  const fuzzyDuplicates = await findFuzzyDuplicates(
    knowledge.projectId,
    knowledge.content,
    THRESHOLDS.FUZZY
  );

  for (const duplicate of fuzzyDuplicates) {
    if (duplicate.id !== knowledge.id && !duplicates.has(duplicate.id)) {
      const score = calculateFuzzyMatchScore(knowledge.content, duplicate.content);

      if (score >= THRESHOLDS.FUZZY) {
        duplicates.set(duplicate.id, {
          knowledge: duplicate,
          method: 'fuzzy',
          score,
        });
      }
    }
  }

  console.log(`Layer 3 (Fuzzy): Found ${fuzzyDuplicates.length} duplicates`);

  // If duplicates found, create or update knowledge group
  if (duplicates.size > 0) {
    await createOrUpdateKnowledgeGroup(knowledge, Array.from(duplicates.values()));
  }

  return duplicates.size;
}

/**
 * Finds semantic duplicates using embedding similarity
 */
async function findSemanticDuplicates(knowledge: Knowledge): Promise<Knowledge[]> {
  if (!knowledge.embedding || knowledge.embedding.length === 0) {
    return [];
  }

  // Get all knowledge with embeddings in the same project
  const snapshot = await db
    .collection(COLLECTIONS.KNOWLEDGE)
    .where('projectId', '==', knowledge.projectId)
    .get();

  const duplicates: Knowledge[] = [];

  for (const doc of snapshot.docs) {
    if (doc.id === knowledge.id) {
      continue;
    }

    const candidate = {
      id: doc.id,
      ...doc.data(),
    } as Knowledge;

    if (!candidate.embedding || candidate.embedding.length === 0) {
      continue;
    }

    const similarity = cosineSimilarity(knowledge.embedding, candidate.embedding);

    if (similarity >= THRESHOLDS.SEMANTIC) {
      duplicates.push(candidate);
    }
  }

  return duplicates;
}

/**
 * Creates or updates a knowledge group for duplicates
 */
async function createOrUpdateKnowledgeGroup(
  representative: Knowledge,
  duplicates: Array<{
    knowledge: Knowledge;
    method: 'exact' | 'semantic' | 'fuzzy';
    score: number;
  }>
): Promise<void> {
  console.log(`Creating/updating knowledge group for ${representative.id}`, {
    duplicateCount: duplicates.length,
  });

  try {
    // Check if representative already has a group
    const existingGroupSnapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE_GROUPS)
      .where('representativeKnowledgeId', '==', representative.id)
      .limit(1)
      .get();

    const duplicateIds = duplicates.map((d) => d.knowledge.id);
    const similarityScores: Record<string, number> = {};

    duplicates.forEach((d) => {
      similarityScores[d.knowledge.id] = d.score;
    });

    // Determine primary detection method
    const detectionMethods = duplicates.map((d) => d.method);
    const primaryMethod = detectionMethods.includes('exact')
      ? 'exact'
      : detectionMethods.includes('semantic')
      ? 'semantic'
      : 'fuzzy';

    if (!existingGroupSnapshot.empty) {
      // Update existing group
      const groupDoc = existingGroupSnapshot.docs[0];
      const existingGroup = groupDoc.data() as KnowledgeGroup;

      // Merge duplicate IDs (avoid duplicates)
      const mergedDuplicateIds = Array.from(
        new Set([...existingGroup.duplicateKnowledgeIds, ...duplicateIds])
      );

      await groupDoc.ref.update({
        duplicateKnowledgeIds: mergedDuplicateIds,
        similarityScores: {
          ...existingGroup.similarityScores,
          ...similarityScores,
        },
      });

      console.log(`Updated existing group ${groupDoc.id}`);
    } else {
      // Create new group
      const newGroup: Omit<KnowledgeGroup, 'id'> = {
        projectId: representative.projectId,
        representativeKnowledgeId: representative.id,
        duplicateKnowledgeIds: duplicateIds,
        similarityScores,
        createdAt: serverTimestamp() as any,
        detectionMethod: primaryMethod,
      };

      const groupRef = await db.collection(COLLECTIONS.KNOWLEDGE_GROUPS).add(newGroup);

      console.log(`Created new group ${groupRef.id}`);
    }

    // Mark representative as isRepresentative
    await db.collection(COLLECTIONS.KNOWLEDGE).doc(representative.id).update({
      isRepresentative: true,
    });

    // Update duplicate entries with group reference
    const batch = db.batch();

    for (const duplicate of duplicates) {
      const duplicateRef = db.collection(COLLECTIONS.KNOWLEDGE).doc(duplicate.knowledge.id);

      batch.update(duplicateRef, {
        duplicateGroupId: representative.id,
        isRepresentative: false,
      });
    }

    await batch.commit();

    console.log(`Updated ${duplicates.length} duplicate entries`);
  } catch (error) {
    console.error('Failed to create/update knowledge group:', error);
    throw error;
  }
}

/**
 * Removes a knowledge entry from duplicate groups
 */
export async function removeDuplicateFromGroup(knowledgeId: string): Promise<void> {
  try {
    // Find groups containing this knowledge ID
    const groupsSnapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE_GROUPS)
      .where('duplicateKnowledgeIds', 'array-contains', knowledgeId)
      .get();

    const batch = db.batch();

    for (const groupDoc of groupsSnapshot.docs) {
      const group = groupDoc.data() as KnowledgeGroup;

      // Remove from duplicateKnowledgeIds
      const updatedDuplicateIds = group.duplicateKnowledgeIds.filter((id) => id !== knowledgeId);

      // Remove from similarityScores
      const updatedSimilarityScores = { ...group.similarityScores };
      delete updatedSimilarityScores[knowledgeId];

      if (updatedDuplicateIds.length === 0) {
        // No more duplicates, delete the group
        batch.delete(groupDoc.ref);
      } else {
        // Update the group
        batch.update(groupDoc.ref, {
          duplicateKnowledgeIds: updatedDuplicateIds,
          similarityScores: updatedSimilarityScores,
        });
      }
    }

    // Update the knowledge entry
    const knowledgeRef = db.collection(COLLECTIONS.KNOWLEDGE).doc(knowledgeId);
    batch.update(knowledgeRef, {
      duplicateGroupId: null,
      isRepresentative: false,
    });

    await batch.commit();

    console.log(`Removed knowledge ${knowledgeId} from duplicate groups`);
  } catch (error) {
    console.error('Failed to remove duplicate from group:', error);
    throw error;
  }
}

/**
 * Gets duplicate statistics for a project
 */
export async function getDuplicateStats(
  projectId: string
): Promise<{
  totalKnowledge: number;
  uniqueKnowledge: number;
  duplicateGroups: number;
  totalDuplicates: number;
  exactMatches: number;
  semanticMatches: number;
  fuzzyMatches: number;
}> {
  try {
    // Get total knowledge count
    const knowledgeSnapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE)
      .where('projectId', '==', projectId)
      .get();

    const totalKnowledge = knowledgeSnapshot.size;

    // Get duplicate groups
    const groupsSnapshot = await db
      .collection(COLLECTIONS.KNOWLEDGE_GROUPS)
      .where('projectId', '==', projectId)
      .get();

    const duplicateGroups = groupsSnapshot.size;

    let totalDuplicates = 0;
    let exactMatches = 0;
    let semanticMatches = 0;
    let fuzzyMatches = 0;

    for (const groupDoc of groupsSnapshot.docs) {
      const group = groupDoc.data() as KnowledgeGroup;

      totalDuplicates += group.duplicateKnowledgeIds.length;

      switch (group.detectionMethod) {
        case 'exact':
          exactMatches += group.duplicateKnowledgeIds.length;
          break;
        case 'semantic':
          semanticMatches += group.duplicateKnowledgeIds.length;
          break;
        case 'fuzzy':
          fuzzyMatches += group.duplicateKnowledgeIds.length;
          break;
      }
    }

    const uniqueKnowledge = totalKnowledge - totalDuplicates;

    return {
      totalKnowledge,
      uniqueKnowledge,
      duplicateGroups,
      totalDuplicates,
      exactMatches,
      semanticMatches,
      fuzzyMatches,
    };
  } catch (error) {
    console.error('Failed to get duplicate stats:', error);
    throw error;
  }
}
