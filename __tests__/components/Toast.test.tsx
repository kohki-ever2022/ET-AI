/**
 * Toast Component Tests
 *
 * Tests for the Toast notification system.
 * Covers:
 * - Toast provider
 * - Toast display
 * - Auto-dismiss functionality
 * - Multiple toast types
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '../../components/ui/Toast';

// Test component that uses the toast hook
const TestComponent = () => {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('success', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showToast('error', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showToast('warning', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showToast('info', 'Info message')}>
        Show Info
      </button>
    </div>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide toast context', () => {
      const { container } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(container).toBeTruthy();
    });
  });

  describe('showToast', () => {
    it('should display success toast', async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        getByText('Show Success').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });

    it('should display error toast', async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        getByText('Show Error').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });

    it('should display warning toast', async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        getByText('Show Warning').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });

    it('should display info toast', async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        getByText('Show Info').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Info message')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss toast after duration', async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        getByText('Show Success').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });

      // Fast-forward time by 5 seconds (default duration)
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('should support multiple toasts', async () => {
      const { getByText } = render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        getByText('Show Success').click();
        getByText('Show Error').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });
  });

  describe('useToast hook error handling', () => {
    it('should throw error when used outside ToastProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      consoleSpy.mockRestore();
    });
  });
});
