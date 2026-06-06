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
    <div className="space-y-3">
      <PageHeader
        title="The wall"
        subtitle="Our endless fridge — drag your notes"
      />

      <div
        ref={boardRef}
        className="relative h-[68vh] overflow-auto rounded-lg border border-border bg-[#15171a]"
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

      <Fab label="Add note" onClick={() => setAdding(true)}>
        <Plus />
      </Fab>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Write something"
      >
        <div className="space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="te amo…"
            rows={3}
          />
          <div className="flex gap-2">
            {CHALK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`color ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  color === c ? 'border-fg' : 'border-transparent'
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
