import { test, expect } from '@playwright/test';

/** Reads the canvas back as a data URL so a frame can be compared to a later one. */
async function frame(page: import('@playwright/test').Page) {
  return page.locator('.swarm-canvas').evaluate(
    (canvas) => (canvas as HTMLCanvasElement).toDataURL(),
  );
}

test.describe('Swarm', () => {
  test('draws, and keeps drawing', async ({ page }) => {
    await page.goto('/math/swarm');
    const canvas = page.locator('.swarm-canvas');
    await expect(canvas).toBeVisible();

    const first = await frame(page);
    await expect.poll(() => frame(page), { timeout: 5000 }).not.toBe(first);
  });

  test('pause stops the animation and run restarts it', async ({ page }) => {
    await page.goto('/math/swarm');
    await page.getByRole('button', { name: 'Pause' }).click();

    // Two reads a moment apart must match once the loop is cancelled.
    const paused = await frame(page);
    await expect.poll(() => frame(page), { timeout: 2000 }).toBe(paused);

    await page.getByRole('button', { name: 'Run' }).click();
    await expect.poll(() => frame(page), { timeout: 5000 }).not.toBe(paused);
  });

  test('reports how many turns the current k needs to close', async ({ page }) => {
    await page.goto('/math/swarm');
    // The default k = 1.5 is 3/2, so two turns.
    await expect(page.locator('.info')).toContainText('closes after 2 full turns');
  });

  test('switches between the rose and the ellipse', async ({ page }) => {
    await page.goto('/math/swarm');
    await page.getByRole('button', { name: 'Trace an ellipse' }).click();
    await expect(page.locator('.info')).toContainText('ellipse');
    await page.getByRole('button', { name: 'Trace a rose' }).click();
    await expect(page.locator('.info')).toContainText('closes after');
  });

  test('the canvas carries a label describing what is drawn', async ({ page }) => {
    await page.goto('/math/swarm');
    await expect(page.getByRole('img', { name: /chain of 90 particles/ })).toBeVisible();
  });
});
