import { test, expect } from '@playwright/test';

test.describe('Theme toggle', () => {
  test('defaults to dark mode', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('toggles to light mode and back', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Toggle dark mode' });

    // Start in dark mode
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Click to switch to light
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Click to switch back to dark
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('persists theme choice across navigation', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Toggle dark mode' });

    // Switch to light
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Navigate to another page
    await page.goto('/puzzles');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
