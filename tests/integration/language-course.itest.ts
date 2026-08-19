import { beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  signedInClient,
  supabaseReachable,
  USER_A,
  USER_B,
} from './helpers';

/**
 * The teaching tables, against the real database.
 *
 * The rules that matter here are the ones about WHO CAN WRITE WHAT: she has to
 * be able to read his answers to mark them, and neither of us may write the
 * other's. Those are policies, not application code, so they are worth testing
 * where they actually live.
 */
describe('Language course (local stack)', () => {
  beforeAll(async () => {
    if (!(await supabaseReachable())) {
      throw new Error(
        'Local Supabase not reachable — run `supabase start` before integration tests.'
      );
    }
  });

  async function makeLesson(
    client: Awaited<ReturnType<typeof signedInClient>>
  ) {
    const { data: course } = await client
      .from('lang_courses')
      .insert({ title: 'itest course', target_lang: 'ru' })
      .select('id')
      .single();
    const { data: unit } = await client
      .from('lang_units')
      .insert({ course_id: course!.id, title: 'itest unit', position: 0 })
      .select('id')
      .single();
    const { data: lesson } = await client
      .from('lang_lessons')
      .insert({ unit_id: unit!.id, title: 'itest lesson', kind: 'homework' })
      .select('id')
      .single();
    return {
      courseId: course!.id as string,
      lessonId: lesson!.id as string,
    };
  }

  it('keeps the whole course away from anon', async () => {
    const anon = anonClient();
    for (const table of [
      'lang_courses',
      'lang_lessons',
      'lang_vocab',
    ] as const) {
      const { data } = await anon.from(table).select('id');
      expect(data ?? []).toHaveLength(0);
    }
  });

  it('ships all thirty-three letters, so the alphabet is never empty', async () => {
    const a = await signedInClient(USER_A);
    const { data, error } = await a
      .from('lang_alphabet')
      .select('letter')
      .eq('script', 'cyrillic');
    expect(error).toBeNull();
    // Seeded by the migration, NOT by seed.sql — which never runs on the real
    // app, and would have left her with a blank alphabet screen.
    expect(data).toHaveLength(33);
  });

  it('lets either of us build a lesson — she teaches, he can too', async () => {
    const b = await signedInClient(USER_B);
    const { courseId, lessonId } = await makeLesson(b);
    expect(lessonId).toBeTruthy();
    await b.from('lang_courses').delete().eq('id', courseId);
  });

  it('shows her his answers, but will not let her write them', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const {
      data: { user: userA },
    } = await a.auth.getUser();
    const { courseId, lessonId } = await makeLesson(b);

    const { data: exercise } = await b
      .from('lang_exercises')
      .insert({
        lesson_id: lessonId,
        kind: 'choice',
        payload: { options: [{ id: 'x' }, { id: 'y' }] },
        answer: 'x',
      })
      .select('id')
      .single();

    // He answers.
    const { error: hisErr } = await a.from('lang_attempts').insert({
      exercise_id: exercise!.id,
      answer: 'x',
      correct: true,
      score: 1,
    });
    expect(hisErr).toBeNull();

    // She can read it — that is the whole point of marking homework.
    const { data: seen } = await b
      .from('lang_attempts')
      .select('id, correct')
      .eq('exercise_id', exercise!.id);
    expect(seen).toHaveLength(1);

    // But she cannot answer AS him.
    const { error: forgedErr } = await b.from('lang_attempts').insert({
      exercise_id: exercise!.id,
      user_id: userA!.id,
      answer: 'y',
    });
    // 42501 = the POLICY refused it. `not.toBeNull()` would pass for any
    // error at all, including one that has nothing to do with permissions.
    expect(forgedErr?.code).toBe('42501');

    await b.from('lang_courses').delete().eq('id', courseId);
  });

  it('keeps every attempt — homework is meant to be redone', async () => {
    const a = await signedInClient(USER_A);
    const { courseId, lessonId } = await makeLesson(a);
    const { data: exercise } = await a
      .from('lang_exercises')
      .insert({
        lesson_id: lessonId,
        kind: 'type',
        payload: {},
        answer: 'спасибо',
      })
      .select('id')
      .single();

    await a.from('lang_attempts').insert([
      {
        exercise_id: exercise!.id,
        answer: 'спасибa',
        correct: false,
        attempt_no: 1,
      },
      {
        exercise_id: exercise!.id,
        answer: 'спасибо',
        correct: true,
        attempt_no: 2,
      },
    ]);

    const { data: tries } = await a
      .from('lang_attempts')
      .select('attempt_no')
      .eq('exercise_id', exercise!.id);
    // Two rows, not one overwritten row.
    expect(tries).toHaveLength(2);

    await a.from('lang_courses').delete().eq('id', courseId);
  });

  it('lets her put a mark and a note on his work', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const {
      data: { user: userA },
    } = await a.auth.getUser();
    const { courseId, lessonId } = await makeLesson(b);

    const { error } = await b.from('lang_lesson_progress').upsert(
      {
        lesson_id: lessonId,
        user_id: userA!.id,
        status: 'graded',
        score: 0.9,
        teacher_note: 'почти! watch the ending',
      },
      { onConflict: 'lesson_id,user_id' }
    );
    expect(error).toBeNull();

    const { data: mine } = await a
      .from('lang_lesson_progress')
      .select('score, teacher_note')
      .eq('lesson_id', lessonId)
      .single();
    expect(mine!.score).toBeCloseTo(0.9);

    await b.from('lang_courses').delete().eq('id', courseId);
  });

  it('will not let one of us rewrite the other’s review history', async () => {
    const a = await signedInClient(USER_A);
    const b = await signedInClient(USER_B);
    const {
      data: { user: userA },
    } = await a.auth.getUser();

    const { data: word } = await a
      .from('lang_vocab')
      .insert({ term_lang: 'ru', ru: 'итест', en: 'itest' })
      .select('id')
      .single();

    const { error: mineErr } = await a
      .from('lang_vocab_reviews')
      .insert({ vocab_id: word!.id, ease: 2.5, interval_days: 1, reps: 1 });
    expect(mineErr).toBeNull();

    // She may READ how he is doing…
    const { data: visible } = await b
      .from('lang_vocab_reviews')
      .select('reps')
      .eq('vocab_id', word!.id);
    expect(visible).toHaveLength(1);

    // …but not claim she knew a word on his behalf.
    const { error: forgedErr } = await b
      .from('lang_vocab_reviews')
      .insert({ vocab_id: word!.id, user_id: userA!.id, reps: 99 });
    expect(forgedErr?.code).toBe('42501');

    await a.from('lang_vocab').delete().eq('id', word!.id);
  });

  it('insists a media row is a file or a link, never both', async () => {
    const a = await signedInClient(USER_A);
    const { courseId } = await makeLesson(a);

    const { error: bothErr } = await a.from('lang_media').insert({
      course_id: courseId,
      kind: 'pdf',
      storage_path: 'a.pdf',
      url: 'https://example.com/a.pdf',
    });
    expect(bothErr?.code).toBe('23514');

    const { error: linkErr } = await a.from('lang_media').insert({
      course_id: courseId,
      kind: 'youtube',
      url: 'https://youtu.be/dQw4w9WgXcQ',
    });
    expect(linkErr).toBeNull();

    await a.from('lang_courses').delete().eq('id', courseId);
  });

  it('takes the whole course with it when a course is deleted', async () => {
    const a = await signedInClient(USER_A);
    const { courseId, lessonId } = await makeLesson(a);
    await a.from('lang_blocks').insert({
      lesson_id: lessonId,
      kind: 'text',
      body_ru: 'Привет',
      position: 0,
    });

    await a.from('lang_courses').delete().eq('id', courseId);

    const { data: blocks } = await a
      .from('lang_blocks')
      .select('id')
      .eq('lesson_id', lessonId);
    expect(blocks ?? []).toHaveLength(0);
  });
});
