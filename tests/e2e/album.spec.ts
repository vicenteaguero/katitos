import { test, expect, type Page } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

async function openBook(page: Page) {
  await cleanup(['albums']);
  await page.goto('/album');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  // A fresh database has an empty shelf, so make a book to open. Creating one
  // stays on the shelf — it appears as a spine you then tap.
  const spines = page.locator('a[href^="/album/"]');
  if ((await spines.count()) === 0) {
    await page.getByRole('button', { name: 'Start a new album' }).click();
    await page.getByLabel('What is it?').fill('itest album');
    await page.getByRole('button', { name: 'Start it' }).click();
  }
  await expect(spines.first()).toBeVisible({ timeout: 20_000 });
  await spines.first().click();
  await expect(page.locator('.pb-stage')).toBeVisible({ timeout: 20_000 });
}

test('the book opens and can be paged through', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await openBook(page);
  await expect(page.locator('.pb-viewport')).toBeVisible();

  await page.getByRole('button', { name: 'Next page' }).click();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the curl is not clipped away by its container', async ({ page }) => {
  await openBook(page);

  const overflow = await page.evaluate(() => {
    const read = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { x: cs.overflowX, y: cs.overflowY };
    };
    return {
      viewport: read('.pb-viewport'),
      host: read('.pb-page-host'),
      page: read('.pb-page'),
    };
  });

  // The leaf itself must never clip — that is what cut the fold off at the top
  // and bottom edges.
  expect(overflow.host?.y).toBe('visible');
  // The paper inside still clips, so a sticker cannot hang off the page.
  expect(overflow.page?.y).toBe('hidden');
  // The viewport clips sideways only (`clip`, or `hidden` on older WebKit).
  expect(['clip', 'hidden']).toContain(overflow.viewport?.x);
});

test('the viewport reserves room above and below the paper', async ({
  page,
}) => {
  await openBook(page);

  const pad = await page.evaluate(() => {
    const el = document.querySelector('.pb-viewport');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      padTop: parseFloat(cs.paddingTop),
      marginTop: parseFloat(cs.marginTop),
    };
  });

  expect(pad!.padTop).toBeGreaterThan(0);
  // …and gives that height straight back, so the halo costs no empty space.
  expect(pad!.marginTop).toBeCloseTo(-pad!.padTop, 1);
});

test('editing shows the photo strip under the book', async ({ page }) => {
  await openBook(page);

  await page.getByRole('button', { name: 'Arrange stickers' }).click();
  // The library strip only appears while editing — there is nothing to drop
  // onto while you are reading.
  await expect(page.locator('.pb-strip')).toBeVisible({ timeout: 10_000 });
  // Scoped to the strip: the top bar has its own "Add photos" button, and both
  // being present is the point.
  await expect(
    page.locator('.pb-strip').getByRole('button', { name: 'Add photos' })
  ).toBeVisible();
});
