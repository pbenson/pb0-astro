import { test, expect } from '@playwright/test';

// The theme has no in-page control: it follows the operating system setting,
// which Playwright emulates with colorScheme.
test.describe('Theme follows the system preference', () => {
  test.describe('when the system prefers dark', () => {
    test.use({ colorScheme: 'dark' });

    test('renders dark', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('stays dark across navigation', async ({ page }) => {
      await page.goto('/');
      await page.goto('/puzzles');
      await expect(page.locator('html')).toHaveClass(/dark/);
    });
  });

  test.describe('when the system prefers light', () => {
    test.use({ colorScheme: 'light' });

    test('renders light', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });

    test('stays light across navigation', async ({ page }) => {
      await page.goto('/');
      await page.goto('/puzzles');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });
  });

  test('follows a change made while the page is open', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('the nav carries no theme control', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').getByRole('button')).toHaveCount(0);
  });
});
