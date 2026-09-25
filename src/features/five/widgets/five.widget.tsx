import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '@kernel/lib';
import { useNow } from '@kernel/hooks';
import { Card } from '@kernel/ui';
import { GOALS } from '../lib/goals';
import { splitDay } from '../lib/money';
import { localDay } from '../lib/five-days';
import {
  useFiveDays,
  useFiveMarks,
  useFiveSettings,
  useFiveWho,
} from '../api/five.queries';

/**
 * The Five on Home: five dots, and what today is worth.
 *
 * Two rows and no more. Home is already a long page, and the card's only job is
 * to be the thing you tap before you have thought about it - the screen itself is
 * where the money is explained.
 */
export function FiveWidget() {
  // Home sits open for days too, and this card names today. See the note in
  // five.route.tsx.
  const now = useNow(60_000);
  const { subject, zone } = useFiveWho();
  const subjectId = subject?.user_id ?? null;
  const today = localDay(zone, now);
  const { stakes, active } = useFiveSettings(subjectId);
  const { data: marks } = useFiveMarks(subjectId, today);
  const { data: dayRows } = useFiveDays(subjectId, today);

  if (!subjectId) return null;

  const hardDay = (dayRows ?? []).some((d) => d.day === today && d.hard_day);
  const split = splitDay({
    done: (marks ?? [])
      .filter((m) => m.day === today && !m.revoked_at)
      .map((m) => m.goal_id),
    hardDay,
    paused: !active,
    stakes,
  });
  const held = new Set(split.done);

  return (
    <Link to="/five" className="lift-press block">
      <Card tone="flat" className="flex items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
          {GOALS.map((goal) => (
            <span
              key={goal.id}
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                held.has(goal.id) ? 'bg-gold' : 'bg-fg/[0.12]'
              )}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-sm font-semibold text-fg">
            {split.done.length} of {GOALS.length} today
          </span>
          {/* No money on Home. The figure belongs on the screen that can
              explain it; here it would be a price on her morning, in the first
              thing she sees after opening the app. */}
          <span className="block font-sans text-[11px] text-muted">
            {split.free
              ? 'paused'
              : split.forgiven
                ? 'a hard day, and that is allowed'
                : split.missed.length === 0
                  ? 'all five, every one of them'
                  : 'tap what you have already done'}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Card>
    </Link>
  );
}
