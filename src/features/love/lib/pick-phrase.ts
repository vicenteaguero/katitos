import type { Tables } from '@kernel/supabase';

export type LovePhrase = Tables<'love_phrases'>;

/** The gender of whoever is RECEIVING the phrase. */
export type Gender = 'm' | 'f';

/**
 * Choose a sweet nothing that is actually addressed to the right person.
 *
 * This is the fix for the bug that prompted the whole feature: the old pool was
 * a flat array with feminine-only lines in it ('Liubimonkeykaya', 'любиминки'),
 * picked at random for either of them - so she regularly sent him phrases in
 * the feminine. Now each phrase declares who it can be sent TO, and a phrase
 * for the wrong gender is simply never eligible.
 */
export function eligiblePhrases(
  phrases: LovePhrase[],
  recipient: Gender
): LovePhrase[] {
  return phrases.filter(
    (p) => p.enabled && (p.gender === 'any' || p.gender === recipient)
  );
}

/**
 * Pick one, honouring `weight` (a phrase with weight 3 is three times as
 * likely as one with weight 1). `random` is injectable so this is testable.
 */
export function pickPhrase(
  phrases: LovePhrase[],
  recipient: Gender,
  random: () => number = Math.random
): LovePhrase | null {
  const pool = eligiblePhrases(phrases, recipient);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, p) => sum + Math.max(1, p.weight), 0);
  let roll = random() * total;
  for (const p of pool) {
    roll -= Math.max(1, p.weight);
    if (roll < 0) return p;
  }
  // Floating point can leave a sliver at the very top of the range.
  return pool[pool.length - 1];
}

/** Fill `{name}` with the recipient's pet name. */
export function renderPhrase(text: string, name: string): string {
  return text.replace(/\{name\}/g, name);
}

/**
 * The whole job: the right phrase for the right person, ready to send.
 * Returns null only if there are no usable phrases at all.
 */
export function loveNoteFor(
  phrases: LovePhrase[],
  recipient: Gender,
  name: string,
  random?: () => number
): string | null {
  const picked = pickPhrase(phrases, recipient, random);
  return picked ? renderPhrase(picked.text, name) : null;
}
