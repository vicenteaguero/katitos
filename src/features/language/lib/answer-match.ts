export interface MatchOptions {
  /**
   * Treat ё and е as different letters.
   *
   * Off by default, because almost nobody types ё and marking that wrong
   * teaches nothing. On for the exercises where the distinction IS the lesson:
   * все ("everyone") and всё ("everything") are different words, as are
   * узнаем and узнаём.
   */
  strictYo?: boolean;
}

/**
 * Compare a typed answer with the real one, forgivingly — but not carelessly.
 *
 * Forgiven: capitals, punctuation, a stress mark he can't type on a phone,
 * a hyphen written as a space, and ё written as е.
 *
 * NOT forgiven: missing word boundaries. Whitespace used to be deleted along
 * with the punctuation, which quietly accepted `нехочу` for `не хочу` and
 * `вдоме` for `в доме` — writing не and the prepositions separately is one of
 * the first things a Russian learner gets wrong, and marking it right taught
 * him the mistake.
 */
export function answerMatches(
  typed: string,
  expected: string,
  { strictYo = false }: MatchOptions = {}
): boolean {
  const norm = (s: string) => {
    const base = s
      // One spelling for one word. An accent typed as a separate mark and
      // one baked into the letter are the same letter — "está" pasted in one
      // form and typed in the other must match — and й must stay й rather
      // than fall apart into и and a breve that the strip below removes.
      .normalize('NFC')
      .toLowerCase()
      // A hyphen is a word boundary here: по-русски and "по русски" are the
      // same answer typed two ways.
      .replace(/[-–—]/g, ' ')
      // Punctuation goes; letters, digits and SPACES stay. Combining marks
      // (the acute she writes on a stressed vowel) are neither, so they go too.
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    return strictYo ? base : base.replace(/ё/g, 'е');
  };
  const a = norm(typed);
  return a.length > 0 && a === norm(expected);
}
