import { useEffect, useLayoutEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import './roller.css';

/** One row of the wheel, in pixels. Five of them are visible. */
const ROW = 34;
const VISIBLE = 5;

export interface RollerProps<T> {
  values: readonly T[];
  /** The one in the window. Out-of-range is clamped, never crashed. */
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
  label?: string;
  className?: string;
}

/**
 * The iOS wheel, for the two numbers a bet is made of.
 *
 * A text field asks you to type "2.10" with a thumb, on a form you fill in
 * while the match is about to start. A wheel is one flick and it cannot hold a
 * value that is not allowed: the odds only exist between 1.01 and 4, the stake
 * only in round pesos, and neither can be half-typed.
 *
 * It is a scroller, not a widget: CSS snap points do the settling, so it has
 * the weight and the rubber band of the native one and none of its code. The
 * band across the middle is the selection; everything else fades out behind a
 * mask.
 */
export function Roller<T>({
  values,
  value,
  onChange,
  format,
  label,
  className,
}: RollerProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const settling = useRef<number | null>(null);
  const clicked = useRef(0);

  const index = Math.max(0, values.indexOf(value));
  const text = (v: T) => (format ? format(v) : String(v));

  // Put the wheel where the value is. In a dialog that is still opening the
  // scroller can have no height yet, so it is done again on the next frame.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const put = () => {
      if (Math.round(el.scrollTop / ROW) !== index) el.scrollTop = index * ROW;
    };
    put();
    const id = requestAnimationFrame(put);
    return () => cancelAnimationFrame(id);
  }, [index]);

  useEffect(
    () => () => {
      if (settling.current) window.clearTimeout(settling.current);
    },
    []
  );

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(
      values.length - 1,
      Math.max(0, Math.round(el.scrollTop / ROW))
    );
    // The click of the wheel going past a number, which is most of why the
    // native one feels like a machine and not a list.
    if (i !== clicked.current) {
      clicked.current = i;
      navigator.vibrate?.(8);
    }
    if (settling.current) window.clearTimeout(settling.current);
    settling.current = window.setTimeout(() => {
      const next = values[i];
      if (next !== undefined && next !== value) onChange(next);
    }, 90);
  };

  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
      )}
      <div className="relative" style={{ height: ROW * VISIBLE }}>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-lg bg-fg/[0.07]"
          style={{ height: ROW, border: '1px solid rgba(228,195,106,.22)' }}
        />
        <div
          ref={ref}
          onScroll={onScroll}
          role="listbox"
          aria-label={label}
          tabIndex={0}
          className="roller h-full overflow-y-auto overscroll-contain"
          style={{ paddingTop: ROW * 2, paddingBottom: ROW * 2 }}
        >
          {values.map((v, i) => (
            <div
              key={i}
              role="option"
              aria-selected={i === index}
              className={cn(
                'roller-row flex items-center justify-center font-sans tabular-nums',
                i === index
                  ? 'text-[16px] font-semibold text-fg'
                  : 'text-[15px] text-muted/60'
              )}
              style={{ height: ROW }}
            >
              {text(v)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
