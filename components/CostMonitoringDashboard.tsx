/**
 * Cost Monitoring Dashboard Component
 *
 * Displays Claude API usage metrics, costs, and budget status.
 * Provides visualization of cost trends and cache efficiency.
 */

import React, { useState, useEffect } from 'react';
import {
  getUsageMetrics,
  getCostTrends,
  getBudgetStatus,
  getCacheEfficiency,
  type UsageMetrics,
} from '../services/costMonitoringService';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Card } from './ui/Card';
import { useApp } from '../context/AppContext';

interface CostDashboardProps {
  projectId?: string;
  period?: 'daily' | 'weekly' | 'monthly';
}

export const CostMonitoringDashboard: React.FC<CostDashboardProps> = ({
  projectId,
  period = 'daily',
}) => {
  const { darkMode } = useApp();
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; cost: number; requests: number }>>([]);
  const [budgetStatus, setBudgetStatus] = useState<any>(null);
  const [cacheEfficiency, setCacheEfficiency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [projectId, period]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Load all data in parallel
      const [metricsData, trendsData, budgetData, cacheData] = await Promise.all([
        getUsageMetrics(startDate, endDate, projectId),
        getCostTrends(period === 'daily' ? 7 : period === 'weekly' ? 30 : 90, projectId),
        getBudgetStatus(projectId),
        getCacheEfficiency(period === 'daily' ? 1 : period === 'weekly' ? 7 : 30, projectId),
      ]);

      setMetrics(metricsData);
      setTrends(trendsData);
      setBudgetStatus(budgetData);
      setCacheEfficiency(cacheData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          コスト監視ダッシュボード
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => loadDashboardData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            更新
          </button>
        </div>
      </div>

      {/* Budget Status */}
      {budgetStatus?.budget && (
        <Card className={`p-6 ${budgetStatus.isOverBudget ? 'border-red-500 bg-red-50' : budgetStatus.shouldAlert ? 'border-yellow-500 bg-yellow-50' : ''}`}>
          <h3 className="text-lg font-semibold mb-4">予算ステータス</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">予算</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(budgetStatus.budget.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">現在の支出</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(budgetStatus.currentSpend)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">使用率</p>
              <p className={`text-2xl font-bold ${budgetStatus.isOverBudget ? 'text-red-600' : budgetStatus.shouldAlert ? 'text-yellow-600' : 'text-green-600'}`}>
                {budgetStatus.percentageUsed.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">残り</p>
              <p className={`text-2xl font-bold ${budgetStatus.remainingBudget < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {formatCurrency(Math.abs(budgetStatus.remainingBudget))}
                {budgetStatus.remainingBudget < 0 && ' 超過'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${budgetStatus.isOverBudget ? 'bg-red-600' : budgetStatus.shouldAlert ? 'bg-yellow-600' : 'bg-green-600'}`}
                style={{ width: `${Math.min(budgetStatus.percentageUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </Card>
      )}

      {/* Current Period Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              総コスト
            </h4>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(metrics.cost.totalCost)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              平均: {formatCurrency(metrics.averageCostPerRequest)}/リクエスト
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              リクエスト数
            </h4>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatNumber(metrics.requestCount)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {period === 'daily' ? '今日' : period === 'weekly' ? '今週' : '今月'}
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              キャッシュヒット率
            </h4>
            <p className="text-3xl font-bold text-green-600">
              {(metrics.cacheHitRate * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatNumber(metrics.usage.cacheReadInputTokens)} トークン
            </p>
          </Card>

          <Card className="p-6">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              総トークン数
            </h4>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatNumber(
                metrics.usage.inputTokens +
                  metrics.usage.cacheCreationInputTokens +
                  metrics.usage.cacheReadInputTokens +
                  metrics.usage.outputTokens
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              出力: {formatNumber(metrics.usage.outputTokens)}
            </p>
          </Card>
        </div>
      )}

      {/* Cache Efficiency */}
      {cacheEfficiency && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">キャッシュ効率</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                キャッシュによるコスト削減
              </p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(cacheEfficiency.totalSavings)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                キャッシュなしの場合: {formatCurrency(cacheEfficiency.estimatedCostWithoutCache)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                削減率
              </p>
              <p className="text-3xl font-bold text-green-600">
                {((cacheEfficiency.totalSavings / cacheEfficiency.estimatedCostWithoutCache) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                コスト効率化
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                キャッシュ読み取りトークン
              </p>
              <p className="text-3xl font-bold text-blue-600">
                {formatNumber(cacheEfficiency.cacheReadTokens)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                通常トークン: {formatNumber(cacheEfficiency.normalInputTokens)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Cost Trends Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">コスト推移</h3>
        <div className="space-y-2">
          {trends.map((trend, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400 w-24">
                {new Date(trend.date).toLocaleDateString('ja-JP', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max((trend.cost / Math.max(...trends.map((t) => t.cost))) * 100, 5)}%`,
                    }}
                  >
                    <span className="text-xs text-white font-medium">
                      {formatCurrency(trend.cost)}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500 w-20 text-right">
                {formatNumber(trend.requests)} req
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Token Usage Breakdown */}
      {metrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">トークン使用量の内訳</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">入力トークン</span>
                <span className="text-sm font-medium">{formatNumber(metrics.usage.inputTokens)}</span>
              </div>
              <div className="text-xs text-gray-500">
                コスト: {formatCurrency(metrics.cost.inputCost)}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  キャッシュ作成トークン
                </span>
                <span className="text-sm font-medium">
                  {formatNumber(metrics.usage.cacheCreationInputTokens)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                コスト: {formatCurrency(metrics.cost.cacheWriteCost)}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  キャッシュ読み取りトークン
                </span>
                <span className="text-sm font-medium text-green-600">
                  {formatNumber(metrics.usage.cacheReadInputTokens)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                コスト: {formatCurrency(metrics.cost.cacheReadCost)} (90%削減)
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">出力トークン</span>
                <span className="text-sm font-medium">{formatNumber(metrics.usage.outputTokens)}</span>
              </div>
              <div className="text-xs text-gray-500">
                コスト: {formatCurrency(metrics.cost.outputCost)}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CostMonitoringDashboard;
