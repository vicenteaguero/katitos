import { test, expect } from '@playwright/test';

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

      // Local dev auto-signs-in → the authed shell shows the "Katitos" brand.
      await expect(page.getByRole('link', { name: /Katitos/ })).toBeVisible({
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
  await expect(page.getByRole('link', { name: /Katitos/ })).toBeVisible({
    timeout: 20_000,
  });

  const text = `e2e ${Date.now()}`;
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByPlaceholder('te amo…').fill(text);
  await page.getByRole('button', { name: 'Add to wall' }).click();

  await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });
});
