import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { DateTime, cn } from '@kernel/lib';
import { Button, Input, Select, Sheet, Textarea } from '@kernel/ui';
import { useAddItem } from '../api/summer.mutations';
import { CitySearch } from './city-search';
import { COUNTRIES, type CountryFilter, type Trip } from '../types';

function tripDays(start?: string | null, end?: string | null): string[] {
  if (!start) return [];
  const a = DateTime.fromISO(start);
  const b = end ? DateTime.fromISO(end) : a;
  const out: string[] = [];
  for (let d = a; d <= b; d = d.plus({ days: 1 }))
    out.push(d.toFormat('yyyy-MM-dd'));
  return out;
}

const KINDS = [
  { value: 'place', label: 'Place' },
  { value: 'todo', label: 'To-do' },
  { value: 'idea', label: 'Idea' },
];

const EMPTY = {
  title: '',
  kind: 'place',
  country: '',
  description: '',
  day: '',
  lat: '',
  lng: '',
};

/**
 * The one place a trip stop is created — itinerary item + optional map pin.
 * Minimal: a name, a kind, a flag, an optional day, a search, a note.
 */
export function StopSheet({
  open,
  onClose,
  trip,
  country,
}: {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  country: CountryFilter;
}) {
  const addItem = useAddItem();
  const [form, setForm] = useState({ ...EMPTY });

  useEffect(() => {
    if (!open) setForm({ ...EMPTY });
  }, [open]);

  const days = useMemo(
    () => tripDays(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );

  const submit = () => {
    if (!form.title.trim()) return;
    addItem.mutate(
      {
        tripId: trip.id,
        kind: form.kind,
        title: form.title.trim(),
        description: form.description || null,
        link: null,
        country: form.country || (country === 'all' ? null : country),
        day: form.day || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add a stop">
      <div className="space-y-3">
        <Input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Name"
          autoFocus
        />

        {/* Kind pills. */}
        <div className="flex gap-1.5">
          {KINDS.map((k) => {
            const active = form.kind === k.value;
            return (
              <button
                key={k.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: k.value }))}
                className={cn(
                  'lift-press flex-1 rounded-full py-1.5 font-sans text-xs font-semibold',
                  active
                    ? 'bg-accent text-accent-fg'
                    : 'bg-surface-2 text-muted'
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>

        {/* Flags + day, on one line. */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-surface-2 p-1">
            {COUNTRIES.map((co) => {
              const active = form.country === co.code;
              return (
                <button
                  key={co.code}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, country: active ? '' : co.code }))
                  }
                  className={cn(
                    'lift-press rounded-full px-3.5 py-1 text-lg leading-none transition',
                    active ? 'bg-accent' : 'opacity-45'
                  )}
                >
                  {co.flag}
                </button>
              );
            })}
          </div>
          <Select
            value={form.day}
            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
            className="min-w-0 flex-1"
          >
            <option value="">When?</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {DateTime.fromISO(d).toFormat('EEE, LLL d')}
              </option>
            ))}
          </Select>
        </div>

        <CitySearch
          onPick={(h) =>
            setForm((f) => ({
              ...f,
              title: f.title || h.name,
              lat: String(h.lat),
              lng: String(h.lng),
              country: h.country || f.country,
            }))
          }
        />
        {form.lat && form.lng && (
          <p className="flex items-center gap-2 font-sans text-xs text-copper">
            <MapPin className="h-3.5 w-3.5" />
            Pinned · {Number(form.lat).toFixed(3)},{' '}
            {Number(form.lng).toFixed(3)}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, lat: '', lng: '' }))}
              className="underline"
            >
              clear
            </button>
          </p>
        )}

        <Textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={2}
          placeholder="Notes (optional)"
        />
        <Button full onClick={submit} disabled={addItem.isPending}>
          Add to plan
        </Button>
      </div>
    </Sheet>
  );
}
