import { useEffect } from 'react';

/**
 * Let THIS route breathe on a big screen.
 *
 * The whole app is deliberately phone-shaped (`--app-max-width: 32rem`) and
 * stays that way — but she builds her lessons on a tablet or a laptop, and a
 * 32rem column is a miserable place to lay out a course. A route that opts in
 * gets a wide canvas from `md:` up; phones never see a difference.
 *
 * Implemented as an attribute on <html> rather than a wrapper div so it cannot
 * introduce a new stacking or containing block around the page.
 */
export function useWideLayout(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.setAttribute('data-wide', '');
    return () => root.removeAttribute('data-wide');
  }, [enabled]);
}
