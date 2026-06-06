import { beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  signedInClient,
  supabaseReachable,
  USER_A,
  USER_B,
} from './helpers';

describe('Supabase RLS + deck reveal (local stack)', () => {
  beforeAll(async () => {
    const up = await supabaseReachable();
    if (!up) {
      throw new Error(
        'Local Supabase not reachable — run `supabase start` before integration tests.'
      );
    }
  });

  it('blocks anon reads (RLS) but allows members', async () => {
    const anon = anonClient();
    const { data: anonRows } = await anon.from('countdowns').select('id');
    expect(anonRows ?? []).toHaveLength(0);

    const a = await signedInClient(USER_A);
    const { data: memberRows, error } = await a.from('countdowns').select('id');
    expect(error).toBeNull();
    expect((memberRows ?? []).length).toBeGreaterThan(0);
  });

  it('lets a member CRUD a row', async () => {
    const a = await signedInClient(USER_A);
    const { data: created, error: insErr } = await a
      .from('countdowns')
      .insert({ title: 'itest-temp', target_at: '2030-01-01T00:00:00Z' })
      .select('id')
      .single();
    expect(insErr).toBeNull();
    expect(created?.id).toBeTruthy();

    const { error: delErr } = await a
      .from('countdowns')
      .delete()
      .eq('id', created!.id);
    expect(delErr).toBeNull();
  });

  it('records both partners answers on a deck card (reveal precondition)', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);

    const { data: deck } = await a
      .from('decks')
      .select('id')
      .eq('slug', 'qotd')
      .single();
    expect(deck?.id).toBeTruthy();

    const { data: card } = await a
      .from('deck_cards')
      .select('id')
      .eq('deck_id', deck!.id)
      .order('position')
      .limit(1)
      .single();
    expect(card?.id).toBeTruthy();

    await a
      .from('deck_responses')
      .upsert(
        { deck_id: deck!.id, card_id: card!.id, answer: { text: 'A answer' } },
        { onConflict: 'card_id,user_id' }
      );
    await b
      .from('deck_responses')
      .upsert(
        { deck_id: deck!.id, card_id: card!.id, answer: { text: 'B answer' } },
        { onConflict: 'card_id,user_id' }
      );

    const { data: responses } = await a
      .from('deck_responses')
      .select('user_id, answer')
      .eq('card_id', card!.id);
    expect((responses ?? []).length).toBe(2);

    // cleanup
    await a.from('deck_responses').delete().eq('card_id', card!.id);
  });
});
