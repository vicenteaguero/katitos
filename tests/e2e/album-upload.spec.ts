import { test, expect, type Page } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

const WIDE = 'tests/e2e/fixtures/wide.jpg';
const TALL = 'tests/e2e/fixtures/tall.jpg';

async function openFreshBook(page: Page) {
  await cleanup(['albums']);
  await page.goto('/album');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  await page.getByRole('button', { name: 'Start a new album' }).click();
  await page.getByLabel('What is it?').fill('itest upload');
  await page.getByRole('button', { name: 'Start it' }).click();

  const spine = page.locator('a[href^="/album/"]').first();
  await expect(spine).toBeVisible({ timeout: 20_000 });
  await spine.click();
  await expect(page.locator('.pb-stage')).toBeVisible({ timeout: 20_000 });
}

test('a pile of photos goes in at once and lands in the strip', async ({
  page,
}) => {
  await openFreshBook(page);
  await page.getByRole('button', { name: 'Arrange stickers' }).click();

  await page.getByRole('button', { name: 'Add photos' }).first().click();
  // Both at once — the whole point of the library is not doing this one at a
  // time.
  await page.locator('input[type="file"]').setInputFiles([WIDE, TALL]);

  await expect(page.getByText('2 of 2 added')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();

  // Both are in the strip under the book, ready to be placed.
  await expect(page.locator('.pb-strip-item img')).toHaveCount(2, {
    timeout: 20_000,
  });
});

test('a placed photo keeps its own shape instead of being cropped square', async ({
  page,
}) => {
  await openFreshBook(page);
  await page.getByRole('button', { name: 'Arrange stickers' }).click();

  await page.getByRole('button', { name: 'Add photos' }).first().click();
  await page.locator('input[type="file"]').setInputFiles([WIDE]);
  await expect(page.getByText('1 of 1 added')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();

  // Tap the thumbnail to drop it on the open page.
  await page.locator('.pb-strip-item').first().click();

  const frame = page.locator('.pb-editor .pb-sticker-photo').first();
  await expect(frame).toBeVisible({ timeout: 20_000 });

  const box = await frame.boundingBox();
  // The source is 16:9. A square frame here would mean the old CSS is still
  // cropping every photo to a square.
  expect(box!.width / box!.height).toBeGreaterThan(1.4);
});

test('the book loads the small copy, not the full-size original', async ({
  page,
}) => {
  // Only what the book actually DISPLAYED: a GET of a signed object. The
  // uploads and the batch-sign call are POSTs and are not interesting here.
  const displayed: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (r.method() === 'GET' && u.includes('/storage/v1/object/sign/album')) {
      displayed.push(u);
    }
  });

  await openFreshBook(page);
  await page.getByRole('button', { name: 'Arrange stickers' }).click();
  await page.getByRole('button', { name: 'Add photos' }).first().click();
  await page.locator('input[type="file"]').setInputFiles([WIDE]);
  await expect(page.getByText('1 of 1 added')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();

  await expect(page.locator('.pb-strip-item img')).toHaveCount(1, {
    timeout: 20_000,
  });

  // Everything the book DISPLAYS comes from the small `thumbs/` copy; the
  // untouched original is only ever fetched by the PDF export. Loading full
  // originals into the book is exactly what used to make it crawl.
  expect(displayed.length).toBeGreaterThan(0);
  expect(displayed.every((u) => u.includes('thumbs'))).toBe(true);
});
