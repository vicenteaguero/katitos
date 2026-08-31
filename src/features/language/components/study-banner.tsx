import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { StatPill } from '@kernel/ui';
import { useLanguages } from '../lib/languages';
import { useAllVocab, useMyReviews } from '../api/vocab';
import { buildSession, isDue, mastery } from '../lib/srs';

/**
 * How the lessons are actually going, and the way into today's practice.
 *
 * This is the number that makes it a course rather than a pile of flashcards:
 * "12 waiting for you" is a thing you can act on.
 */
export function StudyBanner() {
  const { learning } = useLanguages();
  const { data: words } = useAllVocab(learning);
  const { data: reviews } = useMyReviews();

  // Only once BOTH halves are here — with the reviews still on their way,
  // every word looked due and the number jumped after a second.
  if (!words || !reviews) return null;
  const cards = words;
  const due = cards.filter((c) => isDue(reviews.get(c.id))).length;
  const known = cards.filter(
    (c) => mastery(reviews.get(c.id)) === 'known'
  ).length;
  const session = buildSession(cards, reviews).length;

  if (cards.length === 0) return null;

  return (
    <Link
      to="/language/study"
      className="lift-press flex items-center gap-3 rounded-lg rounded-tl-xl bg-surface-2 px-4 py-3 shadow-loge"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold text-fg">
          {session > 0 ? 'Practice' : 'All caught up'}
        </span>
        <span className="block font-sans text-xs text-muted">
          {/* The session is what a tap actually gives: twenty cards, not the
              whole backlog. The backlog is said too when it is bigger. */}
          {session > 0
            ? `${session} to practise${due > session ? ` · ${due} due` : ''}`
            : 'nothing due — come back tomorrow'}
        </span>
      </span>
      <StatPill value={known} label="known" />
    </Link>
  );
}
