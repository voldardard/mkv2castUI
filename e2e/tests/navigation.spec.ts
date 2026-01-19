import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/en');
    
    // Should have a title
    await expect(page).toHaveTitle(/mkv2cast/i);
  });

  test('should redirect root to language page', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to a language-specific page
    await expect(page).toHaveURL(/\/(en|fr|de|es|it)/);
  });

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/en');
    
    // Find and click history link
    const historyLink = page.getByRole('link', { name: /history/i });
    if (await historyLink.isVisible()) {
      await historyLink.click();
      await expect(page).toHaveURL(/\/en\/history/);
    }
  });

  test('should change language', async ({ page }) => {
    await page.goto('/en');
    
    // Find language selector and change to French
    const langSelector = page.getByRole('combobox', { name: /language/i })
      .or(page.getByRole('button', { name: /language|en/i }));
    
    if (await langSelector.isVisible()) {
      await langSelector.click();
      
      const frOption = page.getByRole('option', { name: /français|french|fr/i })
        .or(page.getByText(/français/i));
      
      if (await frOption.isVisible()) {
        await frOption.click();
        await expect(page).toHaveURL(/\/fr/);
      }
    }
  });
});
