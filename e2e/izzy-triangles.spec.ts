import { test, expect } from '@playwright/test';

test.describe('Izzy Triangles', () => {
  test('the count button drives the sketch', async ({ page }) => {
    await page.goto('/math/izzy-triangles');

    // The sketch is idle on load: a canvas, but nothing running.
    await expect(page.locator('canvas')).toHaveCount(1);
    const count = page.getByRole('button', { name: 'Count' });
    await expect(count).toBeEnabled();

    await count.click();
    // Disabled for the duration, so a second run cannot restart the tally.
    await expect(page.getByRole('button', { name: /Counting/ })).toBeDisabled();
  });
});
