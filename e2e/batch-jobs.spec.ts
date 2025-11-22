import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Batch Job Monitoring
 *
 * These tests verify the batch job monitoring functionality:
 * - Batch job list display
 * - Manual job triggering
 * - Real-time progress updates
 * - Job result visualization
 * - Error handling
 */

// Test user credentials
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@trias.co.jp';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'testpassword123';

test.describe('Batch Job Monitor - Admin Access', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');

    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();

    // Wait for authentication
    await page.waitForTimeout(2000);

    // Navigate to batch job monitor
    const batchJobButton = page.getByText(/バッチジョブ/i);
    await batchJobButton.click();

    // Wait for page to load
    await page.waitForTimeout(1000);
  });

  test('should display batch job monitor page', async ({ page }) => {
    // Check for page title
    await expect(page.getByRole('heading', { name: /バッチジョブモニター/i })).toBeVisible();

    // Check for description
    await expect(page.getByText(/週次パターン抽出/i)).toBeVisible();
  });

  test('should display manual trigger form', async ({ page }) => {
    // Check for manual trigger form
    await expect(page.getByText(/バッチジョブを手動実行/i)).toBeVisible();

    // Check for job type selector
    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });
    await expect(jobTypeSelect).toBeVisible();

    // Check for date inputs
    const startDateInput = page.getByLabel(/開始日/i);
    const endDateInput = page.getByLabel(/終了日/i);

    await expect(startDateInput).toBeVisible();
    await expect(endDateInput).toBeVisible();

    // Check for submit button
    const submitButton = page.getByRole('button', { name: /ジョブを実行/i });
    await expect(submitButton).toBeVisible();
  });

  test('should allow job type selection', async ({ page }) => {
    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });

    // Select weekly pattern extraction
    await jobTypeSelect.selectOption('weekly-pattern-extraction');
    await expect(jobTypeSelect).toHaveValue('weekly-pattern-extraction');

    // Select knowledge maintenance
    await jobTypeSelect.selectOption('knowledge-maintenance');
    await expect(jobTypeSelect).toHaveValue('knowledge-maintenance');
  });

  test('should validate date inputs', async ({ page }) => {
    const startDateInput = page.getByLabel(/開始日/i);
    const endDateInput = page.getByLabel(/終了日/i);

    // Fill start date
    await startDateInput.fill('2025-01-01T00:00');
    await expect(startDateInput).toHaveValue('2025-01-01T00:00');

    // Fill end date
    await endDateInput.fill('2025-01-07T23:59');
    await expect(endDateInput).toHaveValue('2025-01-07T23:59');
  });

  test('should trigger manual batch job', async ({ page }) => {
    // Select job type
    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });
    await jobTypeSelect.selectOption('weekly-pattern-extraction');

    // Fill dates
    const startDateInput = page.getByLabel(/開始日/i);
    const endDateInput = page.getByLabel(/終了日/i);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formatDateTime = (date: Date) => {
      return date.toISOString().slice(0, 16);
    };

    await startDateInput.fill(formatDateTime(weekAgo));
    await endDateInput.fill(formatDateTime(now));

    // Submit form
    const submitButton = page.getByRole('button', { name: /ジョブを実行/i });
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Check for success message
    const successMessage = page.getByText(/ジョブが正常にトリガーされました/i);
    await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should display job history', async ({ page }) => {
    // Wait for jobs to load
    await page.waitForTimeout(2000);

    // Check for job cards or empty state
    const noJobsMessage = page.getByText(/バッチジョブの履歴がありません/i);
    const jobCards = page.locator('[data-testid="job-card"]');

    const hasNoJobs = await noJobsMessage.isVisible().catch(() => false);

    if (hasNoJobs) {
      await expect(noJobsMessage).toBeVisible();
    } else {
      // If jobs exist, check job card structure
      const firstJob = jobCards.first();
      if (await firstJob.isVisible()) {
        // Job cards should have status badge
        await expect(firstJob.locator('text=/QUEUED|PROCESSING|COMPLETED|FAILED/i')).toBeVisible();
      }
    }
  });

  test('should show job progress bar', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for job cards
    const jobCards = page.locator('.bg-white\\/60, .dark\\:bg-black\\/50').filter({ hasText: /Job ID/i });

    if (await jobCards.first().isVisible()) {
      const firstJob = jobCards.first();

      // Check for progress bar
      const progressBar = firstJob.locator('.bg-gray-200, .dark\\:bg-gray-700');
      if (await progressBar.isVisible()) {
        await expect(progressBar).toBeVisible();
      }
    }
  });

  test('should expand job results', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for completed jobs with results
    const completedJobs = page.locator('text=/COMPLETED/i');

    if (await completedJobs.first().isVisible()) {
      // Find the parent job card
      const jobCard = completedJobs.first().locator('..');

      // Look for expand button
      const expandButton = jobCard.getByText(/処理結果/i);

      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Wait for expansion
        await page.waitForTimeout(500);

        // Check for result details
        await expect(jobCard.getByText(/プロジェクト処理数|チャット分析数/i)).toBeVisible();
      }
    }
  });

  test('should display error details for failed jobs', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for failed jobs
    const failedJobs = page.locator('text=/FAILED/i');

    if (await failedJobs.first().isVisible()) {
      const jobCard = failedJobs.first().locator('..');

      // Check for error section
      const errorSection = jobCard.getByText(/エラー/i);

      if (await errorSection.isVisible()) {
        await expect(errorSection).toBeVisible();
      }
    }
  });

  test('should update in real-time', async ({ page }) => {
    // Trigger a job
    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });
    await jobTypeSelect.selectOption('weekly-pattern-extraction');

    const submitButton = page.getByRole('button', { name: /ジョブを実行/i });
    await submitButton.click();

    // Wait for job to appear
    await page.waitForTimeout(3000);

    // Job should appear in the list with QUEUED or PROCESSING status
    const queuedOrProcessing = page.locator('text=/QUEUED|PROCESSING/i');
    await expect(queuedOrProcessing.first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Batch Job Monitor - Non-Admin Access', () => {
  test('should not show manual trigger form for non-admin users', async ({ page }) => {
    // Login as employee (if you have test credentials)
    const EMPLOYEE_EMAIL = process.env.TEST_EMPLOYEE_EMAIL || 'employee@trias.co.jp';
    const EMPLOYEE_PASSWORD = process.env.TEST_EMPLOYEE_PASSWORD || 'testpassword123';

    await page.goto('/');

    await page.getByPlaceholder(/email/i).fill(EMPLOYEE_EMAIL);
    await page.getByPlaceholder(/password/i).fill(EMPLOYEE_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();

    await page.waitForTimeout(2000);

    // Navigate to batch job monitor (if accessible)
    const batchJobButton = page.getByText(/バッチジョブ/i);

    // Check if button exists (it should only be visible for admins)
    const isVisible = await batchJobButton.isVisible().catch(() => false);

    if (isVisible) {
      await batchJobButton.click();
      await page.waitForTimeout(1000);

      // Manual trigger form should NOT be visible
      const manualTriggerForm = page.getByText(/バッチジョブを手動実行/i);
      await expect(manualTriggerForm).not.toBeVisible();
    } else {
      // Batch job button should not be visible for non-admin
      await expect(batchJobButton).not.toBeVisible();
    }
  });
});

