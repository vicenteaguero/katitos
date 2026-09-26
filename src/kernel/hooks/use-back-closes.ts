import { useEffect, useRef } from 'react';

/**
 * Back closes the overlay instead of leaving the page under it.
 *
 * While `open`, one extra history entry sits on top (same URL, same router
 * state, so the router does not notice it). Back pops it and calls `close`;
 * closing any other way pops it ourselves. Keep `open` true across a hand-off
 * from one overlay to the next, or the pop of the first closes the second.
 */
export function useBackCloses(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    history.pushState({ ...history.state, overlay: true }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if ((history.state as { overlay?: boolean } | null)?.overlay)
        history.back();
    };
  }, [open]);
}
