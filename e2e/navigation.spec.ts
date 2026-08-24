import { test, expect } from '@playwright/test';

test.describe('Site navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('Problems from work and play, made playable'),
    ).toBeVisible();
    // Whatever is on show, the home page is a grid of cards leading somewhere.
    await expect(page.locator('.card-grid a').first()).toBeVisible();
  });

  test('the nav carries the brand and a GitHub link', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Pete — home' })).toHaveAttribute('href', '/');
    await expect(nav.getByRole('link', { name: 'Pete on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/pbenson/',
    );
    // Section links were removed; the home page's cards are the way in. The
    // theme toggle went too — the theme follows the system setting now.
    await expect(nav.getByRole('link')).toHaveCount(2);
    await expect(nav.getByRole('button')).toHaveCount(0);
  });

  test('the math index is the recreational half of the old section', async ({ page }) => {
    await page.goto('/math');
    // The traveling repairman pages moved to the Operations Research heading.
    await expect(
      page.getByRole('heading', { name: 'Recreational Math', level: 1, exact: true }),
    ).toBeVisible();
  });

  test('the operations research index lists both search-order pages', async ({ page }) => {
    await page.goto('/operations-research');
    await expect(
      page.getByRole('heading', { name: 'Operations Research', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.card-grid a')).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Where to Look First' })).toBeVisible();
  });

  test('every section index renders its cards', async ({ page }) => {
    // No /animations: the section was retired, its two pages archived and
    // Rotating Links moved under Recreational Math.
    for (const path of ['/puzzles', '/math', '/games', '/craft', '/finance']) {
      await page.goto(path);
      await expect(page.locator('.card-grid a').first()).toBeVisible();
    }
  });

  test('the brand link returns to the home page', async ({ page }) => {
    await page.goto('/puzzles/cipra-loops');
    await page.locator('nav').getByRole('link', { name: 'Pete — home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByText('Problems from work and play, made playable'),
    ).toBeVisible();
  });

  test('puzzles index page loads', async ({ page }) => {
    await page.goto('/puzzles');
    await expect(page).toHaveURL(/\/puzzles/);
  });

  test('navigating to cipra-loops works', async ({ page }) => {
    await page.goto('/puzzles/cipra-loops');
    await expect(page.getByRole('heading', { name: 'Cipra Loops' })).toBeVisible();
  });
});
