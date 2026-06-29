import { useState } from 'react';
import { Luggage, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Card,
  Empty,
  IconButton,
  Input,
  Sheet,
  useTopBarAction,
} from '@kernel/ui';
import { useSummerPacking } from '../../api/summer.queries';
import {
  useAddPacking,
  useDeletePacking,
  useTogglePacking,
} from '../../api/summer.mutations';
import { TopAdd } from '../../components/top-add';
import type { PackingItem, Trip } from '../../types';

const CATEGORIES = ['Clothes', 'Tech', 'Docs', 'Beauty', 'Misc'];

export function PackTab({ trip }: { trip: Trip }) {
  useTableSync('packing_items', qk.trips.packing(trip.id), { enabled: true });
  const { data: items } = useSummerPacking(trip.id);
  const addItem = useAddPacking();
  const toggle = useTogglePacking();
  const del = useDeletePacking();

  const [form, setForm] = useState<{
    open: boolean;
    label: string;
    category: string;
  }>({ open: false, label: '', category: 'Clothes' });

  const list = items ?? [];
  const packed = list.filter((i) => i.packed).length;

  useTopBarAction(
    <TopAdd
      onClick={() => setForm({ open: true, label: '', category: 'Clothes' })}
    />,
    []
  );

  const byCat = new Map<string, PackingItem[]>();
  for (const it of list) {
    const key = it.category ?? 'Misc';
    const arr = byCat.get(key) ?? [];
    arr.push(it);
    byCat.set(key, arr);
  }

  const submit = () => {
    if (!form.label.trim()) return;
    addItem.mutate(
      { tripId: trip.id, label: form.label.trim(), category: form.category },
      { onSuccess: () => setForm((f) => ({ ...f, open: false, label: '' })) }
    );
  };

  return (
    <section className="space-y-4">
      {list.length > 0 && (
        <p className="text-center font-sans text-xs text-muted">
          {packed}/{list.length} packed
        </p>
      )}

      {list.length === 0 ? (
        <Empty
          icon={<Luggage className="h-11 w-11" strokeWidth={1.25} />}
          title="Nothing on the list"
          hint="Add what you can't forget."
        />
      ) : (
        CATEGORIES.filter((c) => byCat.has(c))
          .concat([...byCat.keys()].filter((c) => !CATEGORIES.includes(c)))
          .map((cat) => (
            <div key={cat} className="space-y-2">
              <p className="font-sans text-xs font-semibold text-muted">
                {cat}
              </p>
              {(byCat.get(cat) ?? []).map((it) => (
                <Card
                  key={it.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <button
                    type="button"
                    aria-label="Toggle packed"
                    onClick={() =>
                      toggle.mutate({
                        id: it.id,
                        tripId: trip.id,
                        packed: !it.packed,
                      })
                    }
                    className="shrink-0 text-lg"
                  >
                    {it.packed ? '✅' : '⬜'}
                  </button>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-display text-base text-fg',
                      it.packed && 'text-muted line-through'
                    )}
                  >
                    {it.label}
                  </span>
                  <IconButton
                    label="Delete"
                    onClick={() => del.mutate({ id: it.id, tripId: trip.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </Card>
              ))}
            </div>
          ))
      )}

      <Sheet
        open={form.open}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        title="Add to luggage"
      >
        <div className="space-y-3">
          <Input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Name"
            autoFocus
          />
          {/* Category — centred, selectable. */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {CATEGORIES.map((c) => {
              const active = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  className={cn(
                    'lift-press rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold',
                    active
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-2 text-muted'
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <Button full onClick={submit} disabled={addItem.isPending}>
            Add
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
