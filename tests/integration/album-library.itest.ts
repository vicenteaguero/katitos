import { beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  signedInClient,
  supabaseReachable,
  USER_A,
  USER_B,
} from './helpers';

/**
 * The album's library split, against the real database.
 *
 * These are the guarantees the whole migration rests on: that a photo can exist
 * without a page, that taking it off a page leaves it alone, and that the OLD
 * bundle's way of adding a photo still works while both phones upgrade.
 */
describe('Album library + placements (local stack)', () => {
  beforeAll(async () => {
    if (!(await supabaseReachable())) {
      throw new Error(
        'Local Supabase not reachable — run `supabase start` before integration tests.'
      );
    }
  });

  async function makeBook(client: Awaited<ReturnType<typeof signedInClient>>) {
    const { data: book, error } = await client
      .from('album_books')
      .insert({ scope: 'era', title: 'itest album' })
      .select('id')
      .single();
    expect(error).toBeNull();
    const { data: page } = await client
      .from('album_pages')
      .insert({ book_id: book!.id, position: 0 })
      .select('id')
      .single();
    return { bookId: book!.id as string, pageId: page!.id as string };
  }

  it('keeps a photo out of anon hands', async () => {
    const anon = anonClient();
    const { data } = await anon.from('album_placements').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('holds a photo that is on no page at all', async () => {
    const a = await signedInClient(USER_A);
    const { bookId } = await makeBook(a);

    const { data: photo, error } = await a
      .from('album_photos')
      .insert({
        book_id: bookId,
        image_path: 'itest/lib.jpg',
        source: 'upload',
      })
      .select('id, page_id, slot')
      .single();

    expect(error).toBeNull();
    expect(photo!.page_id).toBeNull();

    await a.from('album_books').delete().eq('id', bookId);
  });

  it('lets many library photos coexist — the old unique index ignores nulls', async () => {
    const a = await signedInClient(USER_A);
    const { bookId } = await makeBook(a);

    const { error } = await a.from('album_photos').insert(
      Array.from({ length: 5 }, (_, i) => ({
        book_id: bookId,
        image_path: `itest/bulk-${i}.jpg`,
        source: 'upload',
      }))
    );
    expect(error).toBeNull();

    const { data: rows } = await a
      .from('album_photos')
      .select('id')
      .eq('book_id', bookId);
    expect(rows).toHaveLength(5);

    await a.from('album_books').delete().eq('id', bookId);
  });

  it('still accepts the OLD bundle’s upsert on (page_id, slot)', async () => {
    const a = await signedInClient(USER_A);
    const { bookId, pageId } = await makeBook(a);

    // Exactly what the previous release does, and will keep doing until both
    // phones have launched the new one twice.
    for (const path of ['old-1.jpg', 'old-2.jpg']) {
      const { error } = await a
        .from('album_photos')
        .upsert(
          { page_id: pageId, slot: 0, image_path: path, source: 'upload' },
          { onConflict: 'page_id,slot' }
        );
      expect(error).toBeNull();
    }

    const { data: rows } = await a
      .from('album_photos')
      .select('image_path')
      .eq('page_id', pageId);
    expect(rows).toHaveLength(1);
    expect(rows![0].image_path).toBe('old-2.jpg');

    await a.from('album_books').delete().eq('id', bookId);
  });

  it('taking a sticker off a page keeps the photo in the library', async () => {
    const a = await signedInClient(USER_A);
    const { bookId, pageId } = await makeBook(a);

    const { data: photo } = await a
      .from('album_photos')
      .insert({
        book_id: bookId,
        image_path: 'itest/keep.jpg',
        source: 'upload',
      })
      .select('id')
      .single();

    const { data: placement, error: placeErr } = await a
      .from('album_placements')
      .insert({ page_id: pageId, photo_id: photo!.id, kind: 'photo', z: 0 })
      .select('id')
      .single();
    expect(placeErr).toBeNull();

    await a.from('album_placements').delete().eq('id', placement!.id);

    const { data: still } = await a
      .from('album_photos')
      .select('id')
      .eq('id', photo!.id);
    expect(still).toHaveLength(1);

    await a.from('album_books').delete().eq('id', bookId);
  });

  it('deleting the photo takes every placement of it with it', async () => {
    const a = await signedInClient(USER_A);
    const { bookId, pageId } = await makeBook(a);

    const { data: photo } = await a
      .from('album_photos')
      .insert({
        book_id: bookId,
        image_path: 'itest/gone.jpg',
        source: 'upload',
      })
      .select('id')
      .single();
    await a.from('album_placements').insert([
      { page_id: pageId, photo_id: photo!.id, kind: 'photo', z: 0 },
      { page_id: pageId, photo_id: photo!.id, kind: 'photo', z: 1 },
    ]);

    await a.from('album_photos').delete().eq('id', photo!.id);

    const { data: orphans } = await a
      .from('album_placements')
      .select('id')
      .eq('photo_id', photo!.id);
    expect(orphans ?? []).toHaveLength(0);

    await a.from('album_books').delete().eq('id', bookId);
  });

  it('refuses a photo placement with no photo, but allows text', async () => {
    const a = await signedInClient(USER_A);
    const { bookId, pageId } = await makeBook(a);

    const { error: badErr } = await a
      .from('album_placements')
      .insert({ page_id: pageId, kind: 'photo' });
    expect(badErr).not.toBeNull();

    const { error: textErr } = await a
      .from('album_placements')
      .insert({ page_id: pageId, kind: 'text', body: 'hola' });
    expect(textErr).toBeNull();

    await a.from('album_books').delete().eq('id', bookId);
  });

  it('lets the other one of us rearrange the same book', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const { bookId, pageId } = await makeBook(a);

    const { data: photo } = await a
      .from('album_photos')
      .insert({
        book_id: bookId,
        image_path: 'itest/ours.jpg',
        source: 'upload',
      })
      .select('id')
      .single();
    const { data: placement } = await a
      .from('album_placements')
      .insert({ page_id: pageId, photo_id: photo!.id, kind: 'photo' })
      .select('id')
      .single();

    // The album belongs to both of us — she must be able to move what he put down.
    const { error } = await b
      .from('album_placements')
      .update({ x: 0.2, y: 0.8, z: 9 })
      .eq('id', placement!.id);
    expect(error).toBeNull();

    await a.from('album_books').delete().eq('id', bookId);
  });
});
