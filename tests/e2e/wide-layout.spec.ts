import { test, expect } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

// She plans lessons on a laptop or a tablet, so these run at a desk-sized
// viewport rather than the phone one the rest of the suite uses.
test.use({ viewport: { width: 1180, height: 820 } });

test('the dictionary gets a desk to work on, not a phone column', async ({
  page,
}) => {
  await cleanup(['vocab']);
  await page.goto('/language/dictionary');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible({
    timeout: 20_000,
  });
  await dismissChangelog(page);

  // The opt-in is an attribute on <html>; without it the app stays 32rem wide
  // however big the screen is.
  await expect(page.locator('html')).toHaveAttribute('data-desk', '');

  const width = await page
    .locator('main > div')
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(600);
});

test('the phone column comes back when she leaves the course', async ({
  page,
}) => {
  await page.goto('/language/dictionary');
  await expect(page.locator('html')).toHaveAttribute('data-desk', '', {
    timeout: 20_000,
  });
  await dismissChangelog(page);

  // Every other screen must stay the narrow, phone-shaped column it was
  // designed as — the desk is opt-in per route, not a global switch.
  await page.goto('/settings');
  await expect(page.locator('html')).not.toHaveAttribute('data-desk', '', {
    timeout: 10_000,
  });
});
