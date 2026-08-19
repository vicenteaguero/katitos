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

test('the album prints from the real photographs, not the small copies', async ({
  page,
}) => {
  await openFreshBook(page);
  await page.getByRole('button', { name: 'Arrange stickers' }).click();
  await page.getByRole('button', { name: 'Add photos' }).first().click();
  await page.locator('input[type="file"]').setInputFiles([WIDE]);
  await expect(page.getByText('1 of 1 added')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.locator('.pb-strip-item').first().click();
  await expect(page.locator('.pb-editor .pb-sticker-photo')).toHaveCount(1, {
    timeout: 20_000,
  });

  // Reachable only from code, on purpose — it downloads full-size originals,
  // which is the opposite of what the app does the rest of the time.
  const result = await page.evaluate(async () => {
    const w = window as unknown as {
      __albumPdf?: (o: { returnBlob: boolean }) => Promise<Blob>;
    };
    if (!w.__albumPdf) return { missing: true } as const;
    const blob = await w.__albumPdf({ returnBlob: true });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const head = String.fromCharCode(...bytes.slice(0, 8));
    // Count the JPEGs spliced in whole.
    let jpegs = 0;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) jpegs++;
    }
    return {
      missing: false as const,
      type: blob.type,
      size: bytes.length,
      head,
      jpegs,
      // '%PDF-1.4\n' is nine bytes, then the '%' of the binary comment.
      marker: [...bytes.slice(10, 14)],
    };
  });

  expect(result.missing).toBe(false);
  if (result.missing) return;

  expect(result.type).toBe('application/pdf');
  expect(result.head).toBe('%PDF-1.4');
  // The binary marker, as raw bytes rather than their UTF-8 expansion.
  expect(result.marker).toEqual([0xe2, 0xe3, 0xcf, 0xd3]);
  expect(result.jpegs).toBeGreaterThan(0);
  // The stored original is ~42KB; a PDF built from the 512px copies could not
  // be this large, so this is the proof it printed the real photograph.
  expect(result.size).toBeGreaterThan(40_000);
});
