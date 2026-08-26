import { test, expect, type Page } from '@playwright/test';

const info = (page: Page) => page.locator('.info');
const firstMove = (page: Page) => page.getByTestId('first-move');

const slider = (page: Page, name: RegExp) => page.getByRole('slider', { name });

const PATH = '/operations-research/capacity-expansion';

test.describe('Capacity expansion', () => {
  test('shows both panels and a first decision', async ({ page }) => {
    await page.goto(PATH);
    await expect(page.locator('.capex-panel svg')).toHaveCount(2);
    await expect(firstMove(page)).toHaveText('8');
    await expect(info(page)).toContainText('the decision settles once you look');
  });

  test('a one-year horizon buys the smallest facility', async ({ page }) => {
    await page.goto(PATH);
    // Nothing beyond year one counts, so capacity that outlives it is waste.
    await slider(page, /Horizon considered/).fill('1');
    await expect(firstMove(page)).toHaveText('1');
    await expect(info(page)).toContainText('1 facility to reach year 1');
  });

  test('the first decision stops changing past the settling horizon', async ({ page }) => {
    await page.goto(PATH);
    const settledAt = Number(
      (await info(page).innerText()).match(/look ([\d.]+) years ahead/)![1],
    );
    expect(settledAt).toBeGreaterThan(0);

    const decisions = new Set<string>();
    for (const horizon of [Math.ceil(settledAt) + 1, 30, 45, 60]) {
      await slider(page, /Horizon considered/).fill(String(horizon));
      decisions.add(await firstMove(page).innerText());
    }
    // Every horizon past the settling point agrees on what to build now.
    expect(decisions.size).toBe(1);
  });

  test('stronger economies of scale never argue for a smaller first build', async ({ page }) => {
    await page.goto(PATH);
    await slider(page, /Horizon considered/).fill('40');

    await slider(page, /Economies of scale/).fill('0.95');
    const weak = Number(await firstMove(page).innerText());

    await slider(page, /Economies of scale/).fill('0.3');
    const strong = Number(await firstMove(page).innerText());

    expect(strong).toBeGreaterThan(weak);
  });

  test('a high discount rate argues for building small', async ({ page }) => {
    await page.goto(PATH);
    await slider(page, /Horizon considered/).fill('40');
    await slider(page, /Economies of scale/).fill('0.95');
    await slider(page, /Discount rate/).fill('0.5');
    await expect(firstMove(page)).toHaveText('1');
  });

  test('bending demand changes how many facilities are needed', async ({ page }) => {
    await page.goto(PATH);
    await slider(page, /Horizon considered/).fill('20');

    await slider(page, /Demand curvature/).fill('0.6');
    const flat = (await info(page).innerText()).match(/(\d+) facilit/)![1];

    await slider(page, /Demand curvature/).fill('1.6');
    const steep = (await info(page).innerText()).match(/(\d+) facilit/)![1];

    expect(Number(steep)).toBeGreaterThan(Number(flat));
  });

  test('both panels describe themselves', async ({ page }) => {
    await page.goto(PATH);
    await expect(
      page.getByRole('img', { name: /Demand rising against a capacity staircase/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: /first facility size chosen/ }),
    ).toBeVisible();
  });
});
