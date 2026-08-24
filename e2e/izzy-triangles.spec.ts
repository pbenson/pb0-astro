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

  test('the speed slider starts at its slowest setting', async ({ page }) => {
    await page.goto('/math/izzy-triangles');
    const speed = page.locator('input[type=range]').first();
    await expect(speed).toHaveValue('0');
  });

  test('a full pass runs to the end and re-enables the button', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/math/izzy-triangles');

    // Set before p5's dynamic import can have resolved: the chosen speed is
    // held on the React side, so it must survive being set this early.
    await page.locator('input[type=range]').first().fill('3');

    const button = page.getByRole('button', { name: /Count/ });
    await button.click();
    await expect(button).toHaveText(/Counting… \d+\/64/);

    // A finished run leaves the button ready again, having reached 64/64 —
    // the frame that used to stop the loop before painting its own colouring.
    await expect(button).toBeEnabled({ timeout: 60_000 });
    await expect(button).toHaveText('Count');
  });
});
