import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { useAllVocab, useMyReviews } from '../api/vocab';
import { buildSession, isDue, mastery } from '../lib/srs';

/**
 * How the lessons are actually going, and the way into today's practice.
 *
 * This is the number that makes it a course rather than a pile of flashcards:
 * "12 waiting for you" is a thing you can act on.
 */
export function StudyBanner() {
  const { data: words } = useAllVocab('ru');
  const { data: reviews } = useMyReviews();

  const cards = words ?? [];
  const map = reviews ?? new Map();
  const due = cards.filter((c) => isDue(map.get(c.id))).length;
  const known = cards.filter((c) => mastery(map.get(c.id)) === 'known').length;
  const session = buildSession(cards, map).length;

  if (cards.length === 0) return null;

  return (
    <Link
      to="/language/study"
      className="lift-press flex items-center gap-4 rounded-lg rounded-tl-[1.75rem] bg-surface-2 px-5 py-4 shadow-loge"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold text-fg">
          {session > 0 ? 'Practice' : 'All caught up'}
        </span>
        <span className="block font-sans text-xs text-muted">
          {session > 0
            ? `${due} waiting for you`
            : 'nothing due — come back tomorrow'}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-display text-xl font-semibold tabular-nums text-gold">
          {known}
        </span>
        <span className="block font-sans text-[0.55rem] uppercase tracking-[0.14em] text-muted">
          known
        </span>
      </span>
    </Link>
  );
}
