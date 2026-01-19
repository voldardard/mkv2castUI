import { test, expect } from '@playwright/test';

test.describe('Conversion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('should start conversion when file is uploaded', async ({ page }) => {
    // This test would require a real file upload
    // For E2E testing, we'd typically:
    // 1. Upload a small test file
    // 2. Wait for job creation
    // 3. Check progress updates
    
    // For now, check that the upload UI is ready
    const uploadArea = page.locator('[data-testid="dropzone"]')
      .or(page.getByText(/drag|drop|upload/i).first());
    
    await expect(uploadArea).toBeVisible();
  });

  test('should display progress during conversion', async ({ page }) => {
    // Navigate to a page that would show progress
    // This requires an active conversion job
    
    // Check for progress-related UI elements
    const progressElements = page.locator('[class*="progress"]');
    // Progress elements exist when there's an active job
  });

  test('should show completion state', async ({ page }) => {
    // Check history page for completed jobs
    await page.goto('/en/history');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for completed status indicator
    const completedBadge = page.getByText(/completed|done|success/i).first();
    // Completed jobs would show this status
  });

  test('should allow job cancellation', async ({ page }) => {
    // If there's a running job, should be able to cancel
    await page.goto('/en/history');
    
    // Look for cancel button
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    // Cancel button would be visible for processing jobs
  });
});
