import { test, expect, type Page } from '@playwright/test';
import {
  cleanup,
  dismissChangelog,
  forgetPhotoSizes,
  photoSizes,
} from './helpers';

const WIDE = 'tests/e2e/fixtures/wide.jpg';
const TALL = 'tests/e2e/fixtures/tall.jpg';

async function openFreshBook(page: Page) {
  await cleanup(['albums']);
  await page.goto('/album');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  await page.getByRole('button', { name: 'Start a new album' }).click();
  await page.getByLabel('What is it?').fill('itest upload');
  // Starting an album opens it.
  await page.getByRole('button', { name: 'Start it' }).click();
  await expect(page.locator('.pb-stage')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Cover')).toBeVisible({ timeout: 20_000 });
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

  // Polled, not read once: the sticker appears the instant you tap and is then
  // replaced by the real row a moment later, so a single `boundingBox()` can
  // land in the gap between the two and come back null.
  // The source is 16:9. A square frame here would mean the photo is being
  // cropped to a square again.
  await expect
    .poll(
      async () => {
        const box = await frame.boundingBox().catch(() => null);
        return box ? box.width / box.height : 0;
      },
      { timeout: 20_000 }
    )
    .toBeGreaterThan(1.4);
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

/**
 * The bug he actually hit: a photo added, and nothing on the page but a sliver.
 *
 * Every picture from before the library has no stored size, and the sticker was
 * given its shape from that size alone — no size, no height, nothing to see.
 * A square is the fallback until the browser reports what it decoded, which it
 * then writes down so the real shape shows from the next look onwards.
 */
test('a photo with no stored size still shows, and learns its shape', async ({
  page,
}) => {
  // Two full reload cycles: an upload, then looking at the book twice.
  test.setTimeout(120_000);
  await openFreshBook(page);
  await page.getByRole('button', { name: 'Arrange stickers' }).click();

  await page.getByRole('button', { name: 'Add photos' }).first().click();
  await page.locator('input[type="file"]').setInputFiles([WIDE]);
  await expect(page.getByText('1 of 1 added')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();

  // The upload sheet closes with an animation; a tap that lands while it is on
  // its way out does nothing at all, and then there is no sticker to measure.
  await expect(page.locator('.pb-strip-item').first()).toBeVisible();
  await expect
    .poll(
      async () => {
        const placed = await page
          .locator('.pb-editor .pb-sticker-photo')
          .count();
        if (placed) return placed;
        await page
          .locator('.pb-strip-item')
          .first()
          .click({ force: true })
          .catch(() => {});
        return page.locator('.pb-editor .pb-sticker-photo').count();
      },
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0);

  await forgetPhotoSizes();
  await reopenArranging(page);

  // Not a sliver: with nothing stored it falls back to a square rather than to
  // nothing at all — which is what "I add a photo and it does not render" was.
  await expect
    .poll(async () => (await shapeOf(page))?.height ?? 0, { timeout: 20_000 })
    .toBeGreaterThan(40);

  // And looking at it is what teaches it its own shape: the browser knows what
  // it decoded, so that goes back to the row. Checked at the source rather than
  // through another reload, which would race the book's own thirty-second cache.
  await expect
    .poll(async () => (await photoSizes()).filter((p) => p.width).length, {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);
  const [size] = (await photoSizes()).filter((p) => p.width);
  expect(size.width! / size.height!).toBeGreaterThan(1.4);
});

/** Reload and get back into edit mode, waiting for the book each time. */
async function reopenArranging(page: Page) {
  // A launch, not a refresh. The book is kept in localStorage between sessions,
  // so without this the app happily re-renders the photo with the size it had
  // BEFORE the test took it away, and proves nothing.
  // Every version of the snapshot, not one named version: the key moves with
  // the shape of what is cached, and a test pinned to `v3` silently stopped
  // clearing anything the moment it became `v4` — after which the book simply
  // re-rendered the size the test had just taken away, and proved nothing.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('katitos:rq-cache:')) localStorage.removeItem(k);
    }
  });
  await page.reload();
  await dismissChangelog(page);
  await expect(page.locator('.pb-stage')).toBeVisible({ timeout: 20_000 });
  // The top-bar action mounts a beat after the book does, so asking "is it
  // visible?" the instant the stage appears answers no — and then nothing ever
  // enters edit mode and there is no page to measure.
  const arrange = page.getByRole('button', { name: 'Arrange stickers' });
  await arrange.waitFor({ state: 'visible', timeout: 20_000 });
  await arrange.click();
  await expect(page.locator('.pb-editor')).toBeVisible({ timeout: 20_000 });
}

async function shapeOf(page: Page) {
  return page
    .locator('.pb-editor .pb-sticker-photo')
    .first()
    .boundingBox()
    .catch(() => null);
}
