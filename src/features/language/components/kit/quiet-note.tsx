import { Moon } from 'lucide-react';
import { cn } from '@kernel/lib';

/**
 * What time it is for him, and whether his phone will buzz.
 *
 * At night the app keeps quiet on its own; the one word in gold lets her
 * override that when it matters.
 */
export function QuietNote({
  clock,
  asleep,
  wake,
  onWake,
  className,
}: {
  clock: string | null;
  asleep: boolean;
  wake: boolean;
  onWake: (wake: boolean) => void;
  className?: string;
}) {
  if (!clock) return null;
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded bg-surface-2 px-3 py-2.5 font-sans text-xs font-medium leading-relaxed text-muted/80',
        className
      )}
    >
      {asleep && <Moon className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span>
        It's {clock} for him
        {asleep
          ? `${wake ? ', and his phone will buzz' : ', quiet delivery. He finds it on his home screen'}. `
          : '. '}
        {asleep && (
          <button
            type="button"
            onClick={() => onWake(!wake)}
            className="font-bold text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {wake ? 'Keep it quiet' : 'Buzz anyway'}
          </button>
        )}
      </span>
    </p>
  );
}
