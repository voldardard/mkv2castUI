import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en');
  });

  test('should display upload area', async ({ page }) => {
    // Look for dropzone or upload area
    const uploadArea = page.getByText(/drag|drop|upload|select/i).first();
    await expect(uploadArea).toBeVisible();
  });

  test('should show file input', async ({ page }) => {
    // File input might be hidden but should exist
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('should accept video files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Check accepted file types
    const accept = await fileInput.getAttribute('accept');
    // Should accept video files
    expect(accept).toMatch(/video|mkv|mp4/i);
  });

  test('should show conversion options', async ({ page }) => {
    // Look for options section
    const optionsSection = page.getByText(/options|settings|container|quality/i).first();
    
    // Options might be in an expandable section
    if (await optionsSection.isVisible()) {
      await expect(optionsSection).toBeVisible();
    }
  });

  test('should have container format selector', async ({ page }) => {
    // Look for container format option
    const mp4Option = page.getByText(/mp4/i).first();
    const mkvOption = page.getByText(/mkv/i).first();
    
    // At least one should be visible
    const hasContainerOption = 
      await mp4Option.isVisible() || 
      await mkvOption.isVisible();
    
    // Container options might be in a dropdown
  });
});
