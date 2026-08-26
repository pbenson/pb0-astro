import { test, expect, type Page } from '@playwright/test';

const info = (page: Page) => page.locator('.info');

/**
 * Bin counts, read off each bar's own data-count.
 *
 * Not off the printed labels: those are suppressed for empty bins and on wide
 * boards, so their position in the list is not the bin number — which quietly
 * shifts every index the moment the pile stops touching bin 0.
 */
async function counts(page: Page): Promise<number[]> {
  return page.locator('.quincunx-board rect[data-bin]').evaluateAll((bars) =>
    bars
      .map((bar) => ({
        bin: Number(bar.getAttribute('data-bin')),
        count: Number(bar.getAttribute('data-count')),
      }))
      .sort((a, b) => a.bin - b.bin)
      .map((entry) => entry.count),
  );
}

/** Sample mean of the bins, in bin units. */
const meanOf = (bins: number[]) =>
  bins.reduce((sum, v, k) => sum + v * k, 0) / bins.reduce((sum, v) => sum + v, 0);

async function pickBatch(page: Page, size: string) {
  await page.locator('.controls button', { hasText: new RegExp(`^${size}$`) }).click();
}

test.describe('Quincunx', () => {
  test('starts empty, with the expected bin computed from the controls', async ({ page }) => {
    await page.goto('/math/quincunx');
    await expect(info(page)).toContainText('0 balls dropped');
    // Twelve rows at an even chance: the peak sits over bin 6.
    await expect(info(page)).toContainText('expected bin 6.00');
  });

  test('a large batch lands at once and piles up around the mean', async ({ page }) => {
    await page.goto('/math/quincunx');
    await pickBatch(page, '10,000');
    await page.getByRole('button', { name: /^Drop/ }).click();

    await expect(info(page)).toContainText('10,000 balls dropped');

    const bins = await counts(page);
    expect(bins).toHaveLength(13);
    expect(bins.reduce((sum, v) => sum + v, 0)).toBe(10000);

    // The sample mean must land on n*p. Ten thousand draws put the standard
    // error near 0.017, so a tenth of a bin is a wide margin that still fails
    // if the left/right comparison is ever inverted again.
    const mean = meanOf(bins);
    expect(mean).toBeGreaterThan(5.9);
    expect(mean).toBeLessThan(6.1);
  });

  test('raising the bias moves the pile right, not left', async ({ page }) => {
    await page.goto('/math/quincunx');
    // The defect the sketch carried: a higher chance of going right sent fewer
    // balls right. This is the check that would have caught it.
    const bias = page.getByRole('slider', { name: /Chance of bouncing right/ });
    await bias.fill('0.8');
    await expect(info(page)).toContainText('expected bin 9.60');

    await pickBatch(page, '10,000');
    await page.getByRole('button', { name: /^Drop/ }).click();

    const bins = await counts(page);
    expect(bins).toHaveLength(13);
    const mean = meanOf(bins);
    expect(mean).toBeGreaterThan(9.4);
    expect(mean).toBeLessThan(9.8);
  });

  test('four rows print the row a reader can check by hand', async ({ page }) => {
    await page.goto('/math/quincunx');
    await page.getByRole('slider', { name: /Rows of pins/ }).fill('4');
    await expect(info(page)).toContainText('exact row 1:4:6:4:1');
  });

  test('changing a control clears counts taken under the old one', async ({ page }) => {
    await page.goto('/math/quincunx');
    await pickBatch(page, '1,000');
    await page.getByRole('button', { name: /^Drop/ }).click();
    await expect(info(page)).toContainText('1,000 balls dropped');

    await page.getByRole('slider', { name: /Rows of pins/ }).fill('8');
    await expect(info(page)).toContainText('0 balls dropped');
  });

  test('reset empties the bins', async ({ page }) => {
    await page.goto('/math/quincunx');
    await pickBatch(page, '1,000');
    await page.getByRole('button', { name: /^Drop/ }).click();
    await expect(info(page)).toContainText('1,000 balls dropped');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(info(page)).toContainText('0 balls dropped');
  });

  test('the board carries a label describing what it shows', async ({ page }) => {
    await page.goto('/math/quincunx');
    await expect(
      page.getByRole('img', { name: /Galton board with 12 rows of pins/ }),
    ).toBeVisible();
  });
});
