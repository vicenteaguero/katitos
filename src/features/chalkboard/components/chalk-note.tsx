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
      className="group absolute max-w-[200px] cursor-grab touch-none whitespace-pre-wrap break-words rounded px-2 py-1 text-lg leading-snug [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] active:cursor-grabbing"
    >
      {note.body}
      {canDelete && (
        <button
          type="button"
          aria-label="Delete note"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white group-hover:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}
