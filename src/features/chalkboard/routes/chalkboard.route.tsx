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
      <header className="space-y-4">
        <p className="eyebrow">Fridge Wall</p>
        <PageHeader
          title="The fridge"
          subtitle="Our kitchen door — scribble in chalk, drag the magnets around"
        />
      </header>

      {/* A literal refrigerator standing on the dark stage:
          brushed-steel body, a freezer/door seam, a tall handle, and a
          magnetic slate board where the chalk notes live. */}
      <section className="space-y-3">
        <div
          className="relative mx-auto w-full max-w-[760px] rounded-none border border-border/50 p-4 shadow-loge"
          style={{
            // Brushed stainless steel — flat vertical neutral/silver gradient
            backgroundColor: '#c9c6be',
            backgroundImage:
              'linear-gradient(90deg, #9a978d 0%, #d4d1ca 14%, #eae8e1 30%, #d0cdc6 50%, #eae8e1 70%, #d4d1ca 86%, #9a978d 100%)',
          }}
        >
          {/* Freezer / fridge door split seam */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-[22%] h-px bg-[#9a978d]/70 shadow-[0_1px_0_rgba(255,255,255,0.5)]"
          />
          {/* Long vertical door handle */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-1.5 top-[26%] bottom-[10%] w-2 rounded-none border border-border/60"
            style={{
              backgroundImage:
                'linear-gradient(90deg, #8e8b82 0%, #f2f0ea 45%, #b9b6ae 100%)',
              boxShadow:
                '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          />

          {/* The magnetic chalk/blackboard panel stuck on the door */}
          <div
            ref={boardRef}
            className="relative mr-6 h-[64vh] overflow-auto rounded-none border-4 border-[#1a1a1c] shadow-[inset_0_2px_18px_rgba(0,0,0,0.7),0_2px_6px_rgba(0,0,0,0.4)]"
            style={{
              backgroundColor: '#23272a',
              backgroundImage:
                'radial-gradient(120% 60% at 18% 8%, rgba(255,255,255,0.04) 0%, transparent 42%), radial-gradient(90% 70% at 88% 96%, rgba(255,255,255,0.03) 0%, transparent 50%)',
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
          Held by magnets. The kitchen we share across two countries.
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
