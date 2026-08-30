import { test, expect } from '@playwright/test';

/** Reads the canvas back as a data URL so a frame can be compared to a later one. */
async function frame(page: import('@playwright/test').Page) {
  return page.locator('.swarm-canvas').evaluate(
    (canvas) => (canvas as HTMLCanvasElement).toDataURL(),
  );
}

/**
 * How many pixels carry ink — anything that is not the flat ground colour.
 *
 * A data-URL comparison alone cannot tell "frozen with a picture on it" from
 * "frozen because it was wiped", and that is exactly the difference between a
 * working pause and a broken one. Counting pixels can.
 */
async function inked(page: import('@playwright/test').Page) {
  return page.locator('.swarm-canvas').evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    // Sample every 40th pixel; the trail is spread over the whole square, so a
    // sample is plenty and reading 518k pixels per call is not.
    const ground = [data[0], data[1], data[2]];
    let count = 0;
    for (let i = 0; i < data.length; i += 4 * 40) {
      if (
        Math.abs(data[i] - ground[0]) > 4 ||
        Math.abs(data[i + 1] - ground[1]) > 4 ||
        Math.abs(data[i + 2] - ground[2]) > 4
      ) {
        ++count;
      }
    }
    return count;
  });
}

test.describe('Swarm', () => {
  test('draws, and keeps drawing', async ({ page }) => {
    await page.goto('/math/swarm');
    const canvas = page.locator('.swarm-canvas');
    await expect(canvas).toBeVisible();

    const first = await frame(page);
    await expect.poll(() => frame(page), { timeout: 5000 }).not.toBe(first);
  });

  test('pause holds the picture rather than erasing it', async ({ page }) => {
    await page.goto('/math/swarm');
    // Enough of a trail that a wipe would be unmistakable. The bar is low on
    // purpose: the opening scatter alone inks ~1300 sampled pixels and the
    // count then climbs only ~140 a second, so a higher threshold is a race
    // against the poll rather than a stronger check. The assertions below are
    // relative, which is where the real strength is.
    await expect.poll(() => inked(page), { timeout: 6000 }).toBeGreaterThan(800);
    const before = await inked(page);

    await page.getByRole('button', { name: 'Pause' }).click();

    // Pausing used to repaint the ground, which left a blank square and made a
    // frame-to-frame comparison pass for the wrong reason. Assert the ink is
    // still there, then that it has stopped changing.
    expect(await inked(page)).toBeGreaterThan(before / 2);
    const paused = await frame(page);
    await expect.poll(() => frame(page), { timeout: 2000 }).toBe(paused);

    await page.getByRole('button', { name: 'Run' }).click();
    await expect.poll(() => frame(page), { timeout: 5000 }).not.toBe(paused);
  });

  test('restart clears the surface and begins again', async ({ page }) => {
    await page.goto('/math/swarm');
    await expect.poll(() => inked(page), { timeout: 6000 }).toBeGreaterThan(800);

    await page.getByRole('button', { name: 'Pause' }).click();
    const busy = await inked(page);
    await page.getByRole('button', { name: 'Restart' }).click();

    // A restart is the one place the surface is meant to be wiped. Poll rather
    // than read once: the wipe happens in an effect, so it lands a render after
    // the click and an immediate read races it.
    await expect.poll(() => inked(page), { timeout: 4000 }).toBeLessThan(busy / 2);
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
