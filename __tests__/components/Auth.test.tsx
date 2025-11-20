/**
 * Auth Component Tests
 *
 * Testing philosophy: Test as user specifications - how users interact with authentication
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Auth } from '../../components/Auth';

// Mock AppContext
const mockDispatch = jest.fn();
jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    dispatch: mockDispatch,
  }),
}));

describe('Auth Component - User Authentication Experience', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  describe('Initial Rendering - Specification: Users should see a login form', () => {
    it('should display the application title and description', () => {
      render(<Auth />);

      expect(screen.getByText('ET AI')).toBeInTheDocument();
      expect(screen.getByText('Ethics & Transparency Engine')).toBeInTheDocument();
    });

    it('should display email and password input fields', () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    it('should display a login button', () => {
      render(<Auth />);

      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveAttribute('type', 'submit');
    });

    it('should display developer quick login options', () => {
      render(<Auth />);

      expect(screen.getByText(/開発者用クイックログイン/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /社員としてログイン/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /管理者としてログイン/i })).toBeInTheDocument();
    });
  });

  describe('User Login Flow - Specification: Users can log in with valid credentials', () => {
    it('should accept user input in email and password fields', () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(/パスワード/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'user@trias.co.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      expect(emailInput.value).toBe('user@trias.co.jp');
      expect(passwordInput.value).toBe('password');
    });

    it('should log in successfully with valid credentials', async () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      fireEvent.change(emailInput, { target: { value: 'user@trias.co.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      // Should show loading state
      expect(screen.getByText(/認証中/i)).toBeInTheDocument();

      // Wait for login to complete
      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: 'LOGIN',
            payload: { email: 'user@trias.co.jp', role: 'employee' },
          });
        },
        { timeout: 2000 }
      );
    });

    it('should log in as admin when using admin email', async () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      fireEvent.change(emailInput, { target: { value: 'admin@trias.co.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: 'LOGIN',
            payload: { email: 'admin@trias.co.jp', role: 'admin' },
          });
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Error Handling - Specification: Users should see errors for invalid credentials', () => {
    it('should show error for invalid domain', async () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      fireEvent.change(emailInput, { target: { value: 'user@gmail.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/無効な資格情報/i)).toBeInTheDocument();
        expect(screen.getByText(/@trias.co.jp/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should not call dispatch
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should show error for wrong password', async () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      fireEvent.change(emailInput, { target: { value: 'user@trias.co.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/無効な資格情報/i)).toBeInTheDocument();
      }, { timeout: 2000 });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should display error with accessible role alert', async () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/無効な資格情報/i);
      }, { timeout: 2000 });
    });

    it('should clear previous errors when attempting new login', async () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      // First attempt with invalid credentials
      fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Second attempt with valid credentials
      fireEvent.change(emailInput, { target: { value: 'user@trias.co.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      // Error should be cleared immediately
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Loading State - Specification: Users should see loading indication during login', () => {
    it('should disable login button during authentication', () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      const loginButton = screen.getByRole('button', { name: /^ログイン$/i });

      fireEvent.change(emailInput, { target: { value: 'user@trias.co.jp' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });
      fireEvent.click(loginButton);

      // Button should be disabled and show loading text
      expect(loginButton).toBeDisabled();
      expect(screen.getByText(/認証中/i)).toBeInTheDocument();
    });

    it('should disable quick login buttons during authentication', async () => {
      render(<Auth />);

      const quickLoginButton = screen.getByRole('button', { name: /社員としてログイン/i });
      fireEvent.click(quickLoginButton);

      // All buttons should be disabled
      const allButtons = screen.getAllByRole('button');
      allButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Quick Login - Specification: Developers can quickly log in for testing', () => {
    it('should log in as employee using quick login', async () => {
      render(<Auth />);

      const employeeButton = screen.getByRole('button', { name: /社員としてログイン/i });
      fireEvent.click(employeeButton);

      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: 'LOGIN',
            payload: { email: 'employee@trias.co.jp', role: 'employee' },
          });
        },
        { timeout: 1000 }
      );
    });

    it('should log in as admin using quick login', async () => {
      render(<Auth />);

      const adminButton = screen.getByRole('button', { name: /管理者としてログイン/i });
      fireEvent.click(adminButton);

      await waitFor(
        () => {
          expect(mockDispatch).toHaveBeenCalledWith({
            type: 'LOGIN',
            payload: { email: 'admin@trias.co.jp', role: 'admin' },
          });
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Form Validation - Specification: Form should require email and password', () => {
    it('should have required attribute on email field', () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      expect(emailInput).toBeRequired();
    });

    it('should have required attribute on password field', () => {
      render(<Auth />);

      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      expect(passwordInput).toBeRequired();
    });

    it('should have email type on email field', () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password type on password field', () => {
      render(<Auth />);

      const passwordInput = screen.getByPlaceholderText(/パスワード/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Accessibility - Specification: Component should be accessible', () => {
    it('should have labels for screen readers', () => {
      render(<Auth />);

      // Labels exist but are sr-only (screen reader only)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード/i)).toBeInTheDocument();
    });

    it('should have proper autocomplete attributes', () => {
      render(<Auth />);

      const emailInput = screen.getByPlaceholderText(/メール/i);
      const passwordInput = screen.getByPlaceholderText(/パスワード/i);

      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });
});
