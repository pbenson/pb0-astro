import { test, expect } from '@playwright/test';

const message = (page: import('@playwright/test').Page) => page.locator('.ormat-message');

test.describe('Ormat game', () => {
  test('offers the six overlays and a template', async ({ page }) => {
    await page.goto('/puzzles/ormat');
    await expect(page.locator('.ormat-overlay')).toHaveCount(6);
    await expect(message(page)).toContainText('coloured squares');
  });

  test('playing the revealed answer is judged minimal', async ({ page }) => {
    await page.goto('/puzzles/ormat');
    await page.getByRole('button', { name: 'Show me' }).click();

    const reveal = await page.locator('.info').first().innerText();
    const letters = reveal.match(/: ([a-f](?: \+ [a-f])*)/)![1].split(' + ');

    await page.getByRole('button', { name: 'Clear' }).click();
    for (const letter of letters) {
      await page.locator('.ormat-overlay', { hasText: new RegExp(`^${letter}$`) }).click();
    }

    await expect(message(page)).toContainText('Minimal');
    // The wager: $3 for a correct cover, $1 an overlay.
    await expect(message(page)).toContainText(`pay $${letters.length}`);
  });

  test('a spill onto a blank square is called out', async ({ page }) => {
    await page.goto('/puzzles/ormat');
    // Six overlays between them light every cell, so on any template short of
    // the full grid at least one dot must land on a blank.
    for (const letter of ['a', 'b', 'c', 'd', 'e', 'f']) {
      await page.locator('.ormat-overlay', { hasText: new RegExp(`^${letter}$`) }).click();
    }
    await expect(message(page)).toContainText('blank square');
  });

  test('claiming no solution on a coverable template is refused', async ({ page }) => {
    await page.goto('/puzzles/ormat');
    // The opening template is coverable by construction.
    await page.getByRole('button', { name: 'No solution' }).click();
    await expect(message(page)).toContainText('can be covered');
  });

  test('overlays toggle and report their pressed state', async ({ page }) => {
    await page.goto('/puzzles/ormat');
    const first = page.locator('.ormat-overlay').first();
    await expect(first).toHaveAttribute('aria-pressed', 'false');
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await first.click();
    await expect(first).toHaveAttribute('aria-pressed', 'false');
  });
});
