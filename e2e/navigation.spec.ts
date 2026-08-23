import { test, expect } from '@playwright/test';

test.describe('Site navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('Interactive explorations in math, puzzles, and visualizations'),
    ).toBeVisible();
    // Whatever is on show, the home page is a grid of cards leading somewhere.
    await expect(page.locator('.card-grid a').first()).toBeVisible();
  });

  test('nav links are present', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    // The section links are behind SHOW_SECTIONS in BaseLayout.
    for (const name of ['Animations', 'Craft', 'Math', 'Puzzles']) {
      await expect(nav.getByRole('link', { name })).toBeVisible();
    }
    await expect(nav.getByRole('link', { name: '...' })).toHaveAttribute('href', '/');
    await expect(nav.getByRole('button', { name: 'Toggle dark mode' })).toBeVisible();
  });

  test('a nav link reaches its section index', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav').getByRole('link', { name: 'Math' }).click();
    await expect(page).toHaveURL(/\/math/);
    // /math is the recreational half of the old Math section; the traveling
    // repairman pages moved to the Operations Research heading.
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
    for (const path of ['/puzzles', '/math', '/games', '/animations', '/craft', '/finance']) {
      await page.goto(path);
      await expect(page.locator('.card-grid a').first()).toBeVisible();
    }
  });

  test('the brand link returns to the home page', async ({ page }) => {
    await page.goto('/puzzles/cipra-loops');
    await page.locator('nav').getByRole('link', { name: '...' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByText('Interactive explorations in math, puzzles, and visualizations'),
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
