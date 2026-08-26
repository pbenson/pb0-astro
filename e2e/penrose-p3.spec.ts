import { test, expect, type Page } from '@playwright/test';

const figure = (page: Page) => page.locator('.penrose-figure');
const tiles = (page: Page) => figure(page).locator('polygon');

async function setLevel(page: Page, level: number) {
  await page.getByRole('slider', { name: /Inflation level/ }).fill(String(level));
}

test.describe('Penrose P3', () => {
  test('draws the tiling at the level asked for', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    await expect(figure(page)).toBeVisible();
    await expect(tiles(page)).toHaveCount(170); // level 3 by default
  });

  test('every level has the tile count the page tabulates', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    const expected = [5, 20, 60, 170, 470, 1290, 3470];
    for (let level = 0; level < expected.length; ++level) {
      await setLevel(page, level);
      await expect(tiles(page)).toHaveCount(expected[level]);
    }
  });

  test('splits the tiles into thick and thin, and reports the ratio', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    await setLevel(page, 6);

    await expect(figure(page).locator('polygon[data-kind="thick"]')).toHaveCount(2135);
    await expect(figure(page).locator('polygon[data-kind="thin"]')).toHaveCount(1335);
    // 2135 / 1335, closing on phi.
    await expect(page.locator('.info')).toContainText('thick ÷ thin = 1.5993');
    await expect(page.locator('.info')).toContainText('φ = 1.6180');
  });

  test('the first level is five thick tiles and no thin ones', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    await setLevel(page, 0);
    await expect(page.locator('.info')).toContainText('5 tiles');
    await expect(page.locator('.info')).toContainText('0 thin');
    // No ratio to report when the denominator is zero.
    await expect(page.locator('.info')).not.toContainText('thick ÷ thin');
  });

  test('every tile is a quadrilateral', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    await setLevel(page, 2);
    const corners = await tiles(page).evaluateAll((polygons) =>
      polygons.map((p) => (p.getAttribute('points') ?? '').trim().split(/\s+/).length),
    );
    expect(corners).toHaveLength(60);
    expect(new Set(corners)).toEqual(new Set([4]));
  });

  test('fills can be turned off and back on', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    const first = tiles(page).first();
    await expect(first).toHaveAttribute('fill-opacity', '0.55');

    await page.getByRole('button', { name: 'Outlines only' }).click();
    await expect(first).toHaveAttribute('fill-opacity', '0');

    await page.getByRole('button', { name: 'Fill the tiles' }).click();
    await expect(first).toHaveAttribute('fill-opacity', '0.55');
  });

  test('the figure carries a label describing what it shows', async ({ page }) => {
    await page.goto('/math/penrose-p3');
    await expect(
      page.getByRole('img', { name: /Penrose rhombus tiling at inflation level 3/ }),
    ).toBeVisible();
  });
});
