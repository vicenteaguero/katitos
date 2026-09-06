import type { ExerciseOption } from './exercise-schema';
import { meaningOf, termOf } from './pick';
import type { ExerciseKind, Lang, Vocab } from '../types';

/** A question ready to be written to the database, minus the ids. */
export interface HomeworkSpec {
  kind: ExerciseKind;
  prompt: string;
  payload: unknown;
  answer: unknown;
}

const ASK: Record<
  Lang,
  {
    means: (w: string) => string;
    write: (m: string, lang: string) => string;
    hear: string;
  }
> = {
  en: {
    means: (w) => `What does «${w}» mean?`,
    write: (m, lang) => `Write “${m}” in ${lang}`,
    hear: 'Write what you hear',
  },
  es: {
    means: (w) => `¿Qué significa «${w}»?`,
    write: (m, lang) => `Escribe “${m}” en ${lang}`,
    hear: 'Escribe lo que oyes',
  },
  ru: {
    means: (w) => `Что значит «${w}»?`,
    write: (m, lang) => `Напиши «${m}» по-${lang}`,
    hear: 'Напиши то, что слышишь',
  },
};

const LANG_IN: Record<Lang, Record<Lang, string>> = {
  en: { ru: 'Russian', es: 'Spanish', en: 'English' },
  es: { ru: 'ruso', es: 'español', en: 'inglés' },
  ru: { ru: 'русски', es: 'испански', en: 'английски' },
};

/**
 * Tomorrow's homework, from tonight's words.
 *
 * Homework is the same material asked back, and she was building it from an
 * empty page. For every word the lesson taught: choose its meaning from four,
 * write it from its meaning, and - where her recording exists - write what
 * you hear. Pure and deterministic, so it is tested rather than hoped at;
 * the caller writes the rows.
 */
export function homeworkFrom(
  words: readonly Vocab[],
  {
    support,
    target,
    limit = 12,
  }: { support: Lang; target: Lang; limit?: number }
): HomeworkSpec[] {
  const ask = ASK[support];
  const usable = words
    .filter((w) => termOf(w) && meaningOf(w, support))
    .slice(0, limit);
  const out: HomeworkSpec[] = [];

  usable.forEach((w, i) => {
    const meaning = meaningOf(w, support);
    // Three other meanings, walking the list from the next word on so two
    // questions never share the same set of wrong answers.
    const others = usable
      .filter((o) => o.id !== w.id && meaningOf(o, support) !== meaning)
      .map((o) => meaningOf(o, support));
    const distractors: string[] = [];
    for (let k = 0; k < others.length && distractors.length < 3; k++) {
      const m = others[(i + 1 + k) % others.length];
      if (!distractors.includes(m)) distractors.push(m);
    }
    const options: ExerciseOption[] = [meaning, ...distractors].map((m, k) => ({
      id: `o${k + 1}`,
      [support]: m,
    }));
    // The right one is not always first.
    const shift = i % options.length;
    const rotated = [...options.slice(shift), ...options.slice(0, shift)];
    if (rotated.length >= 2) {
      out.push({
        kind: 'choice',
        prompt: ask.means(termOf(w)),
        payload: { options: rotated },
        answer: 'o1',
      });
    }
  });

  usable.forEach((w) => {
    out.push({
      kind: 'type',
      prompt: ask.write(meaningOf(w, support), LANG_IN[support][target]),
      payload: {},
      answer: termOf(w),
    });
  });

  usable
    .filter((w) => w.audio_path)
    .forEach((w) => {
      out.push({
        kind: 'listen',
        prompt: ask.hear,
        payload: { audioPath: w.audio_path },
        answer: termOf(w),
      });
    });

  return out;
}
