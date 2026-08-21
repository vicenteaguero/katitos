import { test, expect } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';
const OUT =
  '/private/tmp/claude-501/-Users-vicenteaguero-dev-katitos/92477ad5-5b64-4604-b038-a92f206a6238/scratchpad';

const TITLES = [
  ['real', 'itest Georgia & Türkiye 2026'],
  ['short', 'itest Pololini'],
  ['brutal', 'itest Nuestro verano interminable en Capadocia y Tbilisi'],
] as const;

for (const [key, title] of TITLES) {
  test(`the cover holds "${key}"`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await cleanup(['albums']);
    await page.goto('/album');
    await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
    await dismissChangelog(page);
    await page.getByRole('button', { name: 'Start a new album' }).click();
    await page.getByLabel('What is it?').fill(title);
    await page.getByRole('textbox', { name: 'From' }).fill('2026-07-01');
    await page.getByRole('textbox', { name: 'Until' }).fill('2026-08-31');
    await page.getByRole('button', { name: 'Start it' }).click();
    await expect(page.getByText('Cover')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/C-${key}.png` });

    // The title must sit INSIDE the board, not bleed off its top edge.
    const fit = await page.evaluate(() => {
      const cover = document.querySelector('.pb-cover') as HTMLElement | null;
      const text = document.querySelector(
        '.pb-cover-text'
      ) as HTMLElement | null;
      const plate = document.querySelector(
        '.pb-cover-plate'
      ) as HTMLElement | null;
      if (!cover || !text || !plate) return null;
      const c = cover.getBoundingClientRect();
      const t = text.getBoundingClientRect();
      const p = plate.getBoundingClientRect();
      return {
        overTop: c.top - t.top,
        overBottom: t.bottom - c.bottom,
        // how far the text block's centre is from the board's centre
        offCentre: Math.abs((t.top + t.bottom) / 2 - (c.top + c.bottom) / 2),
        coverH: c.height,
        insidePlate: t.top >= p.top - 1 && t.bottom <= p.bottom + 1,
      };
    });
    expect(fit).not.toBeNull();
    expect(fit!.overTop).toBeLessThanOrEqual(0); // nothing above the board
    expect(fit!.overBottom).toBeLessThanOrEqual(0); // nothing below it
    expect(fit!.offCentre).toBeLessThan(fit!.coverH * 0.06); // actually centred
    expect(fit!.insidePlate).toBe(true); // inside the gilt panel
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
