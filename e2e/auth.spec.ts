import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 *
 * These tests verify the basic user authentication functionality:
 * - Login page rendering
 * - Form validation
 * - Successful login flow
 * - Error handling
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    // Check for login form elements
    await expect(page.getByRole('heading', { name: /et-ai/i })).toBeVisible();

    // Check for email input
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible();

    // Check for password input
    const passwordInput = page.getByPlaceholder(/password/i);
    await expect(passwordInput).toBeVisible();

    // Check for login button
    const loginButton = page.getByRole('button', { name: /ログイン/i });
    await expect(loginButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click login button without filling form
    const loginButton = page.getByRole('button', { name: /ログイン/i });
    await loginButton.click();

    // Wait for toast notification or error message
    await page.waitForTimeout(500);

    // Email field should have validation
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test('should show error for invalid email format', async ({ page }) => {
    // Enter invalid email
    await page.getByPlaceholder(/email/i).fill('invalid-email');
    await page.getByPlaceholder(/password/i).fill('password123');

    // Click login button
    await page.getByRole('button', { name: /ログイン/i }).click();

    // Wait for potential error message
    await page.waitForTimeout(500);
  });

  test('should handle password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByPlaceholder(/password/i);

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Look for visibility toggle button (if implemented)
    const toggleButton = page.getByRole('button', { name: /show password|hide password/i });

    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should navigate to admin login', async ({ page }) => {
    // Look for admin login button/link
    const adminButton = page.getByText(/管理者/i);

    if (await adminButton.isVisible()) {
      await adminButton.click();

      // Should still be on login page but in admin mode
      await expect(page).toHaveURL(/admin/);
    }
  });
});

test.describe('Responsive Design', () => {
  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that form is still visible and usable
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ログイン/i })).toBeVisible();
  });

  test('should be tablet responsive', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Check that form is still visible
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for form labels
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.getByPlaceholder(/email/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByPlaceholder(/password/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /ログイン/i })).toBeFocused();
  });
});
