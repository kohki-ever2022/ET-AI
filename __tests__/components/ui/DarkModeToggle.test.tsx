/**
 * DarkModeToggle Component Tests
 *
 * Tests for the DarkModeToggle component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DarkModeToggle, DarkModeSwitch } from '../../../components/ui/DarkModeToggle';

describe('DarkModeToggle Component', () => {
  let mockMatchMedia: jest.Mock;
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset listeners
    listeners = [];

    // Mock matchMedia
    mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners.push(handler);
        }
      }),
      removeEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          listeners = listeners.filter((l) => l !== handler);
        }
      }),
      dispatchEvent: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    window.matchMedia = mockMatchMedia;

    // Clear dark class from document
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render toggle button', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should initialize in light mode by default', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');
    });

    it('should initialize in dark mode when saved in localStorage', () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should initialize in light mode when saved in localStorage', () => {
      localStorage.setItem('theme', 'light');
      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should respect system preference when no saved theme', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: jest.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.push(handler);
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      render(<DarkModeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from light to dark mode', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      // Initially light mode
      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Click to toggle
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should toggle from dark to light mode', () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      // Initially dark mode
      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Click to toggle
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should toggle multiple times', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      // Toggle to dark
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Toggle to light
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Toggle to dark again
      fireEvent.click(button);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Icons', () => {
    it('should show moon icon in light mode', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');

      expect(svg).toBeInTheDocument();
      // Moon icon has specific path
      const path = svg?.querySelector('path');
      expect(path).toHaveAttribute('d', expect.stringContaining('M20.354'));
    });

    it('should show sun icon in dark mode', () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');

      expect(svg).toBeInTheDocument();
      // Sun icon has specific path
      const path = svg?.querySelector('path');
      expect(path).toHaveAttribute('d', expect.stringContaining('M12 3v1'));
    });

    it('should change icon when toggled', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      // Initially moon icon
      let path = button.querySelector('path');
      const moonPath = path?.getAttribute('d');
      expect(moonPath).toContain('M20.354');

      // Toggle to dark mode (sun icon)
      fireEvent.click(button);
      path = button.querySelector('path');
      const sunPath = path?.getAttribute('d');
      expect(sunPath).toContain('M12 3v1');

      // Verify they are different
      expect(sunPath).not.toBe(moonPath);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('should have title attribute', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');
    });

    it('should update aria-label when toggled', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-label', 'ダークモードに切り替え');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-label', 'ライトモードに切り替え');
    });

    it('should be focusable', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('System Preference Changes', () => {
    it('should listen to system color scheme changes', () => {
      render(<DarkModeToggle />);

      // Verify that addEventListener was called
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(listeners.length).toBeGreaterThan(0);
    });

    it('should respond to system preference change when no saved theme', async () => {
      render(<DarkModeToggle />);

      // Simulate system preference change to dark
      const event = {
        matches: true,
        media: '(prefers-color-scheme: dark)',
      } as MediaQueryListEvent;

      listeners.forEach((listener) => listener(event));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should not respond to system preference change when theme is saved', () => {
      localStorage.setItem('theme', 'light');
      render(<DarkModeToggle />);

      // Simulate system preference change to dark
      const event = {
        matches: true,
        media: '(prefers-color-scheme: dark)',
      } as MediaQueryListEvent;

      listeners.forEach((listener) => listener(event));

      // Should remain in light mode because user explicitly saved preference
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerMock = jest.fn();
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: removeEventListenerMock,
        dispatchEvent: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      const { unmount } = render(<DarkModeToggle />);

      unmount();

      expect(removeEventListenerMock).toHaveBeenCalled();
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save dark theme to localStorage', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should save light theme to localStorage', () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(localStorage.getItem('theme')).toBe('light');
    });
  });
});

describe('DarkModeSwitch Component', () => {
  let mockMatchMedia: jest.Mock;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock matchMedia
    mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));

    window.matchMedia = mockMatchMedia;

    // Clear dark class from document
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render switch element', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    it('should initialize in light mode by default', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'false');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should initialize in dark mode when saved in localStorage', () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeSwitch />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should respect system preference when no saved theme', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      render(<DarkModeSwitch />);

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from light to dark mode', async () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      // Initially light mode
      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      // Click to toggle
      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(switchElement).toHaveAttribute('aria-checked', 'true');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');
      });
    });

    it('should toggle from dark to light mode', async () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      // Initially dark mode
      await waitFor(() => {
        expect(switchElement).toHaveAttribute('aria-checked', 'true');
      });

      // Click to toggle
      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(switchElement).toHaveAttribute('aria-checked', 'false');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
      });
    });

    it('should toggle multiple times', async () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      // Toggle to dark
      fireEvent.click(switchElement);
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      // Toggle to light
      fireEvent.click(switchElement);
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });

      // Toggle to dark again
      fireEvent.click(switchElement);
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role switch', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeInTheDocument();
    });

    it('should have aria-checked attribute', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked');
    });

    it('should have aria-label', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', 'ダークモード切り替え');
    });

    it('should update aria-checked when toggled', async () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      expect(switchElement).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(switchElement).toHaveAttribute('aria-checked', 'true');
      });
    });

    it('should be focusable', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      switchElement.focus();
      expect(switchElement).toHaveFocus();
    });
  });

  describe('Visual Styling', () => {
    it('should apply light mode classes when in light mode', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      expect(switchElement).toHaveClass('bg-apple-fill-tertiary-light');
    });

    it('should apply dark mode classes when in dark mode', async () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      await waitFor(() => {
        expect(switchElement).toHaveClass('bg-apple-blue-light');
      });
    });

    it('should have transition classes', () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      expect(switchElement).toHaveClass('transition-colors');
      expect(switchElement).toHaveClass('duration-apple-normal');
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save dark theme to localStorage', async () => {
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
      });
    });

    it('should save light theme to localStorage', async () => {
      localStorage.setItem('theme', 'dark');
      render(<DarkModeSwitch />);
      const switchElement = screen.getByRole('switch');

      await waitFor(() => {
        expect(switchElement).toHaveAttribute('aria-checked', 'true');
      });

      fireEvent.click(switchElement);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light');
      });
    });
  });
});
