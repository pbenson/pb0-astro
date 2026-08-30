import { test, expect, type Page } from '@playwright/test';

const rows = (page: Page) => page.locator('.shelf-list li');

test.describe('The shelf', () => {
  test('lists the shelved pages, grouped by section', async ({ page }) => {
    await page.goto('/shelf');
    await expect(page.getByRole('heading', { name: 'The Shelf', level: 1 })).toBeVisible();
    await expect(rows(page)).toHaveCount(2);
    await expect(page.getByRole('link', { name: /Ball That Rolls Downhill/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'FLW Circles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Operations Research' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recreational Math' })).toBeVisible();
  });

  test('carries no thumbnails — that is what being off the front means', async ({ page }) => {
    await page.goto('/shelf');
    await expect(page.locator('.shelf-list img')).toHaveCount(0);
  });

  test('a shelved page is still built and reachable', async ({ page }) => {
    await page.goto('/operations-research/sphere-method');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/math/flw-circles');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('shelved pages appear on no card grid', async ({ page }) => {
    for (const path of ['/', '/math', '/operations-research']) {
      await page.goto(path);
      const hrefs = await page.locator('.card-grid a').evaluateAll((links) =>
        links.map((a) => a.getAttribute('href')),
      );
      expect(hrefs).not.toContain('/operations-research/sphere-method');
      expect(hrefs).not.toContain('/math/flw-circles');
    }
  });

  test('the home page points at the shelf, quietly', async ({ page }) => {
    await page.goto('/');
    const note = page.locator('.shelf-note');
    await expect(note).toContainText('2 pages');
    // Not in the nav: the front of the site is the curated selection.
    await expect(page.locator('nav a[href="/shelf"]')).toHaveCount(0);
    await note.getByRole('link', { name: 'The shelf' }).click();
    await expect(page).toHaveURL(/\/shelf\/?$/);
  });
});
