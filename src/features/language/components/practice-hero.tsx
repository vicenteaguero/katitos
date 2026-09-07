import { Link } from 'react-router';
import { Play } from 'lucide-react';
import { DateTime } from 'luxon';
import { Card, Ring } from '@kernel/ui';
import { useLanguages } from '../lib/languages';
import { useAllVocab, useMyReviews } from '../api/vocab';
import { buildSession } from '../lib/srs';

/**
 * The first thing on the language home: how today's practice is going, and
 * the way into it.
 *
 * The ring is today's work, not the whole backlog: what you have already
 * done today over what a tap would still give you. "12 of 20 done, 8
 * waiting for you" is a thing you can act on; a lifetime count is not.
 */
export function PracticeHero() {
  const { learning } = useLanguages();
  const { data: words } = useAllVocab(learning);
  const { data: reviews } = useMyReviews();

  // Only once BOTH halves are here - with the reviews still on their way,
  // every word looked due and the number jumped after a second.
  if (!words || !reviews || words.length === 0) return null;

  const today = DateTime.now().toISODate();
  let done = 0;
  for (const r of reviews.values()) {
    if (
      r.last_seen_at &&
      DateTime.fromISO(r.last_seen_at).toISODate() === today
    )
      done += 1;
  }
  const waiting = buildSession(words, reviews).length;
  const total = done + waiting;

  const line =
    waiting > 0
      ? done > 0
        ? `${done} of ${total} done, ${waiting} waiting for you`
        : `${waiting} waiting for you`
      : done > 0
        ? `${done} done today, nothing more due`
        : 'All caught up, nothing due';

  return (
    <Link
      to="/language/study"
      className="lift-press block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <Card tone="hero" className="flex items-center gap-3.5">
        <Ring value={done} max={Math.max(total, 1)} label="Practised today">
          <span className="text-[15px]">{waiting > 0 ? waiting : done}</span>
        </Ring>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-[17px] font-extrabold text-fg">
            Practise today
          </span>
          <span className="block font-sans text-xs font-medium text-muted">
            {line}
          </span>
        </span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
          <Play className="h-[18px] w-[18px]" fill="currentColor" />
        </span>
      </Card>
    </Link>
  );
}
