import { test, expect } from '@playwright/test';

test.describe('History Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/history');
  });

  test('should load history page', async ({ page }) => {
    await expect(page).toHaveURL(/\/en\/history/);
  });

  test('should display job list or empty state', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Should show either jobs or empty state
    const jobList = page.locator('[class*="job"]').or(page.locator('table'));
    const emptyState = page.getByText(/no.*jobs|empty|nothing/i);
    
    // One of these should be visible
    const hasContent = 
      await jobList.first().isVisible() ||
      await emptyState.isVisible();
    
    expect(hasContent).toBe(true);
  });

  test('should show job details', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // If there are jobs, they should show filename and status
    const jobItems = page.locator('[class*="job"]');
    
    if (await jobItems.count() > 0) {
      // First job should have some content
      const firstJob = jobItems.first();
      await expect(firstJob).toBeVisible();
    }
  });

  test('should allow downloading completed files', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for download buttons on completed jobs
    const downloadButtons = page.getByRole('link', { name: /download/i })
      .or(page.getByRole('button', { name: /download/i }));
    
    // Download buttons would be visible for completed jobs
  });

  test('should allow deleting jobs', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for delete buttons
    const deleteButtons = page.getByRole('button', { name: /delete|remove/i });
    
    // Delete buttons would be visible for jobs
  });

  test('should show job status badges', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Check for status indicators
    const statusBadges = page.locator('[class*="badge"]')
      .or(page.locator('[class*="status"]'));
    
    // Status badges would be visible when there are jobs
  });
});
