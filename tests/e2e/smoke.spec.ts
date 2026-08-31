import { test, expect } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

// Every feature's basePath + the core routes. Visiting each must render the
// authed shell with no uncaught exceptions.
const ROUTES = [
  '/',
  '/tree',
  '/know-me',
  '/album',
  '/polaroid',
  '/quizzes',
  '/dates',
  '/georgia',
  '/wall',
  '/connection',
  '/scavenger',
  '/wishlists',
  '/language',
  '/language/dictionary',
  '/language/alphabet',
  '/language/study',
  '/currency',
  '/flowers',
  '/settings',
];

test.describe('smoke — every route renders in the authed shell', () => {
  for (const route of ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto(route);

      // Local dev auto-signs-in → the authed shell renders its bottom nav.
      await expect(page.getByRole('navigation')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.locator('main')).toBeVisible();

      expect(
        errors,
        `Uncaught errors on ${route}:\n${errors.join('\n')}`
      ).toEqual([]);
    });
  }
});

test('chalkboard — write a note and see it on the wall', async ({ page }) => {
  await cleanup(['notes']);
  await page.goto('/wall');
  await expect(page.getByRole('navigation')).toBeVisible({
    timeout: 20_000,
  });

  await dismissChangelog(page);

  const text = `e2e ${Date.now()}`;
  // Adding lives in edit mode now (the header pencil → +), no FAB over the board.
  await page.getByRole('button', { name: 'Edit wall' }).click();

  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByPlaceholder('Write here…').fill(text);
  await page.getByRole('button', { name: 'Add to wall' }).click();

  await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });

  // …and leave the board as we found it.
  await cleanup(['notes']);
});

/**
 * The version row is the one screen element whose failure mode is silence: if
 * the stamp is missing or the fetch is wrong it renders something plausible
 * and reassuring, which is worse than nothing. Pin that a real commit shows.
 */
test('settings — the version row says which commit this is', async ({
  page,
}) => {
  await page.goto('/settings');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  await expect(page.getByText('Version', { exact: true })).toBeVisible();
  // "1.1.0 · fbbc12a · 19 Aug, 07:51" — version, short sha, when.
  await expect(
    page.getByText(/\d+\.\d+\.\d+ · [0-9a-f]{7}\+? · /)
  ).toBeVisible();
  // Same origin, so dev serves its own stamp: it must agree with itself.
  await expect(
    page.getByText(/newest version|not committed|Checking/)
  ).toBeVisible({ timeout: 10_000 });
});
