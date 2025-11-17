/**
 * Vector Search Component
 *
 * Provides semantic search with:
 * - Real-time search results
 * - Similarity score display
 * - Result highlighting
 * - Category filtering
 * - Apple HIG design compliance
 */

import React, { useState, useCallback, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { debounce } from 'lodash';

interface SearchResult {
  knowledge: {
    id: string;
    content: string;
    category?: string;
    metadata?: {
      documentName?: string;
      pageNumber?: number;
      chunkIndex?: number;
    };
    createdAt: Date;
  };
  similarity: number;
  distance: number;
}

interface VectorSearchProps {
  projectId: string;
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  limit?: number;
  threshold?: number;
}

const CATEGORIES = [
  { value: '', label: 'すべて' },
  { value: 'integrated-report', label: '統合報告書' },
  { value: 'shareholder-letter', label: '株主通信' },
  { value: 'sustainability-report', label: 'サステナビリティ報告書' },
  { value: 'financial-results', label: '決算資料' },
  { value: 'other', label: 'その他' },
];

export const VectorSearch: React.FC<VectorSearchProps> = ({
  projectId,
  onResultSelect,
  placeholder = 'ナレッジベースを検索...',
  limit = 10,
  threshold = 0.7,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const functions = getFunctions();

  /**
   * Performs vector search
   */
  const performSearch = useCallback(
    async (searchQuery: string, searchCategory: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const vectorSearch = httpsCallable(functions, 'vectorSearch');

        const response = await vectorSearch({
          projectId,
          queryText: searchQuery,
          limit,
          threshold,
          category: searchCategory || undefined,
        });

        const data = response.data as {
          success: boolean;
          results: SearchResult[];
          count: number;
        };

        if (data.success) {
          setResults(data.results);
        } else {
          setError('検索に失敗しました。');
        }
      } catch (err) {
        console.error('Search error:', err);
        setError('検索中にエラーが発生しました。');
      } finally {
        setIsSearching(false);
      }
    },
    [projectId, limit, threshold, functions]
  );

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, searchCategory: string) => {
      performSearch(searchQuery, searchCategory);
    }, 500),
    [performSearch]
  );

  /**
   * Handle query change
   */
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      debouncedSearch(newQuery, category);
    },
    [category, debouncedSearch]
  );

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCategory = e.target.value;
      setCategory(newCategory);

      if (query.trim()) {
        performSearch(query, newCategory);
      }
    },
    [query, performSearch]
  );

  /**
   * Handle result click
   */
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultSelect?.(result);
    },
    [onResultSelect]
  );

  /**
   * Get similarity color
   */
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600';
    if (similarity >= 0.8) return 'text-blue-600';
    if (similarity >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  /**
   * Highlight query terms in text
   */
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const queryTerms = query.toLowerCase().split(/\s+/);
    const words = text.split(/(\s+)/);

    return words.map((word, index) => {
      const isMatch = queryTerms.some((term) => word.toLowerCase().includes(term));

      if (isMatch) {
        return (
          <mark key={index} className="bg-yellow-200">
            {word}
          </mark>
        );
      }

      return word;
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="space-y-4">
        {/* Search Box */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder={placeholder}
            className="
              w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-base
              focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
            "
          />

          {isSearching && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">カテゴリ:</label>
          <select
            value={category}
            onChange={handleCategoryChange}
            className="
              rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm
              focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
            "
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              検索結果 ({results.length}件)
            </h3>
            <p className="text-xs text-gray-500">類似度順</p>
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.knowledge.id}
            onClick={() => handleResultClick(result)}
            className="
              cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm
              transition-all hover:border-blue-300 hover:shadow-md
            "
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {result.knowledge.metadata?.documentName && (
                    <p className="text-sm font-medium text-gray-900">
                      {result.knowledge.metadata.documentName}
                      {result.knowledge.metadata.pageNumber && (
                        <span className="ml-2 text-gray-500">
                          (Page {result.knowledge.metadata.pageNumber})
                        </span>
                      )}
                    </p>
                  )}

                  {result.knowledge.category && (
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      {CATEGORIES.find((c) => c.value === result.knowledge.category)?.label ||
                        result.knowledge.category}
                    </span>
                  )}
                </div>

                {/* Similarity Score */}
                <div className="ml-4 text-right">
                  <p className={`text-lg font-bold ${getSimilarityColor(result.similarity)}`}>
                    {(result.similarity * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">類似度</p>
                </div>
              </div>

              {/* Content */}
              <div className="text-sm text-gray-700 line-clamp-3">
                {highlightText(result.knowledge.content, query)}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <p>ID: {result.knowledge.id.substring(0, 8)}...</p>
                <p>Distance: {result.distance.toFixed(3)}</p>
              </div>
            </div>
          </div>
        ))}

        {/* No Results */}
        {query.trim() && results.length === 0 && !isSearching && !error && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">該当するナレッジが見つかりませんでした。</p>
            <p className="mt-2 text-sm text-gray-500">
              別のキーワードで検索するか、閾値を下げてみてください。
            </p>
          </div>
        )}

        {/* Empty State */}
        {!query.trim() && results.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">検索キーワードを入力してください。</p>
          </div>
        )}
      </div>
    </div>
  );
};