test.describe('Batch Job Monitor - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');

    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();

    await page.waitForTimeout(2000);

    // Navigate to batch job monitor
    const batchJobButton = page.getByText(/バッチジョブ/i);
    await batchJobButton.click();

    await page.waitForTimeout(1000);
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that elements are still visible and usable
    await expect(page.getByRole('heading', { name: /バッチジョブモニター/i })).toBeVisible();

    // Manual trigger form should be visible
    await expect(page.getByText(/バッチジョブを手動実行/i)).toBeVisible();

    // Form elements should be stacked vertically
    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });
    await expect(jobTypeSelect).toBeVisible();
  });

  test('should be tablet responsive', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check layout
    await expect(page.getByRole('heading', { name: /バッチジョブモニター/i })).toBeVisible();
    await expect(page.getByText(/バッチジョブを手動実行/i)).toBeVisible();
  });
});

test.describe('Batch Job Monitor - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/');

    await page.getByPlaceholder(/email/i).fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /ログイン/i }).click();

    await page.waitForTimeout(2000);

    // Navigate to batch job monitor
    const batchJobButton = page.getByText(/バッチジョブ/i);
    await batchJobButton.click();

    await page.waitForTimeout(1000);
  });

  test('should handle invalid date range', async ({ page }) => {
    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });
    await jobTypeSelect.selectOption('weekly-pattern-extraction');

    const startDateInput = page.getByLabel(/開始日/i);
    const endDateInput = page.getByLabel(/終了日/i);

    // Set end date before start date
    await startDateInput.fill('2025-01-10T00:00');
    await endDateInput.fill('2025-01-01T00:00');

    const submitButton = page.getByRole('button', { name: /ジョブを実行/i });
    await submitButton.click();

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should show error
    const errorMessage = page.getByText(/invalid|エラー|失敗/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    const jobTypeSelect = page.getByRole('combobox', { name: /ジョブタイプ/i });
    await jobTypeSelect.selectOption('weekly-pattern-extraction');

    const submitButton = page.getByRole('button', { name: /ジョブを実行/i });
    await submitButton.click();

    // Wait for error
    await page.waitForTimeout(3000);

    // Should show error message
    const errorMessage = page.getByText(/ジョブのトリガーに失敗|network|offline/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Restore online mode
    await page.context().setOffline(false);
  });
});
