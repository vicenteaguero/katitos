import { test, expect, request, type Page } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/**
 * Rub out the notes previous runs left behind.
 *
 * The wall holds ten, and a test that adds one without removing it eventually
 * fills the board and breaks every later run. Done over the API rather than
 * through the UI because selecting a note is a use-gesture tap, which a
 * synthetic tap does not reliably satisfy.
 */
async function clearE2ENotes() {
  const api = await request.newContext({ baseURL: SUPABASE_URL });
  const auth = await api.post('/auth/v1/token?grant_type=password', {
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    data: { email: 'vicente@katitos.local', password: 'katitos123' },
  });
  if (!auth.ok()) {
    await api.dispose();
    return;
  }
  const { access_token } = await auth.json();
  await api.delete('/rest/v1/chalkboard_notes?body=like.e2e%20*', {
    headers: { apikey: ANON, Authorization: `Bearer ${access_token}` },
  });
  await api.dispose();
}

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
  await clearE2ENotes();
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
  await clearE2ENotes();
});
