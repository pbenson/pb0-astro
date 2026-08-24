import { test, expect } from '@playwright/test';

test.describe('Sphere method', () => {
  test('draws the ball and its touching geometry', async ({ page }) => {
    await page.goto('/operations-research/sphere-method');
    await expect(page.locator('svg[role=img]')).toBeVisible();

    // delta, the touching set and both objective readouts are the state a
    // reader is meant to follow.
    const info = page.locator('.info').first();
    await expect(info).toContainText('δ(x)');
    await expect(info).toContainText('touching set');
    await expect(info).toContainText('best so far');
  });

  test('iterating improves the incumbent and leaves a ball to look at', async ({ page }) => {
    await page.goto('/operations-research/sphere-method');
    const info = page.locator('.info').first();

    const readBest = async () =>
      Number((await info.innerText()).match(/best so far (-?[\d.]+)/)![1]);
    const readDelta = async () =>
      Number((await info.innerText()).match(/δ\(x\) = (-?[\d.]+)/)![1]);

    const before = await readBest();
    for (let i = 0; i < 5; ++i) {
      await page.getByRole('button', { name: 'Iterate' }).click();
    }
    expect(await readBest()).toBeLessThan(before);

    // The descent cycle converges onto the boundary, where the ball has zero
    // radius. Landing on a centred point instead keeps something on screen.
    expect(await readDelta()).toBeGreaterThan(0);
  });

  test('reset returns to the starting point', async ({ page }) => {
    await page.goto('/operations-research/sphere-method');
    const info = page.locator('.info').first();
    const start = await info.innerText();

    await page.getByRole('button', { name: 'Iterate' }).click();
    expect(await info.innerText()).not.toBe(start);

    await page.getByRole('button', { name: 'Reset' }).click();
    expect(await info.innerText()).toBe(start);
  });
});
