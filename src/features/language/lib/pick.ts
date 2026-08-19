import type { Lang } from '../types';

/** The reader's language first, then the one they share, then whatever exists. */
function order(support: Lang): Lang[] {
  const rest: Lang[] = ['en', 'es', 'ru'];
  return [support, ...rest.filter((l) => l !== support)];
}

/**
 * The right language, or the next best thing.
 *
 * Every translatable field exists three times (`_ru`, `_en`, `_es`). A lesson
 * written in Russian with an English gloss is complete and useful the day it is
 * written; adding Spanish later improves it and breaks nothing. So a missing
 * translation must FALL BACK, never blank.
 *
 * The order is the reader's own language, then English, then the rest — which
 * lands correctly in both directions without being told which one is being
 * taught. Reading a Russian lesson in Spanish: es → en → ru, and the Russian is
 * last because explaining спасибо in Russian helps nobody. Reading a Spanish
 * lesson in Russian: ru → en → es, and now it is the Spanish that comes last,
 * for exactly the same reason.
 */
export function pick<T extends string>(
  row:
    | Partial<Record<`${T}_ru` | `${T}_en` | `${T}_es`, string | null>>
    | null
    | undefined,
  field: T,
  support: Lang
): string {
  if (!row) return '';
  for (const lang of order(support)) {
    const value = row[`${field}_${lang}` as const];
    if (value && value.trim()) return value;
  }
  return '';
}

/** A dictionary entry: which language its headword is written in. */
interface Entry {
  term_lang?: string | null;
  ru?: string | null;
  en?: string | null;
  es?: string | null;
  stress?: string | null;
}

/** Which of the three columns holds the word itself. */
export function termLangOf(word: Entry): Lang {
  const t = word.term_lang;
  return t === 'es' || t === 'en' ? t : 'ru';
}

/**
 * The word as it should be READ.
 *
 * Russian stress is phonemic — за́мок is a castle, замо́к is a lock — and it is
 * not written in ordinary text, so a learner has no way to know it. She writes
 * the accented form once and it becomes the headword everywhere the word
 * appears. Spanish writes its own stress, so there is nothing to add there.
 *
 * Marking is unaffected: `answerMatches` strips combining marks, so he never
 * has to type the accent.
 */
export function headword(word: Entry): string {
  const lang = termLangOf(word);
  if (lang === 'ru') return word.stress?.trim() || word.ru || '';
  return word[lang] || '';
}

/**
 * The word itself, without the stress mark.
 *
 * What a typed answer is compared against, and what a multiple-choice option
 * shows. `headword` is for reading; this is for matching.
 */
export function termOf(word: Entry): string {
  return word[termLangOf(word)] || '';
}

/**
 * What it means, in the reader's language.
 *
 * Never the headword's own language — a Spanish card whose "meaning" is the
 * Spanish word is the kind of thing you only notice after showing it to
 * someone.
 */
export function meaningOf(word: Entry, support: Lang): string {
  const term = termLangOf(word);
  for (const lang of order(support)) {
    if (lang === term) continue;
    const value = word[lang];
    if (value && value.trim()) return value;
  }
  return '';
}

/**
 * The note about this word, in the reader's language.
 *
 * A note is prose, so it follows the same fallback as everything else rather
 * than picking one hard-coded column — she writes hers in Russian.
 */
export function noteOf(
  word: {
    notes_ru?: string | null;
    notes_en?: string | null;
    notes_es?: string | null;
  },
  support: Lang
): string {
  for (const lang of order(support)) {
    const value = word[`notes_${lang}` as const];
    if (value && value.trim()) return value;
  }
  return '';
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
  support: Lang
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
