import { useRef, useState } from 'react';
import { Check, Pencil, Plus } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Button, IconButton, Sheet, Textarea, toast } from '@kernel/ui';
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

const MAX_NOTES = 3;

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

  // One fixed blackboard: this route never scrolls. Compact header on top,
  // the matte-slate board takes all remaining height. Move/delete only in edit
  // mode; the add + edit controls live in the header so nothing covers the slate.
  return (
    <div className="curtain-reveal flex h-full min-h-0 flex-col">
      <header className="mb-4 flex shrink-0 items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Our wall</p>
          <p className="mt-1 font-sans text-sm text-muted">
            Drag, rotate, pinch — magnets hold it all.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {editing && (
            <IconButton label="Add note" onClick={openAdd}>
              <Plus className="h-5 w-5" />
            </IconButton>
          )}
          <IconButton
            label={editing ? 'Done' : 'Edit wall'}
            onClick={() => setEditing((e) => !e)}
            className={editing ? 'bg-accent text-accent-fg' : ''}
          >
            {editing ? (
              <Check className="h-5 w-5" />
            ) : (
              <Pencil className="h-5 w-5" />
            )}
          </IconButton>
        </div>
      </header>

      {/* Matte-slate board — separated by tone and spacing, not by a line. */}
      <div
        ref={boardRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden rounded-lg transition-shadow',
          editing && 'ring-1 ring-gold/30'
        )}
        style={{
          backgroundColor: '#23272a',
          backgroundImage:
            'radial-gradient(120% 60% at 18% 8%, rgba(255,255,255,0.04) 0%, transparent 42%), radial-gradient(90% 70% at 88% 96%, rgba(255,255,255,0.03) 0%, transparent 50%)',
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

      <p className="mt-3 shrink-0 text-center font-sans text-xs italic text-muted">
        {editing
          ? 'Drag to move · pinch to size & spin · tap × to rub out'
          : 'Held by magnets. The kitchen we share across two countries.'}
      </p>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Write something"
      >
        <div className="space-y-6">
          <p className="eyebrow">In chalk</p>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="te amo…"
            rows={3}
          />
          <div className="space-y-2">
            <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted">
              Chalk color
            </p>
            <div className="flex gap-3">
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
          </div>
          <Button full onClick={submit} disabled={add.isPending}>
            Add to wall
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
