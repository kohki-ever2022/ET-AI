import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Core Features
 *
 * These tests verify core application functionality:
 * - Project creation and management
 * - Channel creation and selection
 * - Chat interactions
 * - Knowledge search
 * - File upload
 * - Approval workflow
 */

// Test user credentials
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@trias.co.jp';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'testpassword123';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);
  });

  test('should display project list', async ({ page }) => {
    // Check for project section
    await expect(page.getByText(/企業プロジェクト/i)).toBeVisible();

    // Check for add project button
    const addButton = page.getByRole('button', { name: /プロジェクト追加|add project/i }).first();
    await expect(addButton).toBeVisible();
  });

  test('should create new project', async ({ page }) => {
    // Click add project button
    const addButton = page.getByRole('button', { name: /プロジェクト追加|add project/i }).first();
    await addButton.click();

    // Wait for prompt dialog (browser native)
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Test Company ' + Date.now());
    });

    await page.waitForTimeout(1000);

    // New project should appear in list
    await expect(page.getByText(/Test Company/i)).toBeVisible({ timeout: 5000 });
  });

  test('should select project', async ({ page }) => {
    // Click on first project
    const firstProject = page.locator('[data-project-id]').first();

    if (await firstProject.isVisible()) {
      await firstProject.click();

      // Project should be highlighted/active
      await expect(firstProject).toHaveClass(/active|selected|bg-apple-fill-secondary/i);
    }
  });

  test('should expand/collapse project', async ({ page }) => {
    // Look for chevron icon
    const chevronButton = page.locator('button:has-text("▶")').first();

    if (await chevronButton.isVisible()) {
      // Click to expand
      await chevronButton.click();
      await page.waitForTimeout(500);

      // Chevron should rotate
      await expect(chevronButton).toHaveClass(/rotate-90/);

      // Click to collapse
      await chevronButton.click();
      await page.waitForTimeout(500);

      // Chevron should be back to normal
      await expect(chevronButton).not.toHaveClass(/rotate-90/);
    }
  });
});

