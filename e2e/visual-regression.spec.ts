import { test, expect, type Page } from '@playwright/test';

/**
 * Card thumbnails are lazy, so a full-page screenshot can catch them
 * mid-load and make the snapshot flaky. Scroll the page once to trigger every
 * loader, then wait for the images themselves to finish decoding.
 */
async function settleImages(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete));
  await page.waitForTimeout(250);
}

const pages = [
  { path: '/', name: 'home' },
  { path: '/puzzles/cipra-loops', name: 'cipra-loops' },
  { path: '/puzzles/nessies', name: 'nessies' },
  { path: '/math/spiral-circles', name: 'spiral-circles' },
];

test.describe('Visual regression - dark mode', () => {
  test.use({ colorScheme: 'dark' });

  for (const { path, name } of pages) {
    test(`${name} dark`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveClass(/dark/);
      await settleImages(page);
      await expect(page).toHaveScreenshot(`${name}-dark.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe('Visual regression - light mode', () => {
  test.use({ colorScheme: 'light' });

  for (const { path, name } of pages) {
    test(`${name} light`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      await settleImages(page);
      await expect(page).toHaveScreenshot(`${name}-light.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
