import { test, expect } from '@playwright/test';

test.describe('Nessies puzzle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/puzzles/nessies');
  });

  test('renders the puzzle page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Nessies' })).toBeVisible();
  });

  test('renders SVG tile content', async ({ page }) => {
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible();
  });
});
