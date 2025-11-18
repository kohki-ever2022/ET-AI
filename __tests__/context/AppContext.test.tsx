/**
 * App Context Tests
 *
 * Tests for the global application context.
 * Covers:
 * - App provider
 * - User authentication state
 * - Dark mode state
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock geminiService to avoid ESM issues
jest.mock('../../services/geminiService', () => ({
  callGemini: jest.fn(),
}));

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Simulate no user signed in
    callback(null);
    return jest.fn(); // Unsubscribe function
  }),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
}));

import { AppProvider, useApp } from '../../context/AppContext';

// Test component that uses the app context
const TestComponent = () => {
  const { user, darkMode, toggleDarkMode } = useApp();

  return (
    <div>
      <div data-testid="user-status">{user ? 'Logged in' : 'Not logged in'}</div>
      <div data-testid="dark-mode">{darkMode ? 'Dark' : 'Light'}</div>
      <button onClick={toggleDarkMode}>Toggle Dark Mode</button>
    </div>
  );
};

describe.skip('AppContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('AppProvider', () => {
    it('should render children', () => {
      render(
        <AppProvider>
          <div data-testid="child">Child content</div>
        </AppProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide app context', () => {
      const { container } = render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      expect(container).toBeTruthy();
    });
  });

  describe('User authentication state', () => {
    it('should initialize with no user', () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });

  describe('Dark mode state', () => {
    it('should initialize with light mode by default', () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('Light');
    });

    it('should toggle dark mode', () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      const toggleButton = screen.getByText('Toggle Dark Mode');

      // Initial state
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('Light');

      // Toggle to dark
      toggleButton.click();
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('Dark');

      // Toggle back to light
      toggleButton.click();
      expect(screen.getByTestId('dark-mode')).toHaveTextContent('Light');
    });

    it('should persist dark mode preference in localStorage', () => {
      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      const toggleButton = screen.getByText('Toggle Dark Mode');

      // Toggle to dark
      toggleButton.click();

      // Check localStorage
      expect(localStorage.getItem('darkMode')).toBe('true');

      // Toggle back to light
      toggleButton.click();

      expect(localStorage.getItem('darkMode')).toBe('false');
    });

    it('should load dark mode preference from localStorage', () => {
      // Set dark mode in localStorage before rendering
      localStorage.setItem('darkMode', 'true');

      render(
        <AppProvider>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('Dark');
    });
  });

  describe('useApp hook error handling', () => {
    it('should throw error when used outside AppProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useApp must be used within an AppProvider');

      consoleSpy.mockRestore();
    });
  });
});
