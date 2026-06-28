import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { DateTime } from '@kernel/lib';
import { Button, Field, Input, Select, Sheet, Textarea } from '@kernel/ui';
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

const EMPTY = {
  title: '',
  kind: 'place',
  country: '',
  description: '',
  link: '',
  day: '',
  lat: '',
  lng: '',
};

/**
 * The one place a trip stop is created — itinerary item + optional map pin.
 * Shared by the Plan tab (the list) and the Map tab (so "where do I add a
 * location?" has an obvious answer right on the map).
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

  // Fresh form each time it opens.
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
        link: form.link || null,
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
        <Field label="What is it">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Gergeti Trinity Church"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" className="min-w-0">
            <Select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              <option value="place">Place</option>
              <option value="todo">To-do</option>
              <option value="idea">Idea</option>
            </Select>
          </Field>
          <Field label="Country" className="min-w-0">
            <Select
              value={form.country}
              onChange={(e) =>
                setForm((f) => ({ ...f, country: e.target.value }))
              }
            >
              <option value="">—</option>
              {COUNTRIES.map((co) => (
                <option key={co.code} value={co.code}>
                  {co.flag} {co.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Day">
          <Select
            value={form.day}
            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
          >
            <option value="">Unscheduled</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {DateTime.fromISO(d).toFormat('EEE, LLL d')}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Link (optional)">
          <Input
            inputMode="url"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder="maps / booking / article"
          />
        </Field>
        <Field
          label="Put it on the map"
          hint="Search a city or sight — it drops the pin for you."
        >
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
        </Field>
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
        <Field label="Notes">
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            rows={2}
          />
        </Field>
        <Button full onClick={submit} disabled={addItem.isPending}>
          Add to plan
        </Button>
      </div>
    </Sheet>
  );
}
