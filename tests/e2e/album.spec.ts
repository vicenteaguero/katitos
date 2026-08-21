import { test, expect, type Page } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

async function openBook(page: Page) {
  await cleanup(['albums']);
  await page.goto('/album');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  // ALWAYS make our own, and open that one. The shelf is no longer empty on a
  // fresh database — it self-heals Pololini into existence — so "click the
  // first spine" opened whatever book happened to be there, with whatever
  // number of pages it happened to have.
  await page.getByRole('button', { name: 'Start a new album' }).click();
  await page.getByLabel('What is it?').fill('itest album');
  await page.getByRole('button', { name: 'Start it' }).click();
  await expect(page.locator('.pb-stage')).toBeVisible({ timeout: 20_000 });
  // Every book opens closed, on its front board.
  await expect(page.getByText('Cover')).toBeVisible({ timeout: 20_000 });
}

test('a book opens on its cover, and the cover turns', async ({ page }) => {
  await openBook(page);
  // A board stands alone: there is no facing page to slide to, so the whole
  // leaf turns.
  await expect(page.locator('.pb-slide-zone')).toHaveCount(0);

  // And a SHUT book is one board, centred — not a two-page binding with a
  // cover lying on half of it and the rest running off the screen.
  // No binding is drawn behind a shut book at all — the cover IS the book.
  await expect(page.locator('.pb-board')).toHaveCount(0);

  const closed = await page.evaluate(() => {
    const cover = document.querySelector('.pb-cover') as HTMLElement | null;
    const stage = document.querySelector('.pb-stage') as HTMLElement | null;
    if (!cover || !stage) return null;
    const c = cover.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    return { left: c.left - s.left, right: s.right - c.right, width: c.width };
  });
  expect(closed).not.toBeNull();
  // Centred: the same amount of nothing either side of it.
  expect(Math.abs(closed!.left - closed!.right)).toBeLessThan(2);
  // And narrower than the spread it opens into.
  expect(closed!.width).toBeLessThan(
    (await page.locator('.pb-track').boundingBox())!.width
  );

  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('1 / 5')).toBeVisible({ timeout: 20_000 });
});

test('the book opens and can be paged through', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await openBook(page);
  await expect(page.locator('.pb-viewport')).toBeVisible();

  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('1 / 5')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('2 / 5')).toBeVisible({ timeout: 20_000 });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the curl is not clipped away by its container', async ({ page }) => {
  await openBook(page);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('1 / 5')).toBeVisible({ timeout: 20_000 });

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

/**
 * The page arrows have to be reachable WHILE arranging.
 *
 * They were disabled in edit mode, and — worse — the strip's height was never
 * taken out of the page's height budget, so the whole row slid down underneath
 * the navigation bar. Putting a photo on the next page was impossible.
 */
test('you can turn the page while arranging', async ({ page }) => {
  await openBook(page);
  await page.getByRole('button', { name: 'Arrange stickers' }).click();
  await expect(page.locator('.pb-strip')).toBeVisible();

  // Arranging always starts on a page, never on a board.
  await expect(page.getByText('1 / 5')).toBeVisible({ timeout: 20_000 });

  const next = page.getByRole('button', { name: 'Next page' });
  await expect(next).toBeEnabled();

  const [btn, nav] = await Promise.all([
    next.boundingBox(),
    page.getByRole('navigation').boundingBox(),
  ]);
  // Entirely clear of the nav bar, not merely on screen.
  expect(btn!.y + btn!.height).toBeLessThanOrEqual(nav!.y);

  await next.click();
  await expect(page.getByText('2 / 5')).toBeVisible();
});
