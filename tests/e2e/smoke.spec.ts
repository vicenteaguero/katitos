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
