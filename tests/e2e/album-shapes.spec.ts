import { test, expect } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

const WIDE = 'tests/e2e/fixtures/wide.jpg';
const OUT =
  '/private/tmp/claude-501/-Users-vicenteaguero-dev-katitos/92477ad5-5b64-4604-b038-a92f206a6238/scratchpad';

const CUTS = [
  ['As it is', 'natural'],
  ['Soft', 'rounded'],
  ['Square', 'square'],
  ['Round', 'circle'],
  ['Arch', 'arch'],
  ['Heart', 'heart'],
  ['Torn', 'torn'],
] as const;

const MOUNTS = ['Bare', 'Card', 'Film', 'Gilt', 'Taped', 'Lifted'] as const;

/**
 * Every cut and every mount, rendered for real.
 *
 * Driven inside the studio on ONE photograph rather than by placing seven and
 * selecting each in turn: the selection dance is a gesture on a small target
 * and it made this spec flaky without testing anything the loop below doesn't.
 */
test('every cut and every mount renders', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await cleanup(['albums']);
  await page.goto('/album');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);
  await page.getByRole('button', { name: 'Start a new album' }).click();
  await page.getByLabel('What is it?').fill('itest every cut');
  await page.getByRole('button', { name: 'Start it' }).click();
  await expect(page.getByText('Cover')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Arrange stickers' }).click();
  await expect(page.locator('.pb-strip')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Add photos' }).first().click();
  await page.locator('input[type="file"]').setInputFiles([WIDE]);
  await expect(page.getByText('1 of 1')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.waitForTimeout(500);
  await page.locator('.pb-strip-item').first().click({ force: true });
  await page.waitForTimeout(800);

  await page.locator('.pb-editor .pb-sticker').last().tap();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Frame and crop' }).click();
  await expect(page.locator('.pb-studio-scrim')).toBeVisible({
    timeout: 20_000,
  });

  const pick = async (name: string) => {
    const b = page.getByRole('button', { name, exact: true });
    await b.scrollIntoViewIfNeeded();
    await b.click();
    await page.waitForTimeout(160);
  };
  const stageCut = () =>
    page.evaluate(() => {
      const el = document.querySelector('.pb-studio-sticker .pb-sticker-photo');
      return el
        ? ([...el.classList].find((c) => c.startsWith('pb-shape-')) ?? '?')
        : '?';
    });

  // ── every cut ──
  await pick('Cut');
  for (const [label, value] of CUTS) {
    await pick(label);
    expect(await stageCut()).toBe(`pb-shape-${value}`);
  }

  // The mount is CONCENTRIC with the cut: a rounded photo must not sit in a
  // square card, which is what a fixed 6px radius gave it.
  await pick('Soft');
  const radius = await page.evaluate(() => {
    const el = document.querySelector('.pb-studio-sticker .pb-sticker-frame');
    return el ? getComputedStyle(el).borderTopLeftRadius : null;
  });
  expect(radius).not.toBe('0px');
  expect(radius).not.toBe('6px');

  // ── every mount ──
  await pick('Mount');
  for (const m of MOUNTS) {
    await pick(m);
    await expect(
      page.locator('.pb-studio-sticker .pb-sticker-frame')
    ).toBeVisible();
  }

  // The card gets wider when you ask it to.
  await pick('Card'); // the mount…
  await pick('Border'); // …and the tab that sets its width
  const band = async () =>
    page.evaluate(() => {
      const el = document.querySelector('.pb-studio-sticker .pb-sticker-frame');
      return el ? parseFloat(getComputedStyle(el).paddingLeft) : 0;
    });
  await pick('Thin');
  const thin = await band();
  await pick('Wide');
  expect(await band()).toBeGreaterThan(thin);

  await page.screenshot({ path: `${OUT}/S-studio-cuts.png` });
  await pick('Done');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/S-applied.png` });

  expect(errors, errors.join('\n')).toEqual([]);
});
