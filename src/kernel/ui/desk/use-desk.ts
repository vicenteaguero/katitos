import { useEffect } from 'react';
import { create } from 'zustand';
import { useMediaQuery } from '../../hooks/use-media-query';

/**
 * Where the desk begins. Tablets and up; a phone never sees any of this -
 * not even on its side, which is why height is part of the question. Kept
 * in step with the two media queries in index.css by hand.
 */
export const DESK_QUERY = '(min-width: 768px) and (min-height: 600px)';

interface DeskState {
  /** How many mounted routes have asked for a desk. */
  count: number;
  enter: () => void;
  leave: () => void;
}

const useDeskStore = create<DeskState>((set) => ({
  count: 0,
  enter: () => set((s) => ({ count: s.count + 1 })),
  leave: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));

/**
 * Let THIS route have a desk.
 *
 * The app is deliberately phone-shaped and stays that way - but she builds
 * her lessons on a computer, and a 32rem column is a miserable place to lay
 * out a course. A route that calls this gets the whole window from a tablet
 * up: the shell drops its cap, the bottom tab bar becomes a side rail, and the
 * route lays itself out in panes with `Desk`. Phones never see a difference.
 *
 * The signal is an attribute on <html> (for the stylesheet) and a counter
 * (for the shell). A counter, not a flag, so moving from one desk route to
 * another never flickers back to the phone shape in between.
 */
export function useDesk(enabled = true): void {
  const enter = useDeskStore((s) => s.enter);
  const leave = useDeskStore((s) => s.leave);
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.setAttribute('data-desk', '');
    enter();
    return () => {
      leave();
      if (useDeskStore.getState().count === 0)
        root.removeAttribute('data-desk');
    };
  }, [enabled, enter, leave]);
}

/** Is a desk route open, on a screen that has room for one? */
export function useIsDesk(): boolean {
  const asked = useDeskStore((s) => s.count > 0);
  const wide = useMediaQuery(DESK_QUERY);
  return asked && wide;
}
