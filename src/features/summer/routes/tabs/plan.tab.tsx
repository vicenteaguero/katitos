import { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ExternalLink,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { DateTime, cn } from '@kernel/lib';
import {
  Button,
  CameraCapture,
  Card,
  Empty,
  IconButton,
  Input,
  SectionHeader,
  toast,
} from '@kernel/ui';
import { useSummerItems } from '../../api/summer.queries';
import {
  useAddItem,
  useAddItemPhoto,
  useDeleteItem,
  useToggleItem,
} from '../../api/summer.mutations';
import { StopSheet } from '../../components/stop-sheet';
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
  const addItem = useAddItem();
  const toggleItem = useToggleItem();
  const delItem = useDeleteItem();
  const addItemPhoto = useAddItemPhoto();

  const [adding, setAdding] = useState(false);
  const [wish, setWish] = useState('');
  const [camFor, setCamFor] = useState<string | null>(null);

  const days = useMemo(
    () => tripDays(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );

  const all = (items ?? []).filter(
    (it) => country === 'all' || it.country === country
  );
  const planItems = all.filter((it) => it.kind !== 'wish');
  const wishes = all.filter((it) => it.kind === 'wish');

  const addWish = () => {
    if (!wish.trim()) return;
    addItem.mutate(
      {
        tripId: trip.id,
        kind: 'wish',
        title: wish.trim(),
        country: country === 'all' ? null : country,
      },
      { onSuccess: () => setWish('') }
    );
  };

  return (
    <section className="space-y-4">
      <SectionHeader
        label="Itinerary"
        hint="Day-by-day stops · shown on the map"
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add stop
          </Button>
        }
      />

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
          onDelete={(it) => delItem.mutate({ id: it.id, tripId: trip.id })}
          onPhoto={(it) => setCamFor(it.id)}
        />
      )}

      {/* Wishlist — buy / eat / bring. */}
      <div className="space-y-2 pt-3">
        <SectionHeader
          label="Wishlist"
          hint="To do, eat, buy — no date"
          className="mb-2"
        />
        <div className="flex gap-2">
          <Input
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWish()}
            placeholder="Khinkali, baklava, a rug…"
          />
          <Button onClick={addWish} className="shrink-0 px-4">
            <Plus size={16} />
          </Button>
        </div>
        {wishes.map((it) => (
          <Card key={it.id} className="flex items-center gap-3 px-4 py-2.5">
            <button
              type="button"
              aria-label="Toggle"
              onClick={() =>
                toggleItem.mutate({
                  id: it.id,
                  tripId: trip.id,
                  status: it.status === 'done' ? 'open' : 'done',
                })
              }
              className="shrink-0 text-lg"
            >
              {it.status === 'done' ? '✅' : '⬜'}
            </button>
            <span
              className={cn(
                'min-w-0 flex-1 truncate font-display text-base text-fg',
                it.status === 'done' && 'text-muted line-through'
              )}
            >
              {it.title}
            </span>
            <IconButton
              label="Delete"
              onClick={() => delItem.mutate({ id: it.id, tripId: trip.id })}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </Card>
        ))}
      </div>

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
        open={adding}
        onClose={() => setAdding(false)}
        trip={trip}
        country={country}
      />
    </section>
  );
}

function DayPlan({
  days,
  items,
  onToggle,
  onDelete,
  onPhoto,
}: {
  days: string[];
  items: TripItem[];
  onToggle: (it: TripItem) => void;
  onDelete: (it: TripItem) => void;
  onPhoto: (it: TripItem) => void;
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
              <button
                type="button"
                aria-label="Toggle done"
                onClick={() => onToggle(it)}
                className="shrink-0 text-lg"
              >
                {it.status === 'done' ? '✅' : '⬜'}
              </button>
              <div className="min-w-0 flex-1">
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
              </div>
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
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-copper"
                  aria-label="on map"
                />
              )}
              <IconButton label="Photo" onClick={() => onPhoto(it)}>
                <Camera className="h-4 w-4" />
              </IconButton>
              <IconButton label="Delete" onClick={() => onDelete(it)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
