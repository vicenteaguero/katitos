import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useGesture } from '@use-gesture/react';
import type { ChalkNote as Note } from '../types';

/** DB constraint: scale lives in [0.4, 3]. */
const SCALE_MIN = 0.4;
const SCALE_MAX = 3;
/** Shrink-to-fit font window (rem) — short phrases ride big & on one line. */
const FONT_MAX_REM = 1.3;
const FONT_MIN_REM = 0.85;

/** A light tap on grab / drop — a no-op on iOS Safari, felt on Android. */
const buzz = () => navigator.vibrate?.(10);

export function ChalkNoteItem({
  note,
  boardRef,
  editing,
  canDelete,
  onMove,
  onTransform,
  onDelete,
}: {
  note: Note;
  boardRef: RefObject<HTMLDivElement | null>;
  /** Only in edit mode can a note be dragged, pinched or deleted. */
  editing: boolean;
  canDelete: boolean;
  onMove: (x: number, y: number) => void;
  onTransform: (t: { scale: number; rotation: number; width: number }) => void;
  onDelete: () => void;
}) {
  const selfRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  // Live source of truth during a gesture — written straight to the DOM so a
  // drag/pinch never waits on a React render.
  const view = useRef({
    x: note.x,
    y: note.y,
    scale: note.scale,
    rotation: note.rotation,
  });
  // >0 while any finger is interacting, so realtime/seed syncs don't fight it.
  const active = useRef(0);
  // The text box width after fitting — persisted so the one-line look sticks.
  const fittedWidth = useRef<number>(note.width ?? 0);

  // Clamp any position (seeded, synced, or dragged) to the board bounds so a
  // note can never clip outside the blackboard.
  const clamp = useCallback(
    (x: number, y: number) => {
      const board = boardRef.current;
      const el = selfRef.current;
      if (!board || !el) {
        return { x: Math.max(0, x), y: Math.max(0, y) };
      }
      const maxX = Math.max(0, board.clientWidth - el.offsetWidth);
      const maxY = Math.max(0, board.clientHeight - el.offsetHeight);
      return {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY),
      };
    },
    [boardRef]
  );

  // Paint position/rotation/scale via one GPU transform — never layout.
  const apply = useCallback(() => {
    const el = selfRef.current;
    if (!el) return;
    const { x, y, scale, rotation } = view.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;
  }, []);

  // Shrink-to-fit: a short phrase stays on ONE line at a big font; a longer one
  // steps the font down; only a truly long note is allowed to wrap.
  const fit = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    const boardW = boardRef.current?.clientWidth ?? 320;
    const fallback = Math.min(280, Math.max(140, Math.round(boardW * 0.72)));
    const maxBox = Math.min(note.width ?? fallback, Math.max(120, boardW - 16));
    const multiline = note.body.includes('\n');

    el.style.fontSize = `${FONT_MAX_REM}rem`;
    el.style.maxWidth = `${maxBox}px`;

    if (multiline) {
      // Honour the author's own line breaks; wrap within the box.
      el.style.whiteSpace = 'pre-wrap';
      el.style.width = `${maxBox}px`;
    } else {
      el.style.whiteSpace = 'nowrap';
      el.style.width = 'auto';
      const natural = el.scrollWidth;
      if (natural > maxBox + 1) {
        const shrunk = Math.max(
          FONT_MIN_REM,
          (FONT_MAX_REM * maxBox) / natural
        );
        el.style.fontSize = `${shrunk}rem`;
        if (el.scrollWidth > maxBox + 1) {
          // Even at the floor font it won't fit — let it wrap.
          el.style.whiteSpace = 'normal';
          el.style.width = `${maxBox}px`;
        }
      }
    }
    fittedWidth.current = Math.round(el.offsetWidth);
  }, [note.body, note.width, boardRef]);

  // Re-fit text + re-place the note on mount, prop change, or viewport resize —
  // but never while the user is mid-gesture.
  const layout = useCallback(() => {
    fit();
    if (active.current > 0) return;
    view.current.scale = note.scale;
    view.current.rotation = note.rotation;
    const { x, y } = clamp(note.x, note.y);
    view.current.x = x;
    view.current.y = y;
    apply();
  }, [fit, clamp, apply, note.x, note.y, note.scale, note.rotation]);

  useLayoutEffect(() => {
    layout();
  }, [layout]);

  useEffect(() => {
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, [layout]);

  const begin = () => {
    active.current += 1;
    buzz();
  };
  const end = () => {
    active.current = Math.max(0, active.current - 1);
  };

  const bind = useGesture(
    {
      onDragStart: begin,
      onDrag: ({ pinching, cancel, offset: [ox, oy] }) => {
        // Two fingers down → hand the note to the pinch handler, don't drift it.
        if (pinching) {
          cancel();
          return;
        }
        view.current.x = ox;
        view.current.y = oy;
        apply();
      },
      onDragEnd: ({ tap, canceled }) => {
        end();
        if (tap || canceled) return;
        buzz();
        onMove(Math.round(view.current.x), Math.round(view.current.y));
      },
      onPinchStart: begin,
      onPinch: ({ offset: [scale, rotation] }) => {
        view.current.scale = scale;
        view.current.rotation = rotation;
        apply();
      },
      onPinchEnd: () => {
        end();
        buzz();
        onTransform({
          scale: Math.round(view.current.scale * 100) / 100,
          rotation: Math.round(view.current.rotation),
          width: fittedWidth.current,
        });
      },
    },
    {
      enabled: editing,
      eventOptions: { passive: false },
      drag: {
        from: () => [view.current.x, view.current.y],
        bounds: () => {
          const board = boardRef.current;
          const el = selfRef.current;
          if (!board || !el) return {};
          return {
            left: 0,
            top: 0,
            right: Math.max(0, board.clientWidth - el.offsetWidth),
            bottom: Math.max(0, board.clientHeight - el.offsetHeight),
          };
        },
        rubberband: false,
        filterTaps: true,
      },
      pinch: {
        from: () => [view.current.scale, view.current.rotation],
        scaleBounds: { min: SCALE_MIN, max: SCALE_MAX },
        rubberband: true,
      },
    }
  );

  return (
    <div
      ref={selfRef}
      {...bind()}
      style={{
        left: 0,
        top: 0,
        color: note.color,
        willChange: editing ? 'transform' : undefined,
      }}
      className={`chalk-note group absolute select-none px-3 pb-2 pt-4 ${
        editing
          ? 'cursor-grab touch-none ring-1 ring-gold/25 active:cursor-grabbing'
          : ''
      }`}
    >
      {/* The small white-gold magnet pinning the note to the slate */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--gilt-spark),var(--gilt-bright)_45%,var(--gilt-deep))] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.7)]"
      />
      <span
        ref={textRef}
        className="block break-words font-display font-light italic leading-snug [text-shadow:0_0_2px_rgba(255,253,245,0.35),0_1px_1px_rgba(0,0,0,0.5)]"
      >
        {note.body}
      </span>
      {editing && canDelete && (
        <button
          type="button"
          aria-label="Delete note"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="lift-press absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-sm leading-none text-gold shadow-catch"
        >
          ×
        </button>
      )}
    </div>
  );
}
