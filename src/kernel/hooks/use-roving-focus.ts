import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

/**
 * One tab stop for a group of buttons; the arrow keys move inside it.
 *
 * Thirty-four letter keys between the answer box and Check were thirty-four
 * presses of Tab. With roving focus the group is one stop, and ← → (and ↑ ↓)
 * walk the keys — the pattern every toolbar and radio group on the web uses.
 *
 *     const roving = useRovingFocus(items.length);
 *     <div {...roving.containerProps}>
 *       {items.map((it, i) => <button {...roving.itemProps(i)}>…</button>)}
 */
export function useRovingFocus<T extends HTMLElement = HTMLElement>(
  count: number,
  {
    orientation = 'both',
    loop = true,
  }: { orientation?: 'horizontal' | 'vertical' | 'both'; loop?: boolean } = {}
) {
  const [active, setActive] = useState(0);
  const refs = useRef<(T | null)[]>([]);

  const move = useCallback(
    (to: number) => {
      if (count === 0) return;
      const next = loop
        ? ((to % count) + count) % count
        : Math.max(0, Math.min(count - 1, to));
      setActive(next);
      refs.current[next]?.focus();
    },
    [count, loop]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const horizontal = orientation !== 'vertical';
    const vertical = orientation !== 'horizontal';
    let handled = true;
    if (
      (e.key === 'ArrowRight' && horizontal) ||
      (e.key === 'ArrowDown' && vertical)
    ) {
      move(active + 1);
    } else if (
      (e.key === 'ArrowLeft' && horizontal) ||
      (e.key === 'ArrowUp' && vertical)
    ) {
      move(active - 1);
    } else if (e.key === 'Home') {
      move(0);
    } else if (e.key === 'End') {
      move(count - 1);
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  };

  const itemProps = (i: number) => ({
    ref: (el: T | null) => {
      refs.current[i] = el;
    },
    tabIndex: i === Math.min(active, Math.max(0, count - 1)) ? 0 : -1,
    onFocus: () => setActive(i),
  });

  return { active, setActive: move, itemProps, containerProps: { onKeyDown } };
}
