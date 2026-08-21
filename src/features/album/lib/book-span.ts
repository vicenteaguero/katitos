import { DateTime } from 'luxon';

/**
 * "Jun – Aug 2026", "from Jun 2026", or nothing at all.
 *
 * Lived inside the shelf until the cover needed to say the same thing in gilt;
 * two copies of a date formatter is how a book ends up disagreeing with its own
 * spine.
 */
export function bookSpan(book: {
  starts_on?: string | null;
  ends_on?: string | null;
}): string {
  const fmt = (d: string) => DateTime.fromISO(d).toFormat('LLL yyyy');
  if (book.starts_on && book.ends_on) {
    const a = fmt(book.starts_on);
    const b = fmt(book.ends_on);
    return a === b ? a : `${a} – ${b}`;
  }
  if (book.starts_on) return `from ${fmt(book.starts_on)}`;
  if (book.ends_on) return `until ${fmt(book.ends_on)}`;
  // Nothing at all beats "no dates yet" sitting under every new album.
  return '';
}
