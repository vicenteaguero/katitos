import { expect, request, type Page } from '@playwright/test';

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/**
 * The release modal re-arms on every changelog entry, and its backdrop eats
 * clicks — so anything interactive has to get past it first.
 */
export async function dismissChangelog(page: Page) {
  const showMe = page.getByRole('button', { name: 'Show me' });
  // It arrives a beat AFTER the shell paints, so asking "is it visible?" the
  // instant the page loads answers no — and then the backdrop swallows the
  // next click. Give it a moment to turn up before deciding it isn't there.
  await showMe.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  if (await showMe.isVisible().catch(() => false)) {
    await showMe.click();
  }
  // Either way, nothing may proceed while the backdrop is still over the page.
  await expect(page.locator('.cl-backdrop')).toHaveCount(0, {
    timeout: 10_000,
  });
}

/** A signed-in REST context, for setting up and tearing down test data. */
async function api() {
  const ctx = await request.newContext({ baseURL: SUPABASE_URL });
  const auth = await ctx.post('/auth/v1/token?grant_type=password', {
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    data: { email: 'vicente@katitos.local', password: 'katitos123' },
  });
  if (!auth.ok()) {
    await ctx.dispose();
    return null;
  }
  const { access_token } = await auth.json();
  return {
    ctx,
    headers: { apikey: ANON, Authorization: `Bearer ${access_token}` },
  };
}

/**
 * Remove what the suite created last time.
 *
 * Tests that leave rows behind make every later run slower and eventually
 * break it — the wall filled to its ten-note ceiling and stayed there for
 * days. Each spec cleans its own kind of row, over the API, before it starts.
 */
export async function cleanup(
  what: Array<'notes' | 'albums' | 'courses' | 'vocab'>
) {
  const a = await api();
  if (!a) return;
  const { ctx, headers } = a;
  // PostgREST `like` uses `*` as the wildcard.
  const targets: Record<string, string> = {
    notes: '/rest/v1/chalkboard_notes?body=like.e2e%20*',
    albums: '/rest/v1/album_books?title=like.itest*',
    // Two shapes of throwaway course: "itest 123" and "w123 course".
    courses: '/rest/v1/lang_courses?or=(title.like.itest*,title.like.*course)',
    // Throwaway words come out as "сло123" (the block picker) or "итест123"
    // (the dictionary screen); percent-encoded because they are Cyrillic.
    vocab:
      '/rest/v1/lang_vocab?or=(ru.like.%D1%81%D0%BB%D0%BE*,ru.like.%D0%B8%D1%82%D0%B5%D1%81%D1%82*)',
  };
  for (const key of what) {
    await ctx.delete(targets[key], { headers }).catch(() => undefined);
  }
  await ctx.dispose();
}

/**
 * Make every photo in the book look like one added before pixel sizes existed.
 *
 * Which is every photo either of us already owns: `width` / `height` arrived
 * with the library, and a sticker with neither a stored ratio nor a height
 * collapsed to a sliver on the page. This is the state to test against.
 */
export async function forgetPhotoSizes() {
  const a = await api();
  if (!a) return;
  const { ctx, headers } = a;
  await ctx.patch('/rest/v1/album_photos?width=not.is.null', {
    headers: { ...headers, 'Content-Type': 'application/json' },
    data: { width: null, height: null },
  });
  await ctx.dispose();
}

/** The stored pixel sizes, straight from the API — no cache in the way. */
export async function photoSizes(): Promise<
  Array<{ width: number | null; height: number | null }>
> {
  const a = await api();
  if (!a) return [];
  const { ctx, headers } = a;
  const res = await ctx.get('/rest/v1/album_photos?select=width,height', {
    headers,
  });
  const rows = res.ok() ? await res.json() : [];
  await ctx.dispose();
  return rows;
}
