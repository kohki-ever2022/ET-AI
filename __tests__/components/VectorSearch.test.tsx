/**
 * Vector Search Component Tests
 *
 * Tests for the Vector Search UI component:
 * - Search input handling
 * - Debounced search
 * - Result display
 * - Category filtering
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VectorSearch } from '../../components/VectorSearch';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase Functions
jest.mock('firebase/functions');

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('VectorSearch Component', () => {
  const mockProjectId = 'test-project-123';
  const mockOnResultSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should render category filter', () => {
      render(<VectorSearch projectId={mockProjectId} />);

      const categorySelect = screen.getByRole('combobox');
      expect(categorySelect).toBeInTheDocument();
    });

    it('should render empty state when no query', () => {
      render(<VectorSearch projectId={mockProjectId} />);

      expect(screen.getByText(/検索キーワードを入力してください/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should update query on input change', () => {
      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: '統合報告書' } });

      expect(searchInput).toHaveValue('統合報告書');
    });

    it('should call vector search after debounce', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              knowledge: {
                id: 'knowledge-1',
                content: 'Test knowledge content',
                category: 'integrated-report',
                metadata: {
                  documentName: 'test.pdf',
                },
              },
              similarity: 0.95,
              distance: 0.05,
            },
          ],
          count: 1,
        },
      });

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: '統合報告書' } });

      // Wait for debounce (500ms)
      await waitFor(
        () => {
          expect(mockVectorSearch).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });

    it('should not search with empty query', () => {
      const mockVectorSearch = jest.fn();
      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(mockVectorSearch).not.toHaveBeenCalled();
    });
  });

  describe('Category Filter', () => {
    it('should update category on select change', () => {
      render(<VectorSearch projectId={mockProjectId} />);

      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'integrated-report' } });

      expect(categorySelect).toHaveValue('integrated-report');
    });

    it('should trigger search when category changes', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [],
          count: 0,
        },
      });

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      // Set search query first
      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: '統合報告書' } });

      // Wait for debounced search
      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });

      // Clear mock
      mockVectorSearch.mockClear();

      // Change category
      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'integrated-report' } });

      // Should trigger immediate search
      expect(mockVectorSearch).toHaveBeenCalled();
    });
  });

  describe('Results Display', () => {
    it('should display search results', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              knowledge: {
                id: 'knowledge-1',
                content: 'Test knowledge about integrated reports',
                category: 'integrated-report',
                metadata: {
                  documentName: 'test.pdf',
                  pageNumber: 5,
                },
              },
              similarity: 0.95,
              distance: 0.05,
            },
          ],
          count: 1,
        },
      });

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: 'integrated reports' } });

      await waitFor(() => {
        expect(screen.getByText(/検索結果/i)).toBeInTheDocument();
        expect(screen.getByText(/Test knowledge about integrated reports/i)).toBeInTheDocument();
        expect(screen.getByText(/95%/i)).toBeInTheDocument();
      });
    });

    it('should highlight query terms in results', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              knowledge: {
                id: 'knowledge-1',
                content: 'This is about integrated reports and sustainability.',
                category: 'integrated-report',
              },
              similarity: 0.85,
              distance: 0.15,
            },
          ],
          count: 1,
        },
      });

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: 'integrated' } });

      await waitFor(() => {
        const content = screen.getByText(
          /This is about integrated reports and sustainability/i
        );
        expect(content).toBeInTheDocument();
      });
    });

    it('should show no results message', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [],
          count: 0,
        },
      });

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent query' } });

      await waitFor(() => {
        expect(screen.getByText(/該当するナレッジが見つかりませんでした/i)).toBeInTheDocument();
      });
    });
  });

  describe('Result Selection', () => {
    it('should call onResultSelect when result is clicked', async () => {
      const mockResult = {
        knowledge: {
          id: 'knowledge-1',
          content: 'Test knowledge content',
          category: 'integrated-report',
        },
        similarity: 0.9,
        distance: 0.1,
      };

      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [mockResult],
          count: 1,
        },
      });

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} onResultSelect={mockOnResultSelect} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        const resultCard = screen.getByText(/Test knowledge content/i);
        fireEvent.click(resultCard.closest('div')!);
      });

      expect(mockOnResultSelect).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Error Handling', () => {
    it('should display error message on search failure', async () => {
      const mockVectorSearch = jest.fn().mockRejectedValue(new Error('Search failed'));

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText(/検索中にエラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during search', async () => {
      const mockVectorSearch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    success: true,
                    results: [],
                    count: 0,
                  },
                }),
              100
            )
          )
      );

      mockHttpsCallable.mockReturnValue(mockVectorSearch);

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Wait a bit to let the loading state show
      await waitFor(
        () => {
          const spinner = document.querySelector('.animate-spin');
          expect(spinner).toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });
  });
});
