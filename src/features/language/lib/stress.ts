/** The combining acute — the stress mark she writes on a vowel. */
export const ACUTE = '́';

const VOWELS = 'аеёиоуыэюя';

/** The word without its stress mark. */
export function stripStress(s: string): string {
  return s.normalize('NFC').replace(/́/g, '');
}

/**
 * Every way to stress a word — one per vowel — and which one she meant.
 *
 * Russian stress is unwritten and moves, and getting it wrong changes the
 * word (за́мок is a castle, замо́к is a lock). A question that asks WHERE
 * the stress falls is built from nothing but the stressed spelling she
 * already writes in the dictionary. `answer` is −1 if the accent is not
 * on a vowel.
 */
export function stressVariants(stressed: string): {
  variants: string[];
  answer: number;
} {
  const want = stressed.normalize('NFC').trim();
  const bare = stripStress(want);
  const variants: string[] = [];
  for (let k = 0; k < bare.length; k++) {
    if (!VOWELS.includes(bare[k].toLowerCase())) continue;
    variants.push(bare.slice(0, k + 1) + ACUTE + bare.slice(k + 1));
  }
  return { variants, answer: variants.indexOf(want) };
}
