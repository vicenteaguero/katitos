import { Check } from 'lucide-react';
import { cn } from '@kernel/lib';
import type { Habit } from '../types';
import '../streak.css';

export interface HabitButtonProps {
  habit: Habit;
  done: boolean;
  /** Can this person tick it right now? A closed day or her habit says no. */
  interactive: boolean;
  onToggle?: () => void;
  /** For a weekly habit: how many of the target are in this week. */
  weekly?: { done: number; target: number };
  size?: 'md' | 'sm';
}

/**
 * One habit, as a thing you press.
 *
 * The whole design brief for this was "the icon, and you literally press it and
 * it gets a tick". So it is a circle with the emoji in it and nothing else - no
 * checkbox, no row, no confirmation. Off it is a quiet outline; on it is filled
 * gilt with a seal in the corner, and the ring around a weekly one fills a third
 * at a time.
 */
export function HabitButton({
  habit,
  done,
  interactive,
  onToggle,
  weekly,
  size = 'md',
}: HabitButtonProps) {
  const px = size === 'md' ? 58 : 46;
  const shared = habit.kind === 'shared';

  const press = () => {
    if (!interactive) return;
    navigator.vibrate?.(done ? [0, 12] : [0, 26]);
    onToggle?.();
  };

  return (
    <div className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
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
              size === 'md' ? 'text-[24px]' : 'text-[19px]'
            )}
            style={{
              filter: done ? 'none' : 'grayscale(.45)',
              opacity: done ? 1 : 0.62,
            }}
          >
            {habit.emoji}
          </span>
        </span>

        {done && (
          <span
            aria-hidden="true"
            className="hb-seal absolute -bottom-0.5 -right-0.5 grid h-[19px] w-[19px] place-items-center rounded-full bg-success text-accent-fg"
            style={{ border: '1.5px solid var(--color-bg)' }}
          >
            <Check className="h-3 w-3" strokeWidth={3.4} />
          </span>
        )}
      </button>

      <span
        className="w-full overflow-hidden text-center font-sans text-[10px] font-medium leading-tight text-muted"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {weekly && !done ? `${weekly.done}/${weekly.target}` : habit.title}
      </span>
    </div>
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
