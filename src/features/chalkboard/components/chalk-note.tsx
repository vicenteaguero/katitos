import { useEffect, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import type { ChalkNote as Note } from '../types';

export function ChalkNoteItem({
  note,
  canDelete,
  onMove,
  onDelete,
}: {
  note: Note;
  canDelete: boolean;
  onMove: (x: number, y: number) => void;
  onDelete: () => void;
}) {
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  useEffect(() => {
    setPos({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  const bind = useDrag(({ first, movement: [mx, my], last, memo }) => {
    const start = (first ? { x: note.x, y: note.y } : memo) as {
      x: number;
      y: number;
    };
    const nx = start.x + mx;
    const ny = start.y + my;
    setPos({ x: nx, y: ny });
    if (last) onMove(Math.round(nx), Math.round(ny));
    return start;
  });

  return (
    <div
      {...bind()}
      style={{
        left: pos.x,
        top: pos.y,
        transform: `rotate(${note.rotation}deg)`,
        color: note.color,
        touchAction: 'none',
      }}
      className="chalk-note group absolute max-w-[220px] cursor-grab touch-none select-none whitespace-pre-wrap break-words rounded-none px-3 pb-2 pt-4 active:cursor-grabbing"
    >
      {/* The gilt magnet seal pinning the note to the slate */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--gilt-spark),var(--gilt-bright)_45%,var(--gilt-deep))] shadow-[0_1px_3px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,241,201,0.6)]"
      />
      <span className="block font-display text-[1.35rem] font-light italic leading-snug [text-shadow:0_0_1px_rgba(255,255,255,0.25),0_1px_1px_rgba(0,0,0,0.45)]">
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
          className="lift-press absolute -right-2.5 -top-2.5 hidden h-6 w-6 items-center justify-center rounded-none border border-border bg-surface-2 text-sm leading-none text-gold shadow-catch group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}
