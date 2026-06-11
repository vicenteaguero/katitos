import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { Button, Fab, PageHeader, Sheet, Textarea, toast } from '@kernel/ui';
import { useChalkNotes } from '../api/chalkboard.queries';
import {
  useAddNote,
  useDeleteNote,
  useMoveNote,
} from '../api/chalkboard.mutations';
import { ChalkNoteItem } from '../components/chalk-note';
import { CHALK_COLORS } from '../types';

export function ChalkboardRoute() {
  useTableSync('chalkboard_notes', qk.chalkboard.notes());
  const userId = useUserId();
  const { data: notes } = useChalkNotes();
  const add = useAddNote();
  const move = useMoveNote();
  const del = useDeleteNote();
  const boardRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState('');
  const [color, setColor] = useState<string>(CHALK_COLORS[0]);

  const submit = () => {
    const el = boardRef.current;
    if (!el || !body.trim()) return;
    const x = Math.round(el.scrollLeft + el.clientWidth / 2 - 80);
    const y = Math.round(el.scrollTop + el.clientHeight / 2 - 30);
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

  return (
    <div className="curtain-reveal space-y-12">
      <header className="footlight space-y-4">
        <p className="eyebrow">Fridge Wall</p>
        <PageHeader
          title="The wall"
          subtitle="Our endless slate — write in chalk, drag where you like"
        />
      </header>

      {/* The gilt/wood frame holding the slate board on the wall */}
      <section className="space-y-3">
        <div
          className="gilt-hairline relative bg-brown p-2 shadow-loge"
          style={{
            backgroundImage:
              'repeating-linear-gradient(91deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 7px)',
          }}
        >
          <div
            ref={boardRef}
            className="relative h-[68vh] overflow-auto rounded-none border border-border/40 shadow-[inset_0_2px_18px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(232,217,181,0.04)]"
            style={{
              backgroundColor: '#161a1c',
              backgroundImage:
                'radial-gradient(120% 60% at 18% 8%, rgba(232,217,181,0.05) 0%, transparent 42%), radial-gradient(90% 70% at 88% 96%, rgba(232,217,181,0.04) 0%, transparent 50%), repeating-conic-gradient(from 12deg at 30% 40%, rgba(232,217,181,0.015) 0deg 4deg, transparent 4deg 9deg)',
            }}
          >
            <div className="relative h-[1600px] w-[1600px]">
              {(notes ?? []).map((n) => (
                <ChalkNoteItem
                  key={n.id}
                  note={n}
                  canDelete={n.author === userId}
                  onMove={(x, y) => move.mutate({ id: n.id, x, y })}
                  onDelete={() => del.mutate(n.id)}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="px-1 text-center font-sans text-xs italic text-muted">
          Pinned with gilt. Hung on the wall between two countries.
        </p>
      </section>

      <Fab label="Add note" onClick={() => setAdding(true)}>
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
                  onClick={() => setColor(c)}
                  className={cn(
                    'lift-press h-9 w-9 rounded-none border transition-transform',
                    color === c
                      ? 'border-border shadow-catch'
                      : 'border-transparent opacity-70'
                  )}
                  style={{
                    background: c,
                    boxShadow:
                      color === c
                        ? 'var(--shadow-catch)'
                        : 'inset 0 1px 2px rgba(0,0,0,0.3)',
                  }}
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
