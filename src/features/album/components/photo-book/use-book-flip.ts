import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useDrag } from '@use-gesture/react';

export type TurnDir = 'next' | 'prev';

const DISTANCE_THRESHOLD = 0.3; // fraction of page width to commit a turn
const VELOCITY_THRESHOLD = 0.4; // flick speed (magnitude)

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Drag-to-turn for the single-page photo book. The active leaf's rotateY is
 * written IMPERATIVELY to `leafRef.current.style` (never per-frame React state);
 * `--pb-fold` rides along so the peel shade deepens as the page folds into the
 * gutter (the LEFT spine is the rotation origin for BOTH directions).
 *
 * Geometry — the page turns into the clipped left gutter:
 *   • next: leaf = current page, rotateY  0   → −180 (folds away, next revealed)
 *   • prev: leaf = previous page, rotateY −180 →  0  (swings back out of gutter)
 *
 * On release past threshold/velocity we add `.pb-snap` and animate to the
 * target; the `transform` transitionend commits the new index with `flushSync`,
 * and a `useLayoutEffect` keyed on `index` clears the leaf in the same paint so
 * the just-mounted page never flashes rotated. Honors reduced motion (instant).
 */
export function useBookFlip({
  index,
  count,
  setIndex,
  leafRef,
}: {
  index: number;
  count: number;
  setIndex: (n: number) => void;
  leafRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [turning, setTurning] = useState<{ dir: TurnDir } | null>(null);
  const dirRef = useRef<TurnDir>('next');
  const committingRef = useRef(false);
  const autoRef = useRef(false); // button-initiated turn (auto-animate)
  const busyRef = useRef(false); // a turn is in flight
  const degRef = useRef(0); // last angle written to the leaf

  const canNext = index < count - 1;
  const canPrev = index > 0;

  const clearLeaf = useCallback(() => {
    busyRef.current = false;
    committingRef.current = false;
    const el = leafRef.current;
    if (el) {
      el.classList.remove('pb-snap');
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.removeProperty('--pb-fold');
    }
  }, [leafRef]);

  // After a commit, the new page is already mounted beneath — clear the leaf in
  // the same layout tick as the index change so nothing paints mid-rotation.
  useLayoutEffect(() => {
    clearLeaf();
    setTurning(null);
  }, [index, clearLeaf]);

  const setLeaf = useCallback(
    (deg: number, snap: boolean) => {
      const el = leafRef.current;
      if (!el) return;
      el.style.transformOrigin = 'left center';
      el.style.setProperty(
        '--pb-fold',
        String(Math.min(1, Math.abs(deg) / 180))
      );
      el.classList.toggle('pb-snap', snap);
      el.style.transform = `rotateY(${deg}deg)`;
      degRef.current = deg;
    },
    [leafRef]
  );

  const commit = useCallback(
    (dir: TurnDir) => {
      committingRef.current = true;
      const next = dir === 'next' ? index + 1 : index - 1;
      flushSync(() => setIndex(next));
    },
    [index, setIndex]
  );

  const animateTo = useCallback(
    (dir: TurnDir) => {
      if (prefersReducedMotion()) {
        commit(dir);
        return;
      }
      committingRef.current = true;
      const target = dir === 'next' ? -180 : 0;
      // Already there (e.g. a flick with no travel)? No transition will fire —
      // commit now rather than wait forever on `transitionend`.
      if (Math.abs(degRef.current - target) < 0.5) {
        commit(dir);
        return;
      }
      requestAnimationFrame(() => setLeaf(target, true));
    },
    [commit, setLeaf]
  );

  const springBack = useCallback(
    (dir: TurnDir) => {
      committingRef.current = false;
      const target = dir === 'next' ? 0 : -180;
      if (prefersReducedMotion() || Math.abs(degRef.current - target) < 0.5) {
        clearLeaf();
        setTurning(null);
        return;
      }
      requestAnimationFrame(() => setLeaf(target, true));
    },
    [clearLeaf, setLeaf]
  );

  // Position a freshly-mounted leaf at its start angle (no flash), and kick off
  // button-initiated turns once the element exists.
  useLayoutEffect(() => {
    if (!turning) return;
    setLeaf(turning.dir === 'next' ? 0 : -180, false);
    if (autoRef.current) {
      autoRef.current = false;
      requestAnimationFrame(() => animateTo(turning.dir));
    }
  }, [turning, setLeaf, animateTo]);

  const onLeafTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== 'transform') return; // ignore the --pb-fold tween
      if (committingRef.current) commit(dirRef.current);
      else {
        clearLeaf();
        setTurning(null);
      }
    },
    [commit, clearLeaf]
  );

  const start = useCallback(
    (dir: TurnDir, auto: boolean) => {
      if (busyRef.current) return false;
      if (dir === 'next' ? !canNext : !canPrev) return false;
      busyRef.current = true;
      dirRef.current = dir;
      autoRef.current = auto;
      setTurning({ dir });
      return true;
    },
    [canNext, canPrev]
  );

  const bind = useDrag(
    ({ first, last, movement: [mx], velocity: [vx], event, cancel }) => {
      const dir: TurnDir = mx < 0 ? 'next' : 'prev';
      if (first) {
        if (!start(dir, false)) cancel?.();
        return; // leaf mounts on the next render
      }
      if (!busyRef.current) return;
      const d = dirRef.current;
      const width =
        (event?.currentTarget as HTMLElement | null)?.clientWidth ?? 1;
      const raw = d === 'next' ? -mx : mx; // forward progress in the locked dir
      const frac = Math.min(1, Math.max(0, raw) / width);
      if (last) {
        const passed = frac > DISTANCE_THRESHOLD || vx > VELOCITY_THRESHOLD;
        if (passed) animateTo(d);
        else springBack(d);
        return;
      }
      const deg = d === 'next' ? -180 * frac : -180 * (1 - frac);
      setLeaf(deg, false);
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
  );

  const goNext = useCallback(() => {
    if (start('next', true)) return;
  }, [start]);
  const goPrev = useCallback(() => {
    if (start('prev', true)) return;
  }, [start]);

  return {
    bind,
    turning,
    canNext,
    canPrev,
    goNext,
    goPrev,
    onLeafTransitionEnd,
  };
}
