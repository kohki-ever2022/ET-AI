/**
 * Performance Dashboard Component
 *
 * Real-time monitoring dashboard for:
 * - Firestore read reduction metrics
 * - Cache hit rates
 * - Rate limit usage
 * - Archive statistics
 * - Performance trends
 *
 * Use this to validate 95% read reduction goal
 */

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface PerformanceMetrics {
  timestamp: Date;
  totalReads: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  estimatedCost: number;
  operation: string;
}

interface RateLimitMetrics {
  rpm: number;
  tpm: number;
  rpd: number;
  rpmLimit: number;
  tpmLimit: number;
  rpdLimit: number;
  rpmUsage: number;
  tpmUsage: number;
  rpdUsage: number;
}

interface ArchiveStatistics {
  totalChats: number;
  archivedChats: number;
  activeChats: number;
  totalChannels: number;
  archivedChannels: number;
  activeChannels: number;
  archiveRatio: {
    chats: number;
    channels: number;
  };
}

interface ReductionMetrics {
  baseline: number;
  current: number;
  reduction: number;
  reductionPercentage: number;
  goal: number;
  goalAchieved: boolean;
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitMetrics | null>(null);
  const [archiveStats, setArchiveStats] = useState<ArchiveStatistics | null>(null);
  const [reductionMetrics, setReductionMetrics] = useState<ReductionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPerformanceMetrics(),
        loadRateLimitMetrics(),
        loadArchiveStatistics(),
        loadReductionMetrics(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    const timeRangeMs = getTimeRangeMs(timeRange);
    const cutoffTime = Timestamp.fromMillis(Date.now() - timeRangeMs);

    const metricsRef = collection(db, 'performanceMetrics');
    const q = query(
      metricsRef,
      where('timestamp', '>', cutoffTime),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const metricsData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        timestamp: data.timestamp.toDate(),
        totalReads: data.totalReads || 0,
        cacheHits: data.cacheHits || 0,
        cacheMisses: data.cacheMisses || 0,
        cacheHitRate: data.cacheHitRate || 0,
        estimatedCost: data.estimatedCost || 0,
        operation: data.operation || 'unknown',
      };
    });

    setMetrics(metricsData);
  };

  const loadRateLimitMetrics = async () => {
    const rateLimitRef = collection(db, 'rateLimitUsage');
    const q = query(rateLimitRef, orderBy('timestamp', 'desc'), limit(1));

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      setRateLimits({
        rpm: data.rpm || 0,
        tpm: data.tpm || 0,
        rpd: data.rpd || 0,
        rpmLimit: data.rpmLimit || 50,
        tpmLimit: data.tpmLimit || 40000,
        rpdLimit: data.rpdLimit || 50000,
        rpmUsage: ((data.rpm || 0) / (data.rpmLimit || 50)) * 100,
        tpmUsage: ((data.tpm || 0) / (data.tpmLimit || 40000)) * 100,
        rpdUsage: ((data.rpd || 0) / (data.rpdLimit || 50000)) * 100,
      });
    }
  };

  const loadArchiveStatistics = async () => {
    const archiveJobsRef = collection(db, 'archiveJobs');
    const q = query(archiveJobsRef, orderBy('timestamp', 'desc'), limit(1));

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      setArchiveStats(data.stats);
    }
  };

  const loadReductionMetrics = async () => {
    // Calculate reduction from baseline
    const baseline = 500000; // 500K reads for 10 users (from scalability doc)
    const current = metrics.reduce((sum, m) => sum + m.totalReads, 0);
    const reduction = baseline - current;
    const reductionPercentage = (reduction / baseline) * 100;
    const goal = 95;
    const goalAchieved = reductionPercentage >= goal;

    setReductionMetrics({
      baseline,
      current,
      reduction,
      reductionPercentage,
      goal,
      goalAchieved,
    });
  };

  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '1h':
        return 60 * 60 * 1000;
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(0);
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage < 60) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    if (percentage < 90) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGoalStatusColor = (achieved: boolean): string => {
    return achieved ? 'text-green-600' : 'text-orange-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const avgCacheHitRate =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length
      : 0;

  const totalCost = metrics.reduce((sum, m) => sum + m.estimatedCost, 0);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Goal Achievement Card */}
      {reductionMetrics && (
        <div
          className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
            reductionMetrics.goalAchieved ? 'border-green-500' : 'border-orange-500'
          }`}
        >
          <h2 className="text-xl font-semibold mb-4">95% Read Reduction Goal</h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Baseline Reads</div>
              <div className="text-2xl font-bold">{formatNumber(reductionMetrics.baseline)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Current Reads</div>
              <div className="text-2xl font-bold">{formatNumber(reductionMetrics.current)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Reduction</div>
              <div className={`text-2xl font-bold ${getGoalStatusColor(reductionMetrics.goalAchieved)}`}>
                {formatPercentage(reductionMetrics.reductionPercentage)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Goal Status</div>
              <div className={`text-2xl font-bold ${getGoalStatusColor(reductionMetrics.goalAchieved)}`}>
                {reductionMetrics.goalAchieved ? '✓ Achieved' : '⚠ In Progress'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cache Performance */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Cache Performance</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Cache Hit Rate</div>
              <div className="text-3xl font-bold text-green-600">
                {formatPercentage(avgCacheHitRate)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Cache Hits</div>
              <div className="text-xl font-semibold">
                {formatNumber(metrics.reduce((sum, m) => sum + m.cacheHits, 0))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Cache Misses</div>
              <div className="text-xl font-semibold">
                {formatNumber(metrics.reduce((sum, m) => sum + m.cacheMisses, 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Firestore Costs */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Firestore Costs</h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Estimated Cost ({timeRange})</div>
              <div className="text-3xl font-bold text-blue-600">{formatCost(totalCost)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Reads</div>
              <div className="text-xl font-semibold">
                {formatNumber(metrics.reduce((sum, m) => sum + m.totalReads, 0))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Avg Cost per Read</div>
              <div className="text-xl font-semibold">
                {formatCost(totalCost / metrics.reduce((sum, m) => sum + m.totalReads, 0) || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        {rateLimits && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Claude API Rate Limits</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">RPM Usage</div>
                <div className={`text-2xl font-bold ${getStatusColor(rateLimits.rpmUsage)}`}>
                  {formatPercentage(rateLimits.rpmUsage)}
                </div>
                <div className="text-xs text-gray-500">
                  {rateLimits.rpm} / {rateLimits.rpmLimit}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">TPM Usage</div>
                <div className={`text-xl font-semibold ${getStatusColor(rateLimits.tpmUsage)}`}>
                  {formatPercentage(rateLimits.tpmUsage)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatNumber(rateLimits.tpm)} / {formatNumber(rateLimits.tpmLimit)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">RPD Usage</div>
                <div className={`text-xl font-semibold ${getStatusColor(rateLimits.rpdUsage)}`}>
                  {formatPercentage(rateLimits.rpdUsage)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatNumber(rateLimits.rpd)} / {formatNumber(rateLimits.rpdLimit)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Archive Statistics */}
      {archiveStats && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Archive Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600">Total Chats</div>
              <div className="text-2xl font-bold">{formatNumber(archiveStats.totalChats)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Archived Chats</div>
              <div className="text-2xl font-bold text-gray-500">
                {formatNumber(archiveStats.archivedChats)}
              </div>
              <div className="text-xs text-gray-500">
                {formatPercentage(archiveStats.archiveRatio.chats * 100)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Channels</div>
              <div className="text-2xl font-bold">{formatNumber(archiveStats.totalChannels)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Archived Channels</div>
              <div className="text-2xl font-bold text-gray-500">
                {formatNumber(archiveStats.archivedChannels)}
              </div>
              <div className="text-xs text-gray-500">
                {formatPercentage(archiveStats.archiveRatio.channels * 100)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Metrics Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Recent Operations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cache Hit Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Reads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Est. Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.slice(0, 10).map((metric, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.timestamp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.operation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatPercentage(metric.cacheHitRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(metric.totalReads)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCost(metric.estimatedCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
