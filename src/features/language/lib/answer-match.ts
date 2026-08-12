/**
 * Compare a typed answer with the real one, forgivingly.
 *
 * A missed accent, a stray space, or ё written as е is a typing slip, not a
 * failure to know the word — and marking those wrong would teach him to hate
 * this screen.
 */
export function answerMatches(typed: string, expected: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}]/gu, '');
  return norm(typed) === norm(expected) && norm(typed).length > 0;
}