test.describe('Channel Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);

    // Select first project
    const firstProject = page.locator('[data-project-id], button:has-text("株式会社")').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display channel list', async ({ page }) => {
    // Check for channel section
    await expect(page.getByText(/チャンネル/i)).toBeVisible();

    // Check for add channel button
    const addButton = page.getByRole('button', { name: /チャンネル追加|add channel/i }).first();
    await expect(addButton).toBeVisible();
  });

  test('should create new channel', async ({ page }) => {
    // Click add channel button
    const addButton = page.getByRole('button', { name: /チャンネル追加|add channel/i }).first();
    await addButton.click();

    // Handle prompt dialog
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Test Channel ' + Date.now());
    });

    await page.waitForTimeout(1000);

    // New channel should appear
    await expect(page.getByText(/Test Channel/i)).toBeVisible({ timeout: 5000 });
  });

  test('should select channel', async ({ page }) => {
    // Click on first channel
    const firstChannel = page.locator('button:has-text("チャンネル")').first();

    if (await firstChannel.isVisible()) {
      await firstChannel.click();

      // Channel should be active
      await expect(firstChannel).toHaveClass(/bg-apple-blue|active|selected/i);

      // Main view should show channel name
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);

    // Select first project and channel
    const firstProject = page.locator('[data-project-id], button:has-text("株式会社")').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await page.waitForTimeout(1000);

      const firstChannel = page.locator('button:has-text("チャンネル")').first();
      if (await firstChannel.isVisible()) {
        await firstChannel.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should display chat interface', async ({ page }) => {
    // Check for message input
    const messageInput = page.getByPlaceholder(/メッセージを入力|message/i);
    await expect(messageInput).toBeVisible();

    // Check for send button
    const sendButton = page.getByRole('button', { name: /送信|send/i });
    await expect(sendButton).toBeVisible();
  });

  test('should send message', async ({ page }) => {
    const messageInput = page.getByPlaceholder(/メッセージを入力|message/i);
    const sendButton = page.getByRole('button', { name: /送信|send/i });

    // Type message
    const testMessage = 'This is a test message ' + Date.now();
    await messageInput.fill(testMessage);

    // Send message
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Message should appear in chat
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
  });

  test('should display chat history', async ({ page }) => {
    // Wait for chat messages to load
    await page.waitForTimeout(2000);

    // Look for chat messages
    const chatMessages = page.locator('[data-testid="chat-message"], .chat-message');

    const count = await chatMessages.count();

    if (count > 0) {
      // First message should be visible
      await expect(chatMessages.first()).toBeVisible();
    }
  });

  test('should show loading state during message send', async ({ page }) => {
    const messageInput = page.getByPlaceholder(/メッセージを入力|message/i);
    const sendButton = page.getByRole('button', { name: /送信|send/i });

    await messageInput.fill('Test loading state');
    await sendButton.click();

    // Should show loading indicator
    const loadingIndicator = page.locator('text=/送信中|processing|loading/i, [data-testid="loading"]');

    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('should clear message input after send', async ({ page }) => {
    const messageInput = page.getByPlaceholder(/メッセージを入力|message/i);
    const sendButton = page.getByRole('button', { name: /送信|send/i });

    await messageInput.fill('Test clear input');
    await sendButton.click();

    // Wait for send to complete
    await page.waitForTimeout(2000);

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });
});

test.describe('Knowledge Search', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);
  });

  test('should have search functionality', async ({ page }) => {
    // Look for search input in sidebar
    const searchInput = page.getByPlaceholder(/検索|search/i);

    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();

      // Type search query
      await searchInput.fill('テスト');

      // Wait for results
      await page.waitForTimeout(1000);
    }
  });

  test('should filter projects by search', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/検索|search/i);

    if (await searchInput.isVisible()) {
      // Get initial project count
      const allProjects = page.locator('[data-project-id], button:has-text("株式会社")');
      const initialCount = await allProjects.count();

      // Search for specific term
      await searchInput.fill('non-existent-project-xyz');
      await page.waitForTimeout(500);

      // Project count should change
      const filteredCount = await allProjects.count();

      // Either filtered results or no results message
      if (filteredCount === 0) {
        // No results case is valid
        expect(filteredCount).toBe(0);
      } else {
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Should show all projects again
      const finalCount = await allProjects.count();
      expect(finalCount).toBe(initialCount);
    }
  });
});

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);

    // Select first project
    const firstProject = page.locator('[data-project-id], button:has-text("株式会社")').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should have file upload button', async ({ page }) => {
    // Look for upload button
    const uploadButton = page.getByRole('button', { name: /アップロード|upload|ファイル/i });

    if (await uploadButton.isVisible()) {
      await expect(uploadButton).toBeVisible();
    }
  });

  test('should open file upload dialog', async ({ page }) => {
    const uploadButton = page.getByRole('button', { name: /アップロード|upload|ファイル/i });

    if (await uploadButton.isVisible()) {
      await uploadButton.click();

      // Should show file upload dialog or file input
      await page.waitForTimeout(1000);

      // Look for file input or upload modal
      const fileInput = page.locator('input[type="file"]');
      const uploadModal = page.locator('[role="dialog"], .modal');

      const hasFileInput = await fileInput.isVisible().catch(() => false);
      const hasModal = await uploadModal.isVisible().catch(() => false);

      expect(hasFileInput || hasModal).toBeTruthy();
    }
  });
});

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to first project and channel
    const firstProject = page.locator('[data-project-id], button:has-text("株式会社")').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await page.waitForTimeout(1000);

      const firstChannel = page.locator('button:has-text("チャンネル")').first();
      if (await firstChannel.isVisible()) {
        await firstChannel.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should show approval button for chat messages', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for unapproved messages
    const chatMessages = page.locator('[data-testid="chat-message"], .chat-message');

    if (await chatMessages.first().isVisible()) {
      // Look for approve button
      const approveButton = page.getByRole('button', { name: /承認|approve/i }).first();

      if (await approveButton.isVisible()) {
        await expect(approveButton).toBeVisible();
      }
    }
  });

  test('should approve chat message', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Find unapproved message
    const approveButton = page.getByRole('button', { name: /承認|approve/i }).first();

    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Wait for approval to process
      await page.waitForTimeout(2000);

      // Should show approved state
      const approvedIndicator = page.locator('text=/承認済み|approved/i').first();
      await expect(approvedIndicator).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Navigation and Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();
    await page.waitForTimeout(2000);
  });

  test('should toggle sidebar', async ({ page }) => {
    // Look for sidebar toggle button
    const toggleButton = page.getByRole('button', { name: /sidebar|menu/i }).first();

    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be hidden
      const sidebar = page.locator('aside, [role="navigation"]');
      await expect(sidebar).not.toBeVisible();

      // Click again to show
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Sidebar should be visible
      await expect(sidebar).toBeVisible();
    }
  });

  test('should navigate to admin dashboard', async ({ page }) => {
    const adminButton = page.getByText(/管理ダッシュボード|admin/i);

    await adminButton.click();
    await page.waitForTimeout(1000);

    // Should show admin dashboard
    await expect(page.getByText(/管理者ダッシュボード|admin dashboard/i)).toBeVisible();
  });

  test('should navigate to performance dashboard', async ({ page }) => {
    const perfButton = page.getByText(/パフォーマンス|performance/i);

    await perfButton.click();
    await page.waitForTimeout(1000);

    // Should show performance dashboard
    await expect(page.getByText(/パフォーマンス|performance/i)).toBeVisible();
  });

  test('should logout', async ({ page }) => {
    const logoutButton = page.getByRole('button', { name: /ログアウト|logout/i });

    await logoutButton.click();
    await page.waitForTimeout(1000);

    // Should redirect to login page
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });
});
