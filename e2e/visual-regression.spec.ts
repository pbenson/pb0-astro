import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', name: 'home' },
  { path: '/puzzles/cipra-loops', name: 'cipra-loops' },
  { path: '/puzzles/nessies', name: 'nessies' },
  { path: '/math/spiral-circles', name: 'spiral-circles' },
];

test.describe('Visual regression - dark mode', () => {
  for (const { path, name } of pages) {
    test(`${name} dark`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(page).toHaveScreenshot(`${name}-dark.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe('Visual regression - light mode', () => {
  for (const { path, name } of pages) {
    test(`${name} light`, async ({ page }) => {
      await page.goto(path);
      const toggle = page.getByRole('button', { name: 'Toggle dark mode' });
      await toggle.click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      await expect(page).toHaveScreenshot(`${name}-light.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
