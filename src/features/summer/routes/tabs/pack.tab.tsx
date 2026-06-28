import { useState } from 'react';
import { Luggage, Plus, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import {
  Button,
  Card,
  Empty,
  Field,
  IconButton,
  Input,
  SectionHeader,
  Select,
  Sheet,
} from '@kernel/ui';
import { useSummerPacking } from '../../api/summer.queries';
import {
  useAddPacking,
  useDeletePacking,
  useTogglePacking,
} from '../../api/summer.mutations';
import type { PackingItem, Trip } from '../../types';

const CATEGORIES = ['Clothes', 'Docs', 'Tech', 'Toiletries', 'Misc'];

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
      <SectionHeader
        label="Luggage"
        hint={list.length > 0 ? `${packed}/${list.length} packed` : undefined}
        action={
          <Button
            size="sm"
            onClick={() =>
              setForm({ open: true, label: '', category: 'Clothes' })
            }
          >
            <Plus size={15} /> Add
          </Button>
        }
      />

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
              <p className="eyebrow">{cat}</p>
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
          <Field label="Item">
            <Input
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Passport, charger, sunscreen…"
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Button full onClick={submit} disabled={addItem.isPending}>
            Add
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
