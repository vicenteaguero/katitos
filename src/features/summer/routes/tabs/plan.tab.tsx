import { useMemo, useState } from 'react';
import { Camera, ExternalLink, MapPin } from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { DateTime, cn } from '@kernel/lib';
import {
  CameraCapture,
  Card,
  Checkbox,
  Empty,
  IconButton,
  toast,
  useTopBarAction,
} from '@kernel/ui';
import { useSummerItems } from '../../api/summer.queries';
import { useAddItemPhoto, useToggleItem } from '../../api/summer.mutations';
import { StopSheet } from '../../components/stop-sheet';
import { TopAdd } from '../../components/top-add';
import { type CountryFilter, type Trip, type TripItem } from '../../types';

function tripDays(start?: string | null, end?: string | null): string[] {
  if (!start) return [];
  const a = DateTime.fromISO(start);
  const b = end ? DateTime.fromISO(end) : a;
  const out: string[] = [];
  for (let d = a; d <= b; d = d.plus({ days: 1 }))
    out.push(d.toFormat('yyyy-MM-dd'));
  return out;
}

export function PlanTab({
  trip,
  country,
}: {
  trip: Trip;
  country: CountryFilter;
}) {
  useTableSync('trip_items', qk.trips.items(trip.id), { enabled: true });
  const { data: items } = useSummerItems(trip.id);
  const toggleItem = useToggleItem();
  const addItemPhoto = useAddItemPhoto();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TripItem | null>(null);
  const [camFor, setCamFor] = useState<string | null>(null);

  useTopBarAction(<TopAdd onClick={() => setAdding(true)} />, []);

  const days = useMemo(
    () => tripDays(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );

  const planItems = (items ?? []).filter(
    (it) =>
      it.kind !== 'wish' &&
      it.kind !== 'city' &&
      (country === 'all' || it.country === country)
  );

  return (
    <section className="space-y-4">
      {planItems.length === 0 ? (
        <Empty
          icon={<MapPin className="h-11 w-11" strokeWidth={1.25} />}
          title="The plan is blank"
          hint="Add your first stop."
        />
      ) : (
        <DayPlan
          days={days}
          items={planItems}
          onToggle={(it) =>
            toggleItem.mutate({
              id: it.id,
              tripId: trip.id,
              status: it.status === 'done' ? 'open' : 'done',
            })
          }
          onPhoto={(it) => setCamFor(it.id)}
          onEdit={(it) => setEditing(it)}
        />
      )}

      {camFor && (
        <CameraCapture
          facingMode="environment"
          onCapture={(blob) => {
            const id = camFor;
            setCamFor(null);
            addItemPhoto.mutate(
              { id, tripId: trip.id, blob },
              { onSuccess: () => toast.success('Photo added 📸') }
            );
          }}
          onCancel={() => setCamFor(null)}
        />
      )}

      <StopSheet
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        trip={trip}
        country={country}
        editItem={editing}
      />
    </section>
  );
}

function DayPlan({
  days,
  items,
  onToggle,
  onPhoto,
  onEdit,
}: {
  days: string[];
  items: TripItem[];
  onToggle: (it: TripItem) => void;
  onPhoto: (it: TripItem) => void;
  onEdit: (it: TripItem) => void;
}) {
  const byDay = new Map<string, TripItem[]>();
  for (const it of items) {
    const key = it.day ?? '';
    const arr = byDay.get(key) ?? [];
    arr.push(it);
    byDay.set(key, arr);
  }
  const scheduledDays = days.filter((d) => byDay.has(d));
  const sections = [
    ...scheduledDays.map((d) => ({
      key: d,
      label: DateTime.fromISO(d).toFormat('EEEE, LLL d'),
    })),
    ...(byDay.has('') ? [{ key: '', label: 'Unscheduled' }] : []),
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s.key || 'none'} className="space-y-2">
          <p className="eyebrow flex items-center gap-2">
            {s.key && <MapPin className="h-3 w-3 text-copper" />}
            {s.label}
          </p>
          {(byDay.get(s.key) ?? []).map((it) => (
            <Card key={it.id} className="flex items-center gap-3 px-4 py-2.5">
              <Checkbox
                checked={it.status === 'done'}
                onChange={() => onToggle(it)}
                label="Toggle done"
              />
              <button
                type="button"
                onClick={() => onEdit(it)}
                aria-label="Edit stop"
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className={cn(
                    'truncate font-display text-base text-fg',
                    it.status === 'done' && 'text-muted line-through'
                  )}
                >
                  {it.title}
                </p>
                {it.description && (
                  <p className="truncate font-sans text-xs text-muted">
                    {it.description}
                  </p>
                )}
              </button>
              {it.link && (
                <a
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open link"
                  className="shrink-0 text-copper"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {it.lat != null && (
                <MapPin
                  className="h-3.5 w-3.5 shrink-0 text-copper"
                  aria-label="on map"
                />
              )}
              <IconButton label="Photo" onClick={() => onPhoto(it)}>
                <Camera className="h-4 w-4" />
              </IconButton>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
