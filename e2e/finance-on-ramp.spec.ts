import { test, expect } from '@playwright/test';

const FINANCE_PAGES = [
  '/finance/credit-basket',
  '/finance/asset-returns-monte-carlo',
];

test.describe('Finance on-ramp', () => {
  for (const path of FINANCE_PAGES) {
    test(`${path} opens with a plain-English framing`, async ({ page }) => {
      await page.goto(path);
      const framing = page.getByRole('complementary', { name: 'In plain words' });
      await expect(framing).toBeVisible();

      // Above the article, not buried in it: the reader who needs it should
      // meet it before the first equation.
      const framingBox = await framing.boundingBox();
      const firstHeading = await page.locator('h2').first().boundingBox();
      expect(framingBox!.y).toBeLessThan(firstHeading!.y);
    });

    test(`${path} glosses its loaded terms`, async ({ page }) => {
      await page.goto(path);
      const terms = page.locator('button.term');
      expect(await terms.count()).toBeGreaterThan(0);

      const first = terms.first();
      await first.click();
      const note = page.getByRole('note').first();
      await expect(note).toBeVisible();
      // Two sentences of plain English, not a stub.
      expect((await note.innerText()).length).toBeGreaterThan(40);

      await page.keyboard.press('Escape');
      await expect(note).toBeHidden();
    });
  }

  test('a term can be reached and opened from the keyboard alone', async ({ page }) => {
    await page.goto('/finance/credit-basket');
    const term = page.locator('button.term').first();

    await term.focus();
    await expect(term).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('note').first()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('note').first()).toBeHidden();
  });

  test('every gloss is described to assistive technology', async ({ page }) => {
    await page.goto('/finance/asset-returns-monte-carlo');
    for (const term of await page.locator('button.term').all()) {
      const describedBy = await term.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      await expect(page.locator(`#${describedBy}`)).toHaveCount(1);
    }
  });
});
