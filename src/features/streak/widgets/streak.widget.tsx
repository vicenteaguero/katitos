import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Flame } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner, useUserId } from '@kernel/auth';
import { cn } from '@kernel/lib';
import { useToggleEntry } from '../api/streak.mutations';
import { activeOn } from '../lib/streak';
import { petName } from '../lib/names';
import { useStreak } from '../lib/use-streak';
import { HabitButton } from '../components/habit-button';
import { CallPill } from '../components/call-pill';
import { DaySheet } from '../components/day-sheet';
import '../streak.css';

/**
 * The streak, on the home screen.
 *
 * Two rows: the number with what it is worth, and the call. Your own habits
 * ride along the top row as bare circles - the emoji IS the label there, and a
 * caption under each one bought nothing and cost a third of the card.
 *
 * It sits directly under Send love because it is the one thing here you have to
 * DO rather than look at, and a card you touch every morning of your life
 * cannot take half a screen to say one number.
 *
 * Nothing between here and those circles clips. The press overshoots its own
 * box and the seal hangs off the corner; a scroller or an `overflow-hidden`
 * card shears both, which is exactly what the first version did.
 */
export function StreakWidget() {
  const { self, partner } = usePartner();
  const userId = useUserId();
  const view = useStreak();
  const toggle = useToggleEntry();
  const [sheetDay, setSheetDay] = useState<string | null>(null);

  const { today, partnerToday, shared, mine, streak } = view;
  const todayStatus = view.statusOf(today);

  // The sweep fires once, on the tick that finishes the day for both of us.
  const [celebrate, setCelebrate] = useState(false);
  const wasComplete = useRef<boolean | null>(null);
  useEffect(() => {
    const done = todayStatus.complete;
    const rose = wasComplete.current === false && done;
    wasComplete.current = done;
    if (!rose) return;
    setCelebrate(true);
    const t = window.setTimeout(() => setCelebrate(false), 1200);
    return () => window.clearTimeout(t);
  }, [todayStatus.complete]);

  if (view.isLoading || !shared) return null;

  const todaysMine = mine.filter((h) => activeOn(h, today));
  const yesterday =
    view.openDays.find((d) => d !== today && !view.statusOf(d).complete) ??
    null;

  // Their side is judged on the date they are actually living, not on mine.
  const theirDay = partnerToday < today ? partnerToday : today;
  const theirs = view.statusOf(theirDay).theirs;
  const theirName =
    partner?.display_name?.split(' ')[0] ?? petName(partner?.role);

  const callBy = view.tickedBy(shared.id, today);
  const callByName = !callBy ? null : callBy === userId ? 'you' : theirName;

  return (
    <>
      {/* The hero card by hand rather than <Card tone="hero" />: `cn` is a plain
          joiner, so the tone's own `p-4` beats any padding passed in - and on
          this card every pixel of padding is one you can see. */}
      <div
        className="relative rounded-card border border-gold/[0.22] p-3"
        style={{ background: 'linear-gradient(135deg, #2a0f1a, #1a0b13)' }}
      >
        {celebrate && (
          // Its own clipped layer: the card must not clip, and the sweep must.
          <span
            aria-hidden="true"
            className="streak-foil pointer-events-none absolute inset-0 overflow-hidden rounded-card"
          />
        )}

        <div className="flex items-center gap-2">
          <Link
            to="/streak"
            className="lift-press flex min-w-0 flex-1 items-center gap-2"
          >
            <Flame
              className={cn(
                'h-5 w-5 shrink-0 text-gold',
                streak.days > 0 && 'streak-flame'
              )}
              strokeWidth={1.8}
            />
            <span className="gilt-text gilt-figures shrink-0 font-display text-[1.75rem] font-semibold leading-none">
              {streak.days}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-sans text-[0.66rem] font-semibold uppercase leading-tight tracking-[0.1em] text-muted">
                {streak.days === 1 ? 'day' : 'days'} in a row
                {streak.atStake > 0 && (
                  <span className="normal-case tracking-normal text-copper">
                    {' '}
                    +{streak.atStake} at stake
                  </span>
                )}
              </span>
              <span className="block truncate font-sans text-[10.5px] leading-tight text-muted/80">
                {theirs.required === 0
                  ? `${theirName}: no habit yet`
                  : theirs.done === theirs.required
                    ? `${theirName} is all in 🤍`
                    : `${theirName} ${theirs.done}/${theirs.required}`}
              </span>
            </span>
          </Link>

          {todaysMine.map((h) => (
            <HabitButton
              key={h.id}
              habit={h}
              done={view.isDone(h.id, today)}
              interactive
              size={todaysMine.length > 2 ? 'xs' : 'sm'}
              labelled={false}
              weekly={
                h.schedule === 'weekly' ? view.weekly(h, today) : undefined
              }
              onToggle={() =>
                toggle.mutate({
                  habitId: h.id,
                  day: today,
                  on: !view.isDone(h.id, today),
                })
              }
            />
          ))}
        </div>

        <div className="mt-2">
          <CallPill
            habit={shared}
            done={view.isDone(shared.id, today)}
            interactive
            byName={callByName}
            today
            onToggle={() =>
              toggle.mutate({
                habitId: shared.id,
                day: today,
                on: !view.isDone(shared.id, today),
                shared: true,
                selfName: self?.display_name,
              })
            }
          />
        </div>

        {/* Rare, and the whole reason the grace window exists - so when it is
            here it gets a line of its own rather than a corner of one. */}
        {yesterday && (
          <button
            type="button"
            onClick={() => setSheetDay(yesterday)}
            className="lift-press mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full py-1 font-sans text-[10.5px] font-semibold text-warning"
            style={{
              background: 'rgba(217,201,163,.1)',
              border: '1px solid rgba(217,201,163,.28)',
            }}
          >
            {DateTime.fromISO(yesterday, { zone: 'utc' }).toFormat('cccc')} is
            still open — fix it
          </button>
        )}
      </div>

      <DaySheet day={sheetDay} view={view} onClose={() => setSheetDay(null)} />
    </>
  );
}
