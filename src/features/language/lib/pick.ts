import type { SupportLang } from '../types';

/**
 * The right language, or the next best thing.
 *
 * Every translatable field exists three times (`_ru`, `_en`, `_es`). A lesson
 * she wrote in Russian and English is complete and useful the day it is
 * written; adding Spanish later improves it and breaks nothing. So a missing
 * translation must FALL BACK, never blank:
 *
 *   asked for Spanish → es, else en, else ru
 *   asked for English → en, else es, else ru
 *
 * Russian is last because it is the thing being taught: showing it as its own
 * explanation is useless, but it is better than showing nothing.
 */
export function pick<T extends string>(
  row:
    | Partial<Record<`${T}_ru` | `${T}_en` | `${T}_es`, string | null>>
    | null
    | undefined,
  field: T,
  support: SupportLang
): string {
  if (!row) return '';
  const es = row[`${field}_es` as const] ?? '';
  const en = row[`${field}_en` as const] ?? '';
  const ru = row[`${field}_ru` as const] ?? '';
  const order = support === 'es' ? [es, en, ru] : [en, es, ru];
  return order.find((v) => v && v.trim()) ?? '';
}

/** A dictionary entry's meaning in the reader's language, same fallback chain. */
export function meaningOf(
  vocab: { es?: string | null; en?: string | null; ru: string },
  support: SupportLang
): string {
  const order = support === 'es' ? [vocab.es, vocab.en] : [vocab.en, vocab.es];
  return order.find((v) => v && v.trim()) ?? '';
}

/**
 * Is anything still missing in this language?
 *
 * Drives the little dot in the lesson builder, so she can see at a glance
 * which blocks still need her Spanish without opening each one.
 */
export function isMissing<T extends string>(
  row:
    | Partial<Record<`${T}_ru` | `${T}_en` | `${T}_es`, string | null>>
    | null
    | undefined,
  field: T,
  support: SupportLang
): boolean {
  if (!row) return false;
  const written = row[`${field}_${support}` as const];
  const anything =
    row[`${field}_ru` as const] ||
    row[`${field}_en` as const] ||
    row[`${field}_es` as const];
  // Nothing written at all isn't "missing a translation", it's just empty.
  return !!anything && !written?.trim();
}

/**
 * The word as it should be READ.
 *
 * Russian stress is phonemic — за́мок is a castle, замо́к is a lock — and it is
 * not written in ordinary text, so a learner has no way to know it. She writes
 * the accented form once and it becomes the headword everywhere the word
 * appears. Falls back to the plain spelling whenever she hasn't marked it.
 *
 * Marking is unaffected: `answerMatches` strips combining marks, so he never
 * has to type the accent.
 */
export function headword(word: { ru: string; stress?: string | null }): string {
  return word.stress?.trim() || word.ru;
}
