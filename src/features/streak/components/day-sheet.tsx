import { DateTime } from 'luxon';
import { Sheet, Kicker } from '@kernel/ui';
import { usePartner } from '@kernel/auth';
import { useToggleEntry } from '../api/streak.mutations';
import { activeOn } from '../lib/streak';
import { petName } from '../lib/names';
import type { StreakView } from '../lib/use-streak';
import { CallPill } from './call-pill';
import { HabitButton } from './habit-button';

export interface DaySheetProps {
  day: string | null;
  view: StreakView;
  onClose: () => void;
}

/**
 * One day, opened.
 *
 * Its whole reason to exist is the second row: the day before yesterday is
 * closed and this is where you find out what actually broke it, but yesterday
 * is still open and this is where you fix it.
 */
export function DaySheet({ day, view, onClose }: DaySheetProps) {
  const { self, partner } = usePartner();
  const toggle = useToggleEntry();

  const open = day !== null && view.isOpen(day);
  const status = day ? view.statusOf(day) : null;
  const heading = day
    ? DateTime.fromISO(day, { zone: 'utc' }).toFormat('cccc d LLLL')
    : '';

  const mine = day ? view.mine.filter((h) => activeOn(h, day)) : [];
  const theirs = day ? view.theirs.filter((h) => activeOn(h, day)) : [];
  const shared =
    day && view.shared && activeOn(view.shared, day) ? view.shared : null;

  return (
    <Sheet
      open={day !== null}
      onClose={onClose}
      title={heading}
      subtitle={status?.complete ? 'complete' : open ? 'still open' : 'closed'}
      size="auto"
    >
      {day && (
        <div className="space-y-4 pb-2">
          {shared && (
            <CallPill
              habit={shared}
              done={view.isDone(shared.id, day)}
              interactive={open}
              onToggle={() =>
                toggle.mutate({
                  habitId: shared.id,
                  day,
                  on: !view.isDone(shared.id, day),
                  shared: true,
                  selfName: self?.display_name,
                })
              }
            />
          )}

          <Side
            label="You"
            habits={mine}
            day={day}
            view={view}
            interactive={open}
            onToggle={(id, on) => toggle.mutate({ habitId: id, day, on })}
          />

          {theirs.length > 0 && (
            <Side
              label={partner?.display_name ?? petName(partner?.role)}
              habits={theirs}
              day={day}
              view={view}
              interactive={false}
            />
          )}
        </div>
      )}
    </Sheet>
  );
}

function Side({
  label,
  habits,
  day,
  view,
  interactive,
  onToggle,
}: {
  label: string;
  habits: StreakView['mine'];
  day: string;
  view: StreakView;
  interactive: boolean;
  onToggle?: (habitId: string, on: boolean) => void;
}) {
  if (habits.length === 0) return null;
  return (
    <div>
      <Kicker>{label}</Kicker>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {habits.map((h) => (
          <HabitButton
            key={h.id}
            habit={h}
            done={view.isDone(h.id, day)}
            interactive={interactive}
            weekly={h.schedule === 'weekly' ? view.weekly(h, day) : undefined}
            onToggle={() => onToggle?.(h.id, !view.isDone(h.id, day))}
          />
        ))}
      </div>
    </div>
  );
}
