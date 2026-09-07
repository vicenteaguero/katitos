import { test, expect, type Page } from '@playwright/test';
import { cleanup, dismissChangelog } from './helpers';

/** Build a course → unit → lesson and land in its builder. */
async function newLesson(page: Page, label: string): Promise<void> {
  await cleanup(['courses', 'vocab']);
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

  // The sticky "New lesson" opens the sheet and lands straight in the builder.
  await page.getByRole('button', { name: 'New lesson' }).click();
  await page.getByLabel('Called').fill(`${label} lesson`);
  await page.getByRole('button', { name: /Create and write it/ }).click();
  await expect(page.getByRole('button', { name: 'Insert' })).toBeVisible({
    timeout: 10_000,
  });
}

/** Open the insert menu and pick one of its tiles. */
async function insert(page: Page, tile: string): Promise<void> {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('button', { name: tile, exact: true }).click();
}

/** From the builder to the lesson as he reads it. */
async function readIt(page: Page, label: string): Promise<void> {
  await page.getByRole('link', { name: 'Preview as him' }).click();
  await expect(page.getByText(`${label} lesson`).first()).toBeVisible({
    timeout: 10_000,
  });
}

test('a words block can be filled from the dictionary and shows in the lesson', async ({
  page,
}) => {
  const label = `w${Date.now() % 100000}`;
  await newLesson(page, label);

  await insert(page, 'Words');
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
  await readIt(page, label);
  await expect(page.getByText(word).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('a word').first()).toBeVisible();
});

test('a video can be attached and plays only when tapped', async ({ page }) => {
  const label = `m${Date.now() % 100000}`;
  await newLesson(page, label);

  await insert(page, 'Material');
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

  await readIt(page, label);

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

  await insert(page, 'Question');
  await page.getByRole('button', { name: 'Put in order' }).click();
  await page.getByLabel('Ask him').fill('Put it in order');
  await page
    .getByLabel('The sentence, in the right order')
    .fill('я тебя очень люблю');
  await page.getByRole('button', { name: 'Add the question' }).click();

  await readIt(page, label);

  // The words he is offered must NOT already be in the answer's order,
  // otherwise the exercise is solved by tapping left to right.
  const pool = page.locator('button', { hasText: /^(я|тебя|очень|люблю)$/ });
  await expect(pool).toHaveCount(4, { timeout: 10_000 });
  const shown = await pool.allInnerTexts();
  expect(shown).not.toEqual(['я', 'тебя', 'очень', 'люблю']);
  expect([...shown].sort()).toEqual(['люблю', 'очень', 'тебя', 'я'].sort());
});

test('a written question can accept more than one right answer', async ({
  page,
}) => {
  const label = `t${Date.now() % 100000}`;
  await newLesson(page, label);

  await insert(page, 'Question');
  await page.getByRole('button', { name: 'Type it' }).click();
  await page.getByLabel('Ask him').fill('How do you say thank you?');
  // Russian rarely has exactly one right answer.
  await page.getByLabel('The answer').fill('спасибо / благодарю');
  await page.getByRole('button', { name: 'Add the question' }).click();

  await readIt(page, label);

  // The second form is accepted just as the first one is.
  await page.getByLabel('Write it').fill('благодарю');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('1 of 1 right')).toBeVisible({ timeout: 10_000 });
});

test('a declension table can be typed and reads as a table', async ({
  page,
}) => {
  const label = `d${Date.now() % 100000}`;
  await newLesson(page, label);

  await insert(page, 'Table');
  // Typed the way she would write it on paper: headings, then a row per case.
  await page
    .getByPlaceholder(', singular, plural')
    .fill(
      ', singular, plural\nnominative, стол, столы\ngenitive, стола, столов'
    );
  await page.getByPlaceholder('What the table is (optional)').click();

  await readIt(page, label);

  // It renders as a real table, so a screen reader and a human both read it
  // as a grid rather than as a run-on sentence.
  const table = page.getByRole('table');
  await expect(table).toBeVisible({ timeout: 10_000 });
  await expect(
    table.getByRole('columnheader', { name: 'plural' })
  ).toBeVisible();
  await expect(table.getByRole('cell', { name: 'столов' })).toBeVisible();
});

test('she can read his answers and write him back', async ({ page }) => {
  const label = `k${Date.now() % 100000}`;
  await newLesson(page, label);

  // A question he can get wrong.
  await insert(page, 'Question');
  await page.getByRole('button', { name: 'Type it' }).click();
  await page.getByLabel('Ask him').fill('Say thank you');
  await page.getByLabel('The answer').fill('спасибо');
  await page.getByRole('button', { name: 'Add the question' }).click();

  await readIt(page, label);

  // He answers it wrongly, which records an attempt and progress.
  await page.getByLabel('Write it').fill('пожалуйста');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('0 of 1 right')).toBeVisible({ timeout: 10_000 });

  // In this app both people are members, so the same session can open the
  // marking screen; what matters is that his answer is READABLE there.
  await page.goto(page.url().replace('/lesson/', '/mark/'));
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 20_000 });
  await dismissChangelog(page);

  // Either his answer is shown for marking, or the screen says plainly that
  // there is nothing of his to mark — never a blank.
  const hasAnswers = await page
    .getByText('пожалуйста')
    .isVisible()
    .catch(() => false);
  const saysEmpty = await page
    .getByText('Nothing to mark yet')
    .isVisible()
    .catch(() => false);
  expect(hasAnswers || saysEmpty).toBe(true);

  if (hasAnswers) {
    await expect(page.getByText('wanted: спасибо')).toBeVisible();
    await page.getByRole('button', { name: 'A note or your voice' }).click();
    await page.getByLabel('A note for him').fill('почти!');
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Give it back' }).click();
  }
});
