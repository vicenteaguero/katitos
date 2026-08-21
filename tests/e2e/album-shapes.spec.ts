import { test, expect } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';
const WIDE = 'tests/e2e/fixtures/wide.jpg';
const TALL = 'tests/e2e/fixtures/tall.jpg';
const OUT =
  '/private/tmp/claude-501/-Users-vicenteaguero-dev-katitos/92477ad5-5b64-4604-b038-a92f206a6238/scratchpad';

test('every shape and every mount, on a real page', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await cleanup(['albums']);
  await page.goto('/album');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);
  await page.getByRole('button', { name: 'Start a new album' }).click();
  await page.getByLabel('What is it?').fill('Every shape');
  await page.getByRole('button', { name: 'Start it' }).click();
  await expect(page.getByText('Cover')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Arrange stickers' }).click();
  await expect(page.locator('.pb-strip')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Add photos' }).first().click();
  await page
    .locator('input[type="file"]')
    .setInputFiles([WIDE, TALL, WIDE, TALL, WIDE, TALL, WIDE]);
  await expect(page.getByText('7 of 7 added')).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.locator('.pb-strip-item').first()).toBeVisible();

  const SHAPES = [
    'As it is',
    'Soft',
    'Square',
    'Round',
    'Arch',
    'Heart',
    'Torn',
  ];
  const MOUNTS = [
    'Bare',
    'Mounted',
    'Film',
    'Gilt',
    'Taped',
    'Lifted',
    'Taped',
  ];

  for (let i = 0; i < SHAPES.length; i++) {
    await page.locator('.pb-strip-item').nth(i).click({ force: true });
    await page.waitForTimeout(450);
    await page.locator('.pb-editor .pb-sticker').last().tap();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: 'Shape, mount and colour' }).click();
    await page.waitForTimeout(400);
    await page
      .getByRole('button', { name: SHAPES[i], exact: true })
      .scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: SHAPES[i], exact: true }).click();
    await page.waitForTimeout(200);
    const mount = MOUNTS[i % MOUNTS.length];
    await page
      .getByRole('button', { name: mount, exact: true })
      .scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: mount, exact: true }).click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: 'Close' }).last().click();
    await page.waitForTimeout(350);
    // spread them out so nothing hides behind anything
    await page.locator('.pb-editor .pb-sticker').last().tap();
    await page.waitForTimeout(150);
  }

  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/S-all-shapes-editor.png` });

  // Every cut actually reached the page, in order.
  const cuts = await page.evaluate(() =>
    [...document.querySelectorAll('.pb-editor .pb-sticker-photo')].map(
      (el) => [...el.classList].find((c) => c.startsWith('pb-shape-')) ?? '?'
    )
  );
  expect(cuts).toEqual([
    'pb-shape-natural',
    'pb-shape-rounded',
    'pb-shape-square',
    'pb-shape-circle',
    'pb-shape-arch',
    'pb-shape-heart',
    'pb-shape-torn',
  ]);

  // A shaped photo is not a rectangle any more: the two that impose a square
  // must come out square, whatever shape the photograph was.
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('.pb-editor .pb-sticker-photo')].map((el) => {
      const r = el.getBoundingClientRect();
      return r.width / r.height;
    })
  );
  expect(boxes[3]).toBeCloseTo(1, 1); // circle
  expect(boxes[5]).toBeCloseTo(1, 1); // heart
  expect(boxes[4]).toBeCloseTo(0.75, 1); // arch

  // Tape holds the picture, not a corner of empty paper an inch away from it.
  const taped = await page.evaluate(() => {
    const frame = document.querySelector('.pb-fshape-heart.pb-frame-tape');
    if (!frame) return null;
    const strip = getComputedStyle(frame, '::before');
    return strip.left;
  });
  expect(taped).not.toBe('-8px');

  // And how it reads in the book.
  await page.getByRole('button', { name: 'Done arranging' }).click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${OUT}/S-all-shapes-book.png` });

  expect(errors, errors.join('\n')).toEqual([]);
});
