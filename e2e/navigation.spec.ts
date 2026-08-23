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
    await expect(page.getByRole('heading', { name: 'Math', level: 1 })).toBeVisible();
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
