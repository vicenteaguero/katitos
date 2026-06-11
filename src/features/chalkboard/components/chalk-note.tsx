import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useDrag } from '@use-gesture/react';
import type { ChalkNote as Note } from '../types';

export function ChalkNoteItem({
  note,
  boardRef,
  canDelete,
  onMove,
  onDelete,
}: {
  note: Note;
  boardRef: RefObject<HTMLDivElement | null>;
  canDelete: boolean;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
}) {
  const selfRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: note.x, y: note.y });

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

  useLayoutEffect(() => {
    setPos(clamp(note.x, note.y));
  }, [note.x, note.y, clamp]);

  const bind = useDrag(({ first, movement: [mx, my], last, memo }) => {
    const start = (first ? clamp(note.x, note.y) : memo) as {
      x: number;
      y: number;
    };
    const next = clamp(start.x + mx, start.y + my);
    setPos(next);
    if (last) onMove(Math.round(next.x), Math.round(next.y));
    return start;
  });

  return (
    <div
      ref={selfRef}
      {...bind()}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `rotate(${note.rotation}deg)`,
        color: note.color,
        touchAction: 'none',
      }}
      className="chalk-note group absolute max-w-[220px] cursor-grab touch-none select-none whitespace-pre-wrap break-words px-3 pb-2 pt-4 active:cursor-grabbing"
    >
      {/* The small white-gold magnet pinning the note to the slate */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--gilt-spark),var(--gilt-bright)_45%,var(--gilt-deep))] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.7)]"
      />
      <span className="block font-display text-[1.35rem] font-light italic leading-snug [text-shadow:0_0_2px_rgba(255,253,245,0.35),0_1px_1px_rgba(0,0,0,0.5)]">
        {note.body}
      </span>
      {canDelete && (
        <button
          type="button"
          aria-label="Delete note"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="lift-press absolute -right-2.5 -top-2.5 hidden h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-sm leading-none text-gold shadow-catch group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}
