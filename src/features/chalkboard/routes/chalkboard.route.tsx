import { useRef, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  IconButton,
  Sheet,
  Textarea,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { useChalkNotes } from '../api/chalkboard.queries';
import {
  useAddNote,
  useDeleteNote,
  useMoveNote,
  useResizeNote,
  useRotateNote,
} from '../api/chalkboard.mutations';
import { ChalkNoteItem } from '../components/chalk-note';
import { CHALK_COLORS } from '../types';

const MAX_NOTES = 10;

export function ChalkboardRoute() {
  useTableSync('chalkboard_notes', qk.chalkboard.notes());
  const { data: notes } = useChalkNotes();
  const add = useAddNote();
  const move = useMoveNote();
  const resize = useResizeNote();
  const rotate = useRotateNote();
  const del = useDeleteNote();
  const boardRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState('');
  const [color, setColor] = useState<string>(CHALK_COLORS[0]);

  const count = notes?.length ?? 0;
  const atMax = count >= MAX_NOTES;

  const openAdd = () => {
    if (atMax) {
      toast.error(`The wall holds ${MAX_NOTES} notes — rub one out first.`);
      return;
    }
    setAdding(true);
  };

  const submit = () => {
    const el = boardRef.current;
    if (!el || !body.trim()) return;
    if (atMax) {
      toast.error(`The wall holds ${MAX_NOTES} notes — rub one out first.`);
      return;
    }
    const x = Math.max(0, Math.round(el.clientWidth / 2 - 80));
    const y = Math.max(0, Math.round(el.clientHeight / 2 - 30));
    const rotation = Math.round(Math.random() * 12 - 6);
    add.mutate(
      { body: body.trim(), color, x, y, rotation },
      {
        onSuccess: () => {
          setBody('');
          setAdding(false);
          toast.success('Added to the wall ✍️');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  // Edit + add live in the TOP BAR (no in-content title, per the one-title rule)
  // so the matte slate gets the whole height below the bar.
  useTopBarAction(
    <div className="flex items-center gap-1.5">
      <span className="font-sans text-xs tabular-nums text-muted">
        {count}/{MAX_NOTES}
      </span>
      {editing && (
        <IconButton label="Add note" onClick={openAdd} className="h-9 w-9">
          <Plus className="h-5 w-5" />
        </IconButton>
      )}
      <IconButton
        label={editing ? 'Done' : 'Edit wall'}
        onClick={() => setEditing((e) => !e)}
        className={cn('h-9 w-9', editing && 'bg-accent text-accent-fg')}
      >
        {editing ? (
          <Check className="h-5 w-5" />
        ) : (
          <Pencil className="h-5 w-5" />
        )}
      </IconButton>
    </div>,
    [editing, atMax, count]
  );

  // One fixed blackboard: this route never scrolls. The matte-slate board takes
  // all remaining height.
  return (
    <div className="curtain-reveal flex h-full min-h-0 flex-col">
      {/* Matte-slate board — separated by tone and spacing, not by a line. */}
      <div
        ref={boardRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden rounded-lg transition-shadow',
          editing && 'ring-1 ring-gold/30'
        )}
        style={{
          backgroundColor: '#1a1d1f',
          backgroundImage:
            'linear-gradient(rgba(8,10,10,0.32), rgba(8,10,10,0.42)), url(/chalkboard.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {(notes ?? []).map((n) => (
          <ChalkNoteItem
            key={n.id}
            note={n}
            boardRef={boardRef}
            editing={editing}
            canDelete
            onMove={(x, y) => move.mutate({ id: n.id, x, y })}
            onTransform={({ scale, rotation, width }) => {
              resize.mutate({ id: n.id, scale, width });
              rotate.mutate({ id: n.id, rotation });
            }}
            onDelete={() => del.mutate(n.id)}
          />
        ))}
      </div>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Write something"
      >
        <div className="space-y-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write here…"
            rows={3}
          />
          <div className="flex justify-center gap-3">
            {CHALK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`color ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={cn(
                  'lift-press h-9 w-9 rounded-full transition-transform',
                  color === c
                    ? 'ring-2 ring-gold/40 ring-offset-2 ring-offset-surface-2'
                    : 'opacity-60'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <Button full onClick={submit} disabled={add.isPending}>
            Add to wall
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
