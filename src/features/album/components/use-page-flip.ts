import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useDrag } from '@use-gesture/react';

export type FlipDir = 'forward' | 'backward';

interface FlipState {
  dir: FlipDir | null;
  dragging: boolean;
}

const DISTANCE_THRESHOLD = 0.35; // fraction of width
const VELOCITY_THRESHOLD = 0.4;

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Drag-to-turn controller for the book.
 *
 * The active leaf's rotateY is written IMPERATIVELY to `leafRef.current.style`
 * (never per-frame React state). On release past threshold/velocity we add
 * `.snap` (CSS transition) and animate to ±180; on `transitionend` we commit
 * the new spread with `flushSync` and clear the leaf transform in the same
 * layout tick (`useLayoutEffect` keyed on `spread`) to avoid a -180° flash.
 * Below threshold we spring back to 0.
 *
 * Forward = right leaf, `transform-origin: left center`, 0 → −180.
 * Backward = left leaf, `transform-origin: right center`, 0 → +180.
 */
export function usePageFlip({
  spread,
  maxSpread,
  setSpread,
  leafRef,
}: {
  spread: number;
  maxSpread: number;
  setSpread: (n: number) => void;
  leafRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [flip, setFlip] = useState<FlipState>({ dir: null, dragging: false });
  const committingRef = useRef(false);

  const canForward = spread < maxSpread;
  const canBackward = spread > 0;

  // After commit, clear the inline transform in the same layout tick as the
  // new spread render so the just-mounted leaf never paints rotated.
  useLayoutEffect(() => {
    const el = leafRef.current;
    if (el) {
      el.classList.remove('snap');
      el.style.transform = '';
      el.style.transformOrigin = '';
    }
    committingRef.current = false;
    setFlip({ dir: null, dragging: false });
  }, [spread, leafRef]);

  const setLeaf = useCallback(
    (dir: FlipDir, deg: number, snap: boolean) => {
      const el = leafRef.current;
      if (!el) return;
      el.style.transformOrigin =
        dir === 'forward' ? 'left center' : 'right center';
      el.classList.toggle('snap', snap);
      el.style.transform = `translateZ(0) rotateY(${deg}deg)`;
    },
    [leafRef]
  );

  const commit = useCallback(
    (dir: FlipDir) => {
      committingRef.current = true;
      const next = dir === 'forward' ? spread + 1 : spread - 1;
      flushSync(() => setSpread(next));
    },
    [spread, setSpread]
  );

  const onTransitionEnd = useCallback(() => {
    if (!committingRef.current || !flip.dir) return;
    commit(flip.dir);
  }, [flip.dir, commit]);

  const animateTo = useCallback(
    (dir: FlipDir) => {
      const target = dir === 'forward' ? -180 : 180;
      if (prefersReducedMotion()) {
        commit(dir);
        return;
      }
      committingRef.current = true;
      // next frame so the .snap transition actually fires
      requestAnimationFrame(() => setLeaf(dir, target, true));
    },
    [setLeaf, commit]
  );

  const springBack = useCallback(
    (dir: FlipDir) => {
      if (prefersReducedMotion()) {
        setLeaf(dir, 0, false);
        setFlip({ dir: null, dragging: false });
        return;
      }
      requestAnimationFrame(() => {
        setLeaf(dir, 0, true);
        setFlip({ dir: null, dragging: false });
      });
    },
    [setLeaf]
  );

  const bind = useDrag(
    ({ first, last, movement: [mx], velocity: [vx], event }) => {
      const width =
        (event?.currentTarget as HTMLElement | null)?.clientWidth ?? 1;
      const dir: FlipDir = mx < 0 ? 'forward' : 'backward';
      const allowed = dir === 'forward' ? canForward : canBackward;
      if (!allowed) return;

      if (first) {
        setFlip({ dir, dragging: true });
      }

      const frac = Math.min(1, Math.abs(mx) / width);
      const deg =
        dir === 'forward'
          ? -180 * frac // 0 → -180
          : 180 * frac; // 0 → +180

      if (last) {
        const passed = frac > DISTANCE_THRESHOLD || vx > VELOCITY_THRESHOLD;
        if (passed) animateTo(dir);
        else springBack(dir);
        return;
      }
      setLeaf(dir, deg, false);
    },
    { axis: 'x', filterTaps: true, pointer: { touch: true } }
  );

  // a11y / desktop arrows
  const goForward = useCallback(() => {
    if (canForward) animateTo('forward');
  }, [canForward, animateTo]);
  const goBackward = useCallback(() => {
    if (canBackward) animateTo('backward');
  }, [canBackward, animateTo]);

  return {
    bind,
    flip,
    canForward,
    canBackward,
    goForward,
    goBackward,
    onTransitionEnd,
  };
}
