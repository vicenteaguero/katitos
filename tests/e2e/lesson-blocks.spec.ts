import { test, expect, type Page } from '@playwright/test';

/** The release modal re-arms on every changelog entry; get it out of the way. */
async function dismissChangelog(page: Page) {
  const showMe = page.getByRole('button', { name: 'Show me' });
  if (await showMe.isVisible().catch(() => false)) {
    await showMe.click();
    await expect(showMe).toBeHidden();
  }
}

/** Build a course → unit → lesson and land in its builder. */
async function newLesson(page: Page, label: string): Promise<void> {
  await page.goto('/language');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  await page.getByRole('button', { name: 'New course' }).click();
  await page.getByLabel('Called').fill(`${label} course`);
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByRole('button', { name: 'New unit' }).click();
  await page.getByLabel('Called').fill(`${label} unit`);
  await page.getByRole('button', { name: 'Add unit' }).click();
  await expect(page.getByText(`${label} unit`)).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: 'add' }).first().click();
  await page.getByLabel('Called').fill(`${label} lesson`);
  await page.getByRole('button', { name: /Add lesson/i }).click();
  await page.getByText(`${label} lesson`).click();
  await expect(
    page.getByRole('heading', { name: `${label} lesson` })
  ).toBeVisible({ timeout: 10_000 });

  // Into the builder.
  await page.getByRole('link', { name: 'Edit this lesson' }).click();
  await expect(page.getByRole('button', { name: /question/ })).toBeVisible({
    timeout: 10_000,
  });
}

test('a words block can be filled from the dictionary and shows in the lesson', async ({
  page,
}) => {
  const label = `w${Date.now() % 100000}`;
  await newLesson(page, label);

  await page.getByRole('button', { name: /^\s*vocab/ }).click();
  await expect(page.getByText('No words yet')).toBeVisible({ timeout: 10_000 });

  await page.getByText('No words yet').click();

  // A word she needs mid-lesson can be created without leaving the sheet.
  const word = `сло${Date.now() % 10000}`;
  await page.getByLabel('Not there yet?').fill(word);
  await page.getByLabel('English').fill('a word');
  await page.getByRole('button', { name: 'Add it to the dictionary' }).click();
  await expect(page.getByRole('button', { name: `${word} ×` })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: /Put 1 word in the lesson/ }).click();

  // The builder row now says what the block holds…
  await expect(page.getByText(word).first()).toBeVisible({ timeout: 10_000 });

  // …and the lesson itself actually renders it, which is the part that was
  // silently empty before.
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: `${label} lesson` })
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(word).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('a word').first()).toBeVisible();
});

test('a video can be attached and plays only when tapped', async ({ page }) => {
  const label = `m${Date.now() % 100000}`;
  await newLesson(page, label);

  await page.getByRole('button', { name: /^\s*media/ }).click();
  await expect(page.getByText('Nothing attached yet')).toBeVisible({
    timeout: 10_000,
  });
  await page.getByText('Nothing attached yet').click();

  await page.getByRole('button', { name: 'A link', exact: true }).click();
  await page.getByLabel('Call it').fill('Alphabet song');
  await page.getByLabel('Paste it').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Attach the link' }).click();

  await expect(page.getByText('Alphabet song')).toBeVisible({
    timeout: 10_000,
  });

  await page.goBack();
  await expect(
    page.getByRole('heading', { name: `${label} lesson` })
  ).toBeVisible({ timeout: 10_000 });

  // The poster is an image; the player is NOT mounted until it is tapped, so a
  // lesson full of videos still opens instantly.
  const poster = page.locator('img[alt="Alphabet song"]');
  await expect(poster).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('iframe')).toHaveCount(0);

  await poster.click();
  await expect(page.locator('iframe')).toHaveCount(1, { timeout: 10_000 });
});

test('a put-in-order question does not hand over the answer', async ({
  page,
}) => {
  const label = `o${Date.now() % 100000}`;
  await newLesson(page, label);

  await page.getByRole('button', { name: /question/ }).click();
  await page.getByRole('button', { name: 'Put in order' }).click();
  await page.getByLabel('Ask him').fill('Put it in order');
  await page
    .getByLabel('The sentence, in the right order')
    .fill('я тебя очень люблю');
  await page.getByRole('button', { name: 'Add the question' }).click();

  await page.goBack();
  await expect(
    page.getByRole('heading', { name: `${label} lesson` })
  ).toBeVisible({ timeout: 10_000 });

  // The words he is offered must NOT already be in the answer's order,
  // otherwise the exercise is solved by tapping left to right.
  const pool = page.locator('button', { hasText: /^(я|тебя|очень|люблю)$/ });
  await expect(pool).toHaveCount(4, { timeout: 10_000 });
  const shown = await pool.allInnerTexts();
  expect(shown).not.toEqual(['я', 'тебя', 'очень', 'люблю']);
  expect([...shown].sort()).toEqual(['люблю', 'очень', 'тебя', 'я'].sort());
});
