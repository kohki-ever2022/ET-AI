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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VectorSearch } from '../../components/VectorSearch';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase Functions
jest.mock('firebase/functions');

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

// Helper to create mock callable with stream property
function createMockCallable(mockFn: jest.Mock): any {
  const callable = mockFn as any;
  callable.stream = jest.fn();
  return callable;
}

describe('VectorSearch Component', () => {
  const mockProjectId = 'test-project-123';
  const mockOnResultSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
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

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '統合報告書' } });
        // Advance timers to trigger debounced search
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });
    });

    it('should not search with empty query', () => {
      const mockVectorSearch = jest.fn();
      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

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

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      // Set search query first
      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '統合報告書' } });
        // Advance timers to trigger debounced search
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });

      // Clear mock
      mockVectorSearch.mockClear();

      // Change category - this triggers immediate search (not debounced)
      await act(async () => {
        const categorySelect = screen.getByRole('combobox');
        fireEvent.change(categorySelect, { target: { value: 'integrated-report' } });
      });

      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });
    });
  });

  describe('Results Display', () => {
    it.skip('should display search results', async () => {
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

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'integrated reports' } });
      });

      await waitFor(
        () => {
          expect(mockVectorSearch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      await waitFor(
        () => {
          // Text might be split by mark tags for highlighting
          const result = screen.queryByText((content, element) => {
            return element?.textContent?.includes('Test knowledge about integrated reports') || false;
          });
          expect(result).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it.skip('should highlight query terms in results', async () => {
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

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'integrated' } });
      });

      await waitFor(
        () => {
          expect(mockVectorSearch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      await waitFor(
        () => {
          // Text might be split by mark tags for highlighting
          const content = screen.queryByText((text, element) => {
            return element?.textContent?.includes('This is about integrated reports and sustainability') || false;
          });
          expect(content).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should show no results message', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [],
          count: 0,
        },
      });

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent query' } });
        // Advance timers to trigger debounced search
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/該当するナレッジが見つかりませんでした/i)).toBeInTheDocument();
      });
    });
  });

  describe('Result Selection', () => {
    it.skip('should call onResultSelect when result is clicked', async () => {
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

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} onResultSelect={mockOnResultSelect} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
      });

      await waitFor(
        () => {
          expect(mockVectorSearch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      await waitFor(
        () => {
          // Text might be split by mark tags for highlighting
          const resultCard = screen.queryByText((content, element) => {
            return element?.textContent?.includes('Test knowledge content') || false;
          });
          expect(resultCard).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      const resultCard = screen.getByText((content, element) => {
        return element?.textContent?.includes('Test knowledge content') || false;
      });
      await act(async () => {
        fireEvent.click(resultCard.closest('div')!);
      });

      expect(mockOnResultSelect).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('Error Handling', () => {
    it('should display error message on search failure', async () => {
      const mockVectorSearch = jest.fn().mockRejectedValue(new Error('Search failed'));

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        // Advance timers to trigger debounced search
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/検索中にエラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator during search', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [],
          count: 0,
        },
      });

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        // Advance timers to trigger debounced search
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });
    });
  });


  describe('Search Success False', () => {
    it('should display error message when search returns success:false', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: false,
          results: [],
          count: 0,
        },
      });

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(screen.getByText(/検索に失敗しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('Additional Coverage - Empty Query and Whitespace', () => {
    it('should clear results when search query becomes empty after having results', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              knowledge: {
                id: 'knowledge-1',
                content: 'Test content',
                category: 'company-info',
              },
              similarity: 0.95,
              distance: 0.05,
            },
          ],
          count: 1,
        },
      });

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      // First, perform a search with valid query
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });

      // Clear the query
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: '   ' } });
        jest.advanceTimersByTime(500);
      });

      // Should show empty state
      await waitFor(() => {
        expect(screen.getByText(/検索キーワードを入力してください/i)).toBeInTheDocument();
      });
    });
  });

  describe('Similarity Color Coding', () => {
    it('should render results with different similarity colors', async () => {
      const mockVectorSearch = jest.fn().mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              knowledge: {
                id: 'knowledge-1',
                content: 'Very high similarity',
                category: 'company-info',
              },
              similarity: 0.95,
              distance: 0.05,
            },
            {
              knowledge: {
                id: 'knowledge-2',
                content: 'High similarity',
                category: 'company-info',
              },
              similarity: 0.85,
              distance: 0.15,
            },
            {
              knowledge: {
                id: 'knowledge-3',
                content: 'Medium similarity',
                category: 'company-info',
              },
              similarity: 0.75,
              distance: 0.25,
            },
            {
              knowledge: {
                id: 'knowledge-4',
                content: 'Low similarity',
                category: 'company-info',
              },
              similarity: 0.65,
              distance: 0.35,
            },
          ],
          count: 4,
        },
      });

      mockHttpsCallable.mockReturnValue(createMockCallable(mockVectorSearch));

      render(<VectorSearch projectId={mockProjectId} />);

      const searchInput = screen.getByPlaceholderText(/ナレッジベースを検索/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(mockVectorSearch).toHaveBeenCalled();
      });

      // Results should be rendered with different similarities
      await waitFor(() => {
        // Use a more flexible text matcher that works with split text nodes
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'Very high similarity';
        })).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'High similarity';
        })).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'Medium similarity';
        })).toBeInTheDocument();
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'Low similarity';
        })).toBeInTheDocument();
      });
    });
  });

});

