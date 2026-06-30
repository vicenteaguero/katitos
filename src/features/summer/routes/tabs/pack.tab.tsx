import { useState } from 'react';
import { Luggage, Trash2 } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { cn } from '@kernel/lib';
import { useMembers, usePartner } from '@kernel/auth';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Segmented,
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
  const { data: members } = useMembers();
  const { self } = usePartner();
  const addItem = useAddPacking();
  const toggle = useTogglePacking();
  const del = useDeletePacking();

  const [who, setWho] = useState('all'); // 'all' | user_id
  const [form, setForm] = useState<{
    open: boolean;
    label: string;
    category: string;
    person: string;
  }>({ open: false, label: '', category: 'Clothes', person: '' });

  useTopBarAction(
    <TopAdd
      onClick={() =>
        setForm({ open: true, label: '', category: 'Clothes', person: '' })
      }
    />,
    []
  );

  const all = items ?? [];
  const list = who === 'all' ? all : all.filter((i) => i.assigned_to === who);
  const packed = list.filter((i) => i.packed).length;

  // All | Vicente | Anastasia — members already come in role order (a, b).
  const whoOptions = [
    { value: 'all', label: 'All' },
    ...(members ?? []).map((m) => ({
      value: m.user_id,
      label: m.display_name ?? 'Me',
    })),
  ];

  // Bucket by category, unchecked before checked within each.
  const byCat = new Map<string, PackingItem[]>();
  for (const it of list) {
    const key = it.category ?? 'Misc';
    const arr = byCat.get(key);
    if (arr) arr.push(it);
    else byCat.set(key, [it]);
  }
  for (const arr of byCat.values())
    arr.sort((a, b) => Number(a.packed) - Number(b.packed));
  const orderedCats = CATEGORIES.filter((c) => byCat.has(c)).concat(
    [...byCat.keys()].filter((c) => !CATEGORIES.includes(c))
  );

  const submit = () => {
    if (!form.label.trim()) return;
    addItem.mutate(
      {
        tripId: trip.id,
        label: form.label.trim(),
        category: form.category,
        assignedTo: (form.person || self?.user_id) ?? null,
      },
      { onSuccess: () => setForm((f) => ({ ...f, open: false, label: '' })) }
    );
  };

  const clearAll = () => {
    for (const it of list)
      if (it.packed)
        toggle.mutate({ id: it.id, tripId: trip.id, packed: false });
  };

  return (
    <section className="space-y-2.5">
      <Segmented value={who} onChange={setWho} full options={whoOptions} />

      {list.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="font-sans text-xs text-muted">
            {packed}/{list.length} packed
          </p>
          {packed > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="lift-press font-sans text-xs font-semibold text-copper outline-none active:text-accent"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <Empty
          icon={<Luggage className="h-11 w-11" strokeWidth={1.25} />}
          title="Nothing on the list"
          hint="Add what you can't forget."
        />
      ) : (
        orderedCats.map((cat) => (
          <div key={cat} className="space-y-1">
            <p className="px-0.5 font-sans text-xs font-semibold text-muted">
              {cat}
            </p>
            {(byCat.get(cat) ?? []).map((it) => (
              <Card
                key={it.id}
                className="flex items-center gap-2.5 px-2.5 py-1.5"
              >
                <Checkbox
                  checked={it.packed}
                  onChange={() =>
                    toggle.mutate({
                      id: it.id,
                      tripId: trip.id,
                      packed: !it.packed,
                    })
                  }
                  label="Toggle packed"
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate font-display text-base text-fg',
                    it.packed && 'text-muted line-through'
                  )}
                >
                  {it.label}
                </span>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => del.mutate({ id: it.id, tripId: trip.id })}
                  className="lift-press -mr-0.5 shrink-0 rounded p-1 text-muted outline-none active:text-accent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
          {/* Whose bag — defaults to me. */}
          <Segmented
            value={form.person || self?.user_id || ''}
            onChange={(v) => setForm((f) => ({ ...f, person: v }))}
            full
            options={(members ?? []).map((m) => ({
              value: m.user_id,
              label:
                m.user_id === self?.user_id
                  ? 'Me'
                  : (m.display_name ?? 'Partner'),
            }))}
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
