import { test, expect, type Page } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

async function open(page: Page, route: string) {
  await cleanup(['courses', 'vocab']);
  await page.goto(route);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);
}

test('the alphabet is there, and a letter opens', async ({ page }) => {
  await open(page, '/language/alphabet');

  // Seeded by the migration, not by seed.sql — the whole point being that it is
  // never empty on the real app.
  await expect(page.getByRole('button', { name: /^Аа/ })).toBeVisible();
  await page.getByRole('button', { name: /^Яя/ }).click();
  await expect(page.getByText('Say it for him')).toBeVisible();
});

test('a word can be added to the dictionary and found again', async ({
  page,
}) => {
  await open(page, '/language/dictionary');

  const word = `итест${Date.now() % 100000}`;
  await page.getByRole('button', { name: 'New word' }).click();
  await page.getByLabel('In Russian').fill(word);
  await page.getByLabel('English').fill('a test word');
  await page.getByRole('button', { name: 'Add to the dictionary' }).click();

  await expect(page.getByText(word)).toBeVisible({ timeout: 10_000 });

  await page.getByPlaceholder('Look for a word').fill(word);
  await expect(page.getByText('a test word')).toBeVisible({ timeout: 10_000 });
});

test('a course, a unit and a lesson can be built and opened', async ({
  page,
}) => {
  await open(page, '/language');

  const title = `itest ${Date.now() % 100000}`;
  await page.getByRole('button', { name: 'New course' }).click();
  await page.getByLabel('Called').fill(title);
  await page.getByRole('button', { name: 'Create' }).click();

  // Lands on the new course.
  await expect(
    page.getByRole('heading', { name: new RegExp(title) })
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'New unit' }).click();
  await page.getByLabel('Called').fill('itest unit');
  await page.getByRole('button', { name: 'Add unit' }).click();
  await expect(page.getByText('itest unit')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'add' }).first().click();
  await page.getByLabel('Called').fill('itest lesson');
  await page.getByRole('button', { name: /Add lesson/i }).click();
  await expect(page.getByText('itest lesson')).toBeVisible({ timeout: 10_000 });

  await page.getByText('itest lesson').click();
  await expect(page.getByRole('heading', { name: 'itest lesson' })).toBeVisible(
    { timeout: 10_000 }
  );
});

/**
 * There are two dictionaries, because there are two languages being learned.
 *
 * This screen used to carry an EN / ES switch, which was not the language of
 * the words at all but the language they were explained in — so every Spanish
 * word we own was unreachable, and the switch answered a question nobody had
 * asked. What the switch says now is which language you are looking at.
 */
test('the dictionary opens in what you are learning, and switches', async ({
  page,
}) => {
  await open(page, '/language/dictionary');

  const learning = page.getByRole('button', { name: 'Русский', exact: true });
  const teaching = page.getByRole('button', { name: 'Español', exact: true });
  await expect(learning).toBeVisible({ timeout: 10_000 });
  await expect(learning).toHaveClass(/bg-accent/);

  await teaching.click();
  await expect(teaching).toHaveClass(/bg-accent/, { timeout: 10_000 });

  // And a new word lands in the language you switched to, not in Russian.
  await page.getByRole('button', { name: 'New word' }).click();
  await expect(page.getByLabel('In Spanish')).toBeVisible();
});
