import { test, expect, type Page } from '@playwright/test';

/**
 * Get the "What's new" modal out of the way.
 *
 * It re-arms itself on every release — that is the point of it — so any test
 * that clicks something would otherwise start failing the moment a changelog
 * entry is written, which is exactly what happened.
 */
async function dismissChangelog(page: Page) {
  const showMe = page.getByRole('button', { name: 'Show me' });
  if (await showMe.isVisible().catch(() => false)) {
    await showMe.click();
    await expect(showMe).toBeHidden();
  }
}

// Every feature's basePath + the core routes. Visiting each must render the
// authed shell with no uncaught exceptions.
const ROUTES = [
  '/',
  '/tree',
  '/know-me',
  '/album',
  '/polaroid',
  '/countdowns',
  '/quizzes',
  '/dates',
  '/georgia',
  '/wall',
  '/connection',
  '/games',
  '/scavenger',
  '/wishlists',
  '/language',
  '/language/dictionary',
  '/language/alphabet',
  '/language/study',
  '/together',
  '/distance',
  '/timezone',
  '/currency',
  '/flowers',
  '/fights',
  '/punito',
  '/decisions',
  '/names',
  '/words',
  '/ideas',
  '/finance',
  '/travel',
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
  await page.goto('/wall');
  await expect(page.getByRole('navigation')).toBeVisible({
    timeout: 20_000,
  });

  await dismissChangelog(page);

  const text = `e2e ${Date.now()}`;
  // Adding lives in edit mode now (the header pencil → +), no FAB over the board.
  await page.getByRole('button', { name: 'Edit wall' }).click();

  // The wall holds max 3 notes — clear my own first to guarantee room to add.
  const del = page.getByRole('button', { name: 'Delete note' });
  for (let n = await del.count(); n > 0; n--) {
    await del.first().click();
    await expect(del).toHaveCount(n - 1, { timeout: 10_000 });
  }

  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByPlaceholder('Write here…').fill(text);
  await page.getByRole('button', { name: 'Add to wall' }).click();

  await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });
});
