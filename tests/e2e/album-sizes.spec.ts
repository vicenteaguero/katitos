import { test, expect, devices } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';
const WIDE = 'tests/e2e/fixtures/wide.jpg';
const TALL = 'tests/e2e/fixtures/tall.jpg';
const OUT =
  '/private/tmp/claude-501/-Users-vicenteaguero-dev-katitos/92477ad5-5b64-4604-b038-a92f206a6238/scratchpad';

for (const [name, size] of [
  ['320', { width: 320, height: 568 }],
  ['tablet', { width: 834, height: 1112 }],
] as const) {
  test(`the album fits a ${name} screen`, async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await browser.newContext({
      ...devices['iPhone 13'],
      viewport: size,
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await cleanup(['albums']);
    await page.goto('/album');
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
    await dismissChangelog(page);
    await page.getByRole('button', { name: 'Start a new album' }).click();
    await page.getByLabel('What is it?').fill(`itest fit ${name}`);
    await page.getByRole('button', { name: 'Start it' }).click();
    await expect(page.getByText('Cover')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/F-${name}-cover.png` });

    await page.getByRole('button', { name: 'Arrange stickers' }).click();
    await expect(page.locator('.pb-strip')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Add photos' }).first().click();
    await page
      .locator('input[type="file"]')
      .setInputFiles([WIDE, TALL, WIDE, TALL, WIDE]);
    await expect(page.getByText('5 of 5 added')).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: 'Close' }).last().click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/F-${name}-strip.png` });

    // Nothing may scroll the page sideways, and the arrows must clear the nav.
    const overflow = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
    }));
    expect(overflow.docW).toBeLessThanOrEqual(overflow.winW + 1);

    const [btn, nav] = await Promise.all([
      page.getByRole('button', { name: 'Next page' }).boundingBox(),
      page.getByRole('navigation').boundingBox(),
    ]);
    expect(btn!.y + btn!.height).toBeLessThanOrEqual(nav!.y + 1);

    // Two rows of tiles, whatever the width.
    const rows = await page.evaluate(() => {
      const items = [
        ...document.querySelectorAll('.pb-strip-item'),
      ] as HTMLElement[];
      return new Set(
        items.map((el) => Math.round(el.getBoundingClientRect().top))
      ).size;
    });
    expect(rows).toBe(2);

    expect(errors, errors.join('\n')).toEqual([]);
    await ctx.close();
  });
}
