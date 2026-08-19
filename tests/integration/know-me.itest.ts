import { beforeAll, describe, expect, it } from 'vitest';
import { signedInClient, supabaseReachable, USER_A, USER_B } from './helpers';

describe('Know-Me RPCs — daily assignment + anti-peek + edit-lock', () => {
  beforeAll(async () => {
    if (!(await supabaseReachable())) {
      throw new Error('Local Supabase not reachable — run `supabase start`.');
    }
  });

  it('ensure_today is idempotent (both partners converge to one day)', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const { data: d1, error: e1 } = await a.rpc('know_me_ensure_today');
    expect(e1).toBeNull();
    const { data: d2 } = await b.rpc('know_me_ensure_today');
    expect(d1!.id).toBe(d2!.id);
    expect(d1!.couple_day).toBe(d2!.couple_day);
  });

  it('hides a day until both submit, masks/unmasks reveal, validates + locks', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const {
      data: { user: ua },
    } = await a.auth.getUser();

    // `know_me_ensure_today` is declared `SETOF know_me_days`, so PostgREST
    // hands back an ARRAY even though it only ever returns one row. Treating it
    // as a bare object left every id undefined, which is why the question
    // lookup below came back null.
    const { data: days } = await a.rpc('know_me_ensure_today');
    const day = Array.isArray(days) ? days[0] : days;
    // Clean any prior state for this day.
    await a.from('know_me_answers').delete().eq('day_id', day!.id);
    await a.from('know_me_presence').delete().eq('day_id', day!.id);

    const { data: q } = await a
      .from('know_me_questions')
      .select('options')
      .eq('id', day!.question_id)
      .single();
    const ids = (q!.options as { id: string }[]).map((o) => o.id);

    // Invalid option id is rejected by the submit RPC.
    const { error: badErr } = await a.rpc('know_me_submit', {
      p_own: 'not-an-option',
      p_guess: ids[0],
    });
    expect(badErr).not.toBeNull();

    // A submits. The history view must NOT expose the day yet (only one answer).
    const { error: subA } = await a.rpc('know_me_submit', {
      p_own: ids[0],
      p_guess: ids[1],
    });
    expect(subA).toBeNull();
    const { data: hist1 } = await a
      .from('know_me_revealed')
      .select('id')
      .eq('day_id', day!.id);
    expect(hist1 ?? []).toHaveLength(0); // incomplete day stays hidden

    // B submits → both done.
    const { error: subB } = await b.rpc('know_me_submit', {
      p_own: ids[2],
      p_guess: ids[0],
    });
    expect(subB).toBeNull();

    // Now the history view exposes both rows for the day.
    const { data: hist2 } = await a
      .from('know_me_revealed')
      .select('id')
      .eq('day_id', day!.id);
    expect(hist2 ?? []).toHaveLength(2);

    // reveal RPC: the partner's choices are now unmasked.
    const { data: revealed } = await a.rpc('know_me_reveal', {
      p_day_id: day!.id,
    });
    const partnerRow = (
      revealed as { is_self: boolean; own_choice: string | null }[]
    ).find((r) => !r.is_self);
    expect(partnerRow?.own_choice).toBe(ids[2]);

    // Edit-lock: changing own/guess after both submitted is blocked…
    const { error: lockErr } = await a
      .from('know_me_answers')
      .update({ own_choice: ids[3] })
      .eq('day_id', day!.id)
      .eq('user_id', ua!.id);
    expect(lockErr).not.toBeNull();

    // …but attaching a reaction is still allowed.
    const { error: reactErr } = await a
      .from('know_me_answers')
      .update({ reaction_path: 'know-me/x.jpg' })
      .eq('day_id', day!.id)
      .eq('user_id', ua!.id);
    expect(reactErr).toBeNull();

    // Cleanup.
    await a.from('know_me_answers').delete().eq('day_id', day!.id);
    await a.from('know_me_presence').delete().eq('day_id', day!.id);
  });
});
