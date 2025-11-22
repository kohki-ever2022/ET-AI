import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useAppContext } from '../context/AppContext';

// Types matching backend
type BatchJobType = 'weekly-pattern-extraction' | 'knowledge-maintenance' | 'archive-cleanup';
type BatchJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface BatchJob {
  id: string;
  type: BatchJobType;
  status: BatchJobStatus;
  progress: {
    current: number;
    total: number;
    percentage: number;
    currentStep: string;
  };
  targetPeriod: {
    startDate: Timestamp;
    endDate: Timestamp;
  };
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  result?: {
    projectsProcessed: number;
    chatsAnalyzed: number;
    patternsExtracted: {
      vocabulary: number;
      structure: number;
      emphasis: number;
      tone: number;
      length: number;
    };
    duplicatesFound: number;
    duplicatesMerged: number;
    knowledgeArchived: number;
  };
  errors?: Array<{
    step: string;
    error: string;
    timestamp: Timestamp;
  }>;
}

const STATUS_COLORS = {
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_ICONS = {
  queued: '⏳',
  processing: '⚙️',
  completed: '✅',
  failed: '❌',
};

const JOB_TYPE_LABELS: Record<BatchJobType, string> = {
  'weekly-pattern-extraction': '週次パターン抽出',
  'knowledge-maintenance': 'ナレッジメンテナンス',
  'archive-cleanup': 'アーカイブクリーンアップ',
};

const formatTimestamp = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return '-';
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDuration = (start: Timestamp | undefined, end: Timestamp | undefined): string => {
  if (!start || !end) return '-';
  const startDate = start instanceof Date ? start : start.toDate();
  const endDate = end instanceof Date ? end : end.toDate();
  const durationMs = endDate.getTime() - startDate.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const ProgressBar: React.FC<{ percentage: number; status: BatchJobStatus }> = ({ percentage, status }) => {
  const bgColor = status === 'failed' ? 'bg-red-500' : status === 'completed' ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
      <div
        className={`h-full ${bgColor} transition-all duration-300 flex items-center justify-center text-xs text-white font-medium`}
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      >
        {percentage > 10 && `${Math.round(percentage)}%`}
      </div>
    </div>
  );
};

const JobCard: React.FC<{ job: BatchJob }> = ({ job }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/60 dark:bg-black/50 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{STATUS_ICONS[job.status]}</span>
          <div>
            <h3 className="font-semibold text-lg">{JOB_TYPE_LABELS[job.type]}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Job ID: {job.id.slice(0, 8)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[job.status]}`}>
          {job.status.toUpperCase()}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300">{job.progress.currentStep}</span>
          <span className="text-gray-600 dark:text-gray-400">
            {job.progress.current} / {job.progress.total}
          </span>
        </div>
        <ProgressBar percentage={job.progress.percentage} status={job.status} />
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-600 dark:text-gray-400">作成日時</p>
          <p className="font-medium">{formatTimestamp(job.createdAt)}</p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">対象期間</p>
          <p className="font-medium text-xs">
            {formatTimestamp(job.targetPeriod.startDate)} - {formatTimestamp(job.targetPeriod.endDate)}
          </p>
        </div>
        {job.startedAt && (
          <div>
            <p className="text-gray-600 dark:text-gray-400">開始日時</p>
            <p className="font-medium">{formatTimestamp(job.startedAt)}</p>
          </div>
        )}
        {job.completedAt && (
          <div>
            <p className="text-gray-600 dark:text-gray-400">完了日時</p>
            <p className="font-medium">{formatTimestamp(job.completedAt)}</p>
          </div>
        )}
        {job.startedAt && job.completedAt && (
          <div>
            <p className="text-gray-600 dark:text-gray-400">処理時間</p>
            <p className="font-medium">{formatDuration(job.startedAt, job.completedAt)}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {job.result && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-left font-medium mb-2 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <span>処理結果</span>
            <span className="text-xl">{expanded ? '▼' : '▶'}</span>
          </button>

          {expanded && (
            <div className="space-y-3 mt-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400">プロジェクト処理数</p>
                  <p className="text-2xl font-bold">{job.result.projectsProcessed}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400">チャット分析数</p>
                  <p className="text-2xl font-bold">{job.result.chatsAnalyzed}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400">アーカイブ数</p>
                  <p className="text-2xl font-bold">{job.result.knowledgeArchived}</p>
                </div>
              </div>

              {/* Pattern Extraction Details */}
              {job.result.patternsExtracted && (
                <div>
                  <p className="font-medium mb-2">抽出パターン</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(job.result.patternsExtracted).map(([type, count]) => (
                      <div key={type} className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {type === 'vocabulary' && '語彙'}
                          {type === 'structure' && '構造'}
                          {type === 'emphasis' && '強調'}
                          {type === 'tone' && 'トーン'}
                          {type === 'length' && '長さ'}
                        </p>
                        <p className="text-lg font-bold">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Stats */}
              {(job.result.duplicatesFound > 0 || job.result.duplicatesMerged > 0) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                  <p className="font-medium mb-1">重複検出・統合</p>
                  <p className="text-sm">
                    検出: {job.result.duplicatesFound} 件 / 統合: {job.result.duplicatesMerged} 件
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {job.errors && job.errors.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <p className="font-medium text-red-600 dark:text-red-400 mb-2">エラー ({job.errors.length})</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {job.errors.map((error, idx) => (
              <div key={idx} className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">
                <p className="font-medium">{error.step}</p>
                <p className="text-red-700 dark:text-red-300">{error.error}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatTimestamp(error.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ManualTriggerForm: React.FC<{ onTrigger: () => void }> = ({ onTrigger }) => {
  const [jobType, setJobType] = useState<BatchJobType>('weekly-pattern-extraction');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const triggerBatchJob = httpsCallable(functions, 'triggerBatchJob');
      const result = await triggerBatchJob({
        jobType,
        targetPeriod: startDate && endDate ? {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        } : undefined,
      });

      setSuccess(`ジョブが正常にトリガーされました: ${(result.data as any).messageId}`);
      onTrigger();

      // Reset form
      setStartDate('');
      setEndDate('');
    } catch (err: any) {
      setError(err.message || 'ジョブのトリガーに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/60 dark:bg-black/50 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-lg mb-4">バッチジョブを手動実行</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">ジョブタイプ</label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value as BatchJobType)}
            className="w-full bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="weekly-pattern-extraction">週次パターン抽出</option>
            <option value="knowledge-maintenance">ナレッジメンテナンス</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">開始日</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">終了日</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? '実行中...' : 'ジョブを実行'}
        </button>
      </form>

      <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
        ℹ️ 期間を指定しない場合は、デフォルトの期間が使用されます。
      </p>
    </div>
  );
};

export const BatchJobMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state } = useAppContext();

  useEffect(() => {
    // Real-time listener for batch jobs
    const q = query(
      collection(db, 'batchJobs'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as BatchJob[];

        setJobs(jobsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to batch jobs:', err);
        setError('バッチジョブの取得に失敗しました');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    // Trigger will automatically refresh via real-time listener
  };

  const isAdmin = state.user?.customClaims?.role === 'admin';

  if (loading) {
    return (
      <div className="p-8 h-full overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">バッチジョブモニター</h1>
        <p className="text-gray-600 dark:text-gray-400">
          週次パターン抽出とナレッジメンテナンスジョブの進捗を監視します
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Manual Trigger (Admin Only) */}
      {isAdmin && (
        <div className="mb-6">
          <ManualTriggerForm onTrigger={handleRefresh} />
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="bg-white/60 dark:bg-black/50 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              バッチジョブの履歴がありません
            </p>
          </div>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
};
