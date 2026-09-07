import { Check, Phone } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { Habit } from '../types';
import '../streak.css';

export interface CallPillProps {
  habit: Habit;
  done: boolean;
  interactive: boolean;
  onToggle?: () => void;
  /** Who ticked it, when it was the other one. */
  byName?: string | null;
}

/**
 * The call, which is not one habit among four.
 *
 * It is the only thing on this screen that belongs to both of us and that
 * either of us can answer for, so it gets the full width and a sentence rather
 * than a circle in a row of circles. Ticked, the whole bar lights: from across
 * the room you can tell whether we talked today without reading anything.
 */
export function CallPill({
  habit,
  done,
  interactive,
  onToggle,
  byName,
}: CallPillProps) {
  const press = () => {
    if (!interactive) return;
    navigator.vibrate?.(done ? [0, 12] : [0, 26]);
    onToggle?.();
  };

  return (
    <button
      type="button"
      onClick={press}
      disabled={!interactive}
      aria-pressed={done}
      aria-label={habit.title}
      className={cn(
        'call-pill relative flex w-full items-center gap-2 rounded-full p-1 pr-3 text-left',
        interactive ? 'lift-press' : 'cursor-default',
        done && 'call-pill--on'
      )}
      style={
        done
          ? {
              background:
                'linear-gradient(100deg, rgba(228,195,106,.22), rgba(110,20,35,.28))',
              border: '1px solid rgba(228,195,106,.45)',
            }
          : {
              background: 'rgba(110,20,35,.24)',
              border: '1px solid rgba(228,195,106,.18)',
            }
      }
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
        style={
          done
            ? { background: 'linear-gradient(150deg, #e4c36a, #9c7a2e)' }
            : { background: 'rgba(0,0,0,.28)' }
        }
      >
        <Phone
          className={cn('h-[14px] w-[14px]', done ? 'text-bg' : 'text-gold/70')}
          strokeWidth={2.2}
        />
      </span>

      {/* One line, ticked or not. A bar that grows when you tap it makes the
          whole card jump, and this is the tap you make every day. */}
      <span
        className={cn(
          'min-w-0 flex-1 truncate font-sans text-[13px] font-semibold',
          done ? 'text-fg' : 'text-fg/70'
        )}
      >
        {habit.title}
        {done && byName && (
          <span className="font-normal text-muted"> · {byName}</span>
        )}
      </span>

      <span
        className={cn(
          'grid h-5 w-5 shrink-0 place-items-center rounded-full',
          done ? 'hb-seal bg-success text-accent-fg' : 'text-transparent'
        )}
        style={
          done ? undefined : { border: '1.5px solid rgba(228,195,106,.3)' }
        }
      >
        <Check className="h-3 w-3" strokeWidth={3.4} />
      </span>
    </button>
  );
}
