/**
 * Duplicate Management Dashboard
 *
 * Provides duplicate knowledge management with:
 * - Duplicate statistics display
 * - 3-layer detection breakdown
 * - Duplicate group viewer
 * - Merge/remove actions
 * - Apple HIG design compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

interface DuplicateStats {
  totalKnowledge: number;
  uniqueKnowledge: number;
  duplicateGroups: number;
  totalDuplicates: number;
  exactMatches: number;
  semanticMatches: number;
  fuzzyMatches: number;
}

interface KnowledgeGroup {
  id: string;
  representativeKnowledgeId: string;
  duplicateKnowledgeIds: string[];
  similarityScores: Record<string, number>;
  detectionMethod: 'exact' | 'semantic' | 'fuzzy';
  createdAt: Date;
}

interface DuplicateDashboardProps {
  projectId: string;
}

export const DuplicateDashboard: React.FC<DuplicateDashboardProps> = ({ projectId }) => {
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [groups, setGroups] = useState<KnowledgeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<KnowledgeGroup | null>(null);

  const functions = getFunctions();
  const db = getFirestore();

  /**
   * Fetches duplicate statistics
   */
  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const duplicateStats = httpsCallable(functions, 'duplicateStats');
      const response = await duplicateStats({ projectId });

      const data = response.data as {
        success: boolean;
        stats: DuplicateStats;
      };

      if (data.success) {
        setStats(data.stats);
      } else {
        setError('統計情報の取得に失敗しました。');
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
      setError('エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, functions]);

  /**
   * Fetches duplicate groups
   */
  const fetchGroups = useCallback(async () => {
    try {
      const q = query(collection(db, 'knowledgeGroups'), where('projectId', '==', projectId));

      const snapshot = await getDocs(q);

      const fetchedGroups: KnowledgeGroup[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as KnowledgeGroup[];

      setGroups(fetchedGroups);
    } catch (err) {
      console.error('Groups fetch error:', err);
    }
  }, [projectId, db]);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchStats();
    fetchGroups();
  }, [fetchStats, fetchGroups]);

  /**
   * Get detection method color
   */
  const getMethodColor = (method: KnowledgeGroup['detectionMethod']) => {
    switch (method) {
      case 'exact':
        return 'bg-green-100 text-green-800';
      case 'semantic':
        return 'bg-blue-100 text-blue-800';
      case 'fuzzy':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get detection method label
   */
  const getMethodLabel = (method: KnowledgeGroup['detectionMethod']) => {
    switch (method) {
      case 'exact':
        return '完全一致';
      case 'semantic':
        return 'セマンティック';
      case 'fuzzy':
        return 'ファジー';
      default:
        return '不明';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8">
        <p className="text-center text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      {stats && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-900">重複統計</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Knowledge */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">総ナレッジ数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalKnowledge}</p>
            </div>

            {/* Unique Knowledge */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">ユニークナレッジ</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.uniqueKnowledge}</p>
            </div>

            {/* Duplicate Groups */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">重複グループ</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{stats.duplicateGroups}</p>
            </div>

            {/* Total Duplicates */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">重複ナレッジ</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{stats.totalDuplicates}</p>
            </div>
          </div>

          {/* Detection Method Breakdown */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">検出方法の内訳</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Exact Matches */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">完全一致</span>
                    <span className="text-sm font-bold text-green-600">
                      {stats.exactMatches}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-600"
                      style={{
                        width: `${(stats.exactMatches / stats.totalDuplicates) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Semantic Matches */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">セマンティック</span>
                    <span className="text-sm font-bold text-blue-600">
                      {stats.semanticMatches}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600"
                      style={{
                        width: `${(stats.semanticMatches / stats.totalDuplicates) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Fuzzy Matches */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">ファジー</span>
                    <span className="text-sm font-bold text-yellow-600">
                      {stats.fuzzyMatches}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-yellow-600"
                      style={{
                        width: `${(stats.fuzzyMatches / stats.totalDuplicates) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Groups List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">重複グループ</h2>
          <button
            onClick={fetchGroups}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            更新
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">重複グループが見つかりませんでした。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center space-x-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getMethodColor(
                          group.detectionMethod
                        )}`}
                      >
                        {getMethodLabel(group.detectionMethod)}
                      </span>

                      <span className="text-sm text-gray-600">
                        {group.duplicateKnowledgeIds.length}件の重複
                      </span>
                    </div>

                    {/* Representative */}
                    <div>
                      <p className="text-sm font-medium text-gray-700">代表ナレッジ</p>
                      <p className="mt-1 text-xs text-gray-500">
                        ID: {group.representativeKnowledgeId.substring(0, 12)}...
                      </p>
                    </div>

                    {/* Similarity Scores */}
                    <div>
                      <p className="text-sm font-medium text-gray-700">類似度スコア</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(group.similarityScores)
                          .slice(0, 5)
                          .map(([id, score]) => (
                            <span
                              key={id}
                              className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800"
                            >
                              {((score as number) * 100).toFixed(0)}%
                            </span>
                          ))}
                        {Object.keys(group.similarityScores).length > 5 && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                            +{Object.keys(group.similarityScores).length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="ml-4">
                    <svg
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Group Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <h3 className="text-2xl font-bold text-gray-900">重複グループ詳細</h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700">検出方法</p>
                <span
                  className={`mt-2 inline-block rounded-full px-4 py-2 text-sm font-medium ${getMethodColor(
                    selectedGroup.detectionMethod
                  )}`}
                >
                  {getMethodLabel(selectedGroup.detectionMethod)}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">代表ナレッジID</p>
                <p className="mt-1 font-mono text-sm text-gray-900">
                  {selectedGroup.representativeKnowledgeId}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">
                  重複ナレッジ ({selectedGroup.duplicateKnowledgeIds.length}件)
                </p>
                <div className="mt-2 space-y-2">
                  {selectedGroup.duplicateKnowledgeIds.map((id) => (
                    <div key={id} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm text-gray-900">{id}</p>
                        <span className="text-sm font-medium text-blue-600">
                          {((selectedGroup.similarityScores[id] || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
