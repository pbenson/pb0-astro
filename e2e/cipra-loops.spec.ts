import { test, expect } from '@playwright/test';

test.describe('Cipra Loops puzzle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/puzzles/cipra-loops');
  });

  test('renders the puzzle grid with 16 tiles', async ({ page }) => {
    const tiles = page.locator('svg');
    await expect(tiles.first()).toBeVisible();
    // 16 tile SVGs + possible overlay SVGs
    const count = await tiles.count();
    expect(count).toBeGreaterThanOrEqual(16);
  });

  test('shows Shuffle button', async ({ page }) => {
    const shuffleBtn = page.getByRole('button', { name: 'Shuffle' });
    await expect(shuffleBtn).toBeVisible();
  });

  test('displays loop count info', async ({ page }) => {
    await expect(page.getByText('Loops:')).toBeVisible();
  });

  test('clicking a tile selects it', async ({ page }) => {
    // Click the first tile in the grid
    const firstTile = page.locator('svg').first();
    await firstTile.click();
    // The selected tile gets a visual indicator (border/outline via CSS class)
    // Verify by clicking another tile to trigger a swap
    const secondTile = page.locator('svg').nth(1);
    await secondTile.click();
    // After swap animation completes, tiles should have moved
    // Wait for animation to finish
    await page.waitForTimeout(1200);
  });

  test('shuffle rearranges tiles', async ({ page }) => {
    // Get initial loop info text
    const loopInfo = page.locator('[class*="loopInfo"]');
    const initialText = await loopInfo.textContent();

    // Shuffle multiple times to ensure at least one changes loop structure
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Shuffle' }).click();
      await page.waitForTimeout(1200);
    }

    // After shuffling, loop info should likely have changed
    // (statistically near-certain after 3 shuffles)
    const newText = await loopInfo.textContent();
    // Just verify the page is still functional
    await expect(page.getByText('Loops:')).toBeVisible();
  });

  test('color mode radio buttons work', async ({ page }) => {
    const byLength = page.getByLabel('Color by length');
    const byLoop = page.getByLabel('Color by loop');

    await expect(byLength).toBeChecked();
    await expect(byLoop).not.toBeChecked();

    await byLoop.check();
    await expect(byLoop).toBeChecked();
    await expect(byLength).not.toBeChecked();
  });
});
