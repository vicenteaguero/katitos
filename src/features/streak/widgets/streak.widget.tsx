import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Flame } from 'lucide-react';
import { DateTime } from 'luxon';
import { usePartner } from '@kernel/auth';
import { Card } from '@kernel/ui';
import { cn } from '@kernel/lib';
import { useToggleEntry } from '../api/streak.mutations';
import { activeOn } from '../lib/streak';
import { useStreak } from '../lib/use-streak';
import { HabitButton } from '../components/habit-button';
import { DaySheet } from '../components/day-sheet';
import '../streak.css';

/**
 * The streak, on the home screen.
 *
 * Everything here is one thumb: the number you are keeping, and the two or
 * three circles you press to keep it. No navigation is needed to tick anything -
 * going to a screen to do a thing you do every morning is the reason habit apps
 * get abandoned in week two.
 *
 * The amber line at the bottom is the whole point of the grace window: yesterday
 * is still open, and that is where a streak is actually saved.
 */
export function StreakWidget() {
  const { self, partner } = usePartner();
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
    if (wasComplete.current === false && done) {
      setCelebrate(true);
      const t = window.setTimeout(() => setCelebrate(false), 1200);
      return () => window.clearTimeout(t);
    }
    wasComplete.current = done;
  }, [todayStatus.complete]);

  if (view.isLoading || !shared) return null;

  const todaysMine = mine.filter((h) => activeOn(h, today));
  const yesterday =
    view.openDays.find((d) => d !== today && !view.statusOf(d).complete) ??
    null;

  // Her side is judged on the date she is actually living, not on mine.
  const theirDay = partnerToday < today ? partnerToday : today;
  const theirs = view.statusOf(theirDay).theirs;
  const partnerName = partner?.display_name?.split(' ')[0] ?? 'Them';

  return (
    <>
      <Card
        tone="hero"
        className={cn('relative overflow-hidden', celebrate && 'streak-foil')}
      >
        <Link
          to="/streak"
          className="lift-press flex items-center justify-between gap-3"
        >
          <span className="flex items-baseline gap-2.5">
            <Flame
              className={cn(
                'h-7 w-7 shrink-0 self-center text-gold',
                streak.days > 0 && 'streak-flame'
              )}
              strokeWidth={1.6}
            />
            <span className="gilt-text gilt-figures font-display text-[2.6rem] font-semibold leading-none">
              {streak.days}
            </span>
            <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
              {streak.days === 1 ? 'day' : 'days'} in a row
              {streak.atStake > 0 && (
                <span className="ml-1.5 normal-case tracking-normal text-copper">
                  +{streak.atStake} at stake
                </span>
              )}
            </span>
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-gold/60"
            strokeWidth={2.2}
          />
        </Link>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          <HabitButton
            habit={shared}
            done={view.isDone(shared.id, today)}
            interactive
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
          {todaysMine.map((h) => (
            <HabitButton
              key={h.id}
              habit={h}
              done={view.isDone(h.id, today)}
              interactive
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

        <p className="mt-2 font-sans text-[11px] text-muted">
          {theirs.required === 0 ? (
            <>{partnerName} has not picked a habit yet</>
          ) : theirs.done === theirs.required ? (
            <>
              {partnerName} is done for{' '}
              {theirDay === today ? 'today' : 'her day'} 🤍
            </>
          ) : (
            <>
              {partnerName}: {theirs.done}/{theirs.required}
              {theirDay !== today && ' — still yesterday for her'}
            </>
          )}
        </p>

        {yesterday && (
          <button
            type="button"
            onClick={() => setSheetDay(yesterday)}
            className="lift-press mt-2 flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left"
            style={{
              background: 'rgba(217,201,163,.09)',
              border: '1px solid rgba(217,201,163,.22)',
            }}
          >
            <span className="font-sans text-[11px] text-warning">
              {DateTime.fromISO(yesterday, { zone: 'utc' }).toFormat('cccc')} is
              still open
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 text-warning/70"
              strokeWidth={2.2}
            />
          </button>
        )}
      </Card>

      <DaySheet day={sheetDay} view={view} onClose={() => setSheetDay(null)} />
    </>
  );
}
