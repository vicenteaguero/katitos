import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Button, Fab, Sheet, Textarea, toast } from '@kernel/ui';
import { useChalkNotes } from '../api/chalkboard.queries';
import {
  useAddNote,
  useDeleteNote,
  useMoveNote,
  useRotateNote,
} from '../api/chalkboard.mutations';
import { ChalkNoteItem } from '../components/chalk-note';
import { CHALK_COLORS } from '../types';

const MAX_NOTES = 3;

export function ChalkboardRoute() {
  useTableSync('chalkboard_notes', qk.chalkboard.notes());
  const userId = useUserId();
  const { data: notes } = useChalkNotes();
  const add = useAddNote();
  const move = useMoveNote();
  const rotate = useRotateNote();
  const del = useDeleteNote();
  const boardRef = useRef<HTMLDivElement>(null);
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
  // the matte-slate board takes all remaining height, notes drag within it.
  return (
    <div className="curtain-reveal flex h-full min-h-0 flex-col">
      <header className="mb-5 shrink-0">
        <p className="eyebrow">Our wall</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
          The blackboard
        </h1>
      </header>

      {/* Matte-slate board — separated by tone and spacing, not by a line. */}
      <div
        ref={boardRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg"
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
            canDelete={n.author === userId}
            onMove={(x, y) => move.mutate({ id: n.id, x, y })}
            onRotate={(rotation) => rotate.mutate({ id: n.id, rotation })}
            onDelete={() => del.mutate(n.id)}
          />
        ))}
      </div>

      <p className="mt-3 shrink-0 text-center font-sans text-xs italic text-muted">
        Held by magnets. The kitchen we share across two countries.
      </p>

      <Fab label="Add note" onClick={openAdd}>
        <Plus />
      </Fab>

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
