import { Check } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { Habit } from '../types';
import '../streak.css';

export interface HabitButtonProps {
  habit: Habit;
  done: boolean;
  /** Can this person tick it right now? A closed day, or someone else's habit. */
  interactive: boolean;
  onToggle?: () => void;
  /** For a weekly habit: how many of the target are in this week. */
  weekly?: { done: number; target: number };
  size?: 'md' | 'sm' | 'xs';
  /** The name under the circle. Off on Home, where the emoji is the label. */
  labelled?: boolean;
}

/**
 * One habit, as a thing you press.
 *
 * The brief was "the icon, and you literally press it and it gets a tick", so
 * it is a circle with the emoji in it and nothing else - no checkbox, no row,
 * no confirmation.
 *
 * Note what is NOT here: no `overflow` anywhere on the way down to this button.
 * The press grows the circle past its own box and the seal hangs off the
 * corner, so any ancestor that clips - a scroller, a card with `overflow-hidden`
 * - shears the animation in half. Whoever wraps this owes it room.
 */
export function HabitButton({
  habit,
  done,
  interactive,
  onToggle,
  weekly,
  size = 'md',
  labelled = true,
}: HabitButtonProps) {
  const px = size === 'md' ? 52 : size === 'sm' ? 38 : 34;
  const shared = habit.kind === 'shared';

  const press = () => {
    if (!interactive) return;
    navigator.vibrate?.(done ? [0, 12] : [0, 26]);
    onToggle?.();
  };

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center gap-1',
        // Lifted while it is on, so its glow lies over its neighbours instead
        // of under them.
        done && 'relative z-10',
        labelled && 'w-[62px]'
      )}
    >
      <button
        type="button"
        onClick={press}
        disabled={!interactive}
        aria-pressed={done}
        aria-label={habit.title}
        className={cn(
          'relative grid place-items-center rounded-full',
          interactive ? 'lift-press' : 'cursor-default',
          !interactive && !done && 'opacity-45'
        )}
        style={{ width: px, height: px }}
      >
        {weekly && (
          <WeeklyRing size={px} done={weekly.done} target={weekly.target} />
        )}
        <span
          className={cn(
            'hb-dot grid h-full w-full place-items-center rounded-full',
            done && 'hb-dot--on'
          )}
          style={
            done
              ? {
                  background: 'linear-gradient(150deg, #e4c36a, #9c7a2e)',
                  border: '1px solid rgba(255,241,201,.5)',
                  boxShadow: '0 6px 18px -8px rgba(228,195,106,.75)',
                }
              : {
                  background: shared
                    ? 'rgba(110,20,35,.28)'
                    : 'var(--color-surface-2)',
                  border: '1px solid rgba(228,195,106,.22)',
                }
          }
        >
          <span
            aria-hidden="true"
            className={cn(
              'leading-none',
              size === 'md' ? 'text-[22px]' : 'text-[18px]'
            )}
            style={{
              filter: done ? 'none' : 'grayscale(.2)',
              opacity: done ? 1 : 0.82,
            }}
          >
            {habit.emoji}
          </span>
        </span>

        {done && <Seal />}
      </button>

      {labelled && (
        <span className="w-full text-center leading-tight">
          <span className="block truncate font-sans text-[10px] font-medium text-muted">
            {habit.title}
          </span>
          {/* The count goes under the name, not instead of it: a row of
              fractions tells you nothing about what you promised. */}
          {weekly && (
            <span className="block font-sans text-[9px] font-semibold tabular-nums text-gold/80">
              {weekly.done}/{weekly.target}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/** The little gilt seal that drops onto a finished habit. */
export function Seal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'hb-seal absolute -bottom-0.5 -right-0.5 grid h-[17px] w-[17px] place-items-center rounded-full bg-success text-accent-fg',
        className
      )}
      style={{ border: '1.5px solid var(--color-bg)' }}
    >
      <Check className="h-3 w-3" strokeWidth={3.4} />
    </span>
  );
}

/** The thin gilt arc around a habit that only has to happen N times a week. */
function WeeklyRing({
  size,
  done,
  target,
}: {
  size: number;
  done: number;
  target: number;
}) {
  const stroke = 2.5;
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, done / target) : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(251,245,240,.1)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e4c36a"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}
