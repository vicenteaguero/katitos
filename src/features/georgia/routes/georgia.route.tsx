import { useMemo, useState, type CSSProperties } from 'react';
import { Camera, Check, MapPin, Plus, Trash2 } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { countdownTo, DateTime, cn } from '@kernel/lib';
import {
  Button,
  CameraCapture,
  Card,
  Empty,
  Field,
  IconButton,
  Input,
  LoadingScreen,
  PageHeader,
  Segmented,
  Select,
  Sheet,
  Textarea,
  toast,
} from '@kernel/ui';
import {
  useGeorgiaItems,
  useGeorgiaPhotos,
  useGeorgiaTrip,
} from '../api/georgia.queries';
import {
  useAddGeorgiaItem,
  useAddGeorgiaPhoto,
  useDeleteGeorgiaItem,
  useDeleteGeorgiaPhoto,
  useToggleGeorgiaItem,
} from '../api/georgia.mutations';
import { GeorgiaPhoto } from '../components/georgia-photo';
import { GeorgiaMap, type MapPin as Pin } from '../components/georgia-map';
import { georgiaKeys, type TripItem } from '../types';

type Tab = 'map' | 'plan' | 'wishlist' | 'album';

/** All dates from start..end inclusive (the trip's days). */
function tripDays(start?: string | null, end?: string | null): string[] {
  if (!start) return [];
  const a = DateTime.fromISO(start);
  const b = end ? DateTime.fromISO(end) : a;
  const out: string[] = [];
  for (let d = a; d <= b; d = d.plus({ days: 1 }))
    out.push(d.toFormat('yyyy-MM-dd'));
  return out;
}

export function GeorgiaRoute() {
  const { data: trip, isLoading } = useGeorgiaTrip();
  const { self, partner } = usePartner();
  const tripId = trip?.id;
  useTableSync('trip_items', qk.trips.items(tripId ?? 'none'), {
    enabled: !!tripId,
  });
  useTableSync('trip_photos', georgiaKeys.photos(tripId ?? 'none'), {
    enabled: !!tripId,
  });
  const { data: items } = useGeorgiaItems(tripId);
  const { data: photos } = useGeorgiaPhotos(tripId);
  const addItem = useAddGeorgiaItem();
  const toggleItem = useToggleGeorgiaItem();
  const delItem = useDeleteGeorgiaItem();
  const addPhoto = useAddGeorgiaPhoto();
  const delPhoto = useDeleteGeorgiaPhoto();
  const now = useNow(60_000);

  const [tab, setTab] = useState<Tab>('plan');
  const [cam, setCam] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wish, setWish] = useState('');
  const [form, setForm] = useState({
    title: '',
    kind: 'place',
    description: '',
    day: '',
    lat: '',
    lng: '',
  });

  const days = useMemo(
    () => tripDays(trip?.start_date, trip?.end_date),
    [trip?.start_date, trip?.end_date]
  );

  if (isLoading) return <LoadingScreen />;
  if (!trip)
    return (
      <Empty
        icon="🇬🇪"
        title="No Georgia trip yet"
        hint="The journal is still being bound."
      />
    );

  const c = trip.start_date
    ? countdownTo(DateTime.fromISO(trip.start_date), now)
    : null;
  const all = items ?? [];
  const planItems = all.filter((it) => it.kind !== 'wish');
  const wishes = all.filter((it) => it.kind === 'wish');
  const photos_ = photos ?? [];

  const pins: Pin[] = [
    ...planItems
      .filter((it) => it.lat != null && it.lng != null)
      .map((it) => ({
        lat: it.lat as number,
        lng: it.lng as number,
        title: it.title,
        tone: 'place' as const,
      })),
    ...[self, partner]
      .filter((m) => m?.lat != null && m?.lng != null)
      .map((m) => ({
        lat: m!.lat as number,
        lng: m!.lng as number,
        title: `${m!.display_name} · ${m!.city ?? ''}`,
        tone: 'home' as const,
      })),
  ];

  const onCapture = (blob: Blob) => {
    setCam(false);
    addPhoto.mutate(
      { tripId: trip.id, blob },
      {
        onSuccess: () => toast.success('Added to album 📸'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const submitItem = () => {
    if (!form.title.trim()) return;
    addItem.mutate(
      {
        tripId: trip.id,
        kind: form.kind,
        title: form.title.trim(),
        description: form.description || null,
        day: form.day || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setForm({
            title: '',
            kind: 'place',
            description: '',
            day: '',
            lat: '',
            lng: '',
          });
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const addWish = () => {
    if (!wish.trim()) return;
    addItem.mutate(
      { tripId: trip.id, kind: 'wish', title: wish.trim() },
      { onSuccess: () => setWish(''), onError: (e) => toast.error(e.message) }
    );
  };

  return (
    <div className="curtain-reveal space-y-6">
      <PageHeader
        title={trip.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className="text-copper">✦</span>
            {trip.destination ?? 'Tbilisi · the Caucasus'}
          </span>
        }
      />

      {/* Departure countdown — the kept hero of the trip. */}
      {c && (
        <section className="footlight">
          <div className="gilt-hairline bg-lapis overflow-hidden p-2 shadow-loge">
            <div className="marble px-6 py-7 text-center">
              <span className="eyebrow mb-3 text-accent before:bg-accent after:bg-accent">
                {c.isPast ? 'The Voyage' : 'Departure'}
              </span>
              <p className="font-display gilt-figures text-5xl font-semibold text-accent">
                {c.isPast ? '🇬🇪' : c.days}
                {!c.isPast && (
                  <span className="ml-2 align-baseline text-xl font-medium not-italic text-accent/60">
                    days
                  </span>
                )}
              </p>
              {trip.start_date && (
                <p className="mt-3 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent/70">
                  {DateTime.fromISO(trip.start_date).toFormat('LLL d')}
                  {trip.end_date
                    ? ` — ${DateTime.fromISO(trip.end_date).toFormat('LLL d, yyyy')}`
                    : ''}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        className="w-full"
        options={[
          { value: 'map', label: 'Map' },
          { value: 'plan', label: 'Plan' },
          { value: 'wishlist', label: 'Wishlist' },
          { value: 'album', label: 'Album' },
        ]}
      />

      {tab === 'map' && (
        <section className="space-y-3">
          <GeorgiaMap
            pins={pins}
            className="h-[420px] w-full overflow-hidden rounded-lg"
          />
          <p className="text-center font-sans text-xs text-muted">
            {pins.filter((p) => p.tone === 'place').length} places pinned · add
            coordinates when you add a place
          </p>
        </section>
      )}

      {tab === 'plan' && (
        <section className="space-y-5">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
              <Plus size={16} /> Add place
            </Button>
          </div>
          {planItems.length === 0 ? (
            <Empty
              icon="🗺️"
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
            />
          )}
        </section>
      )}

      {tab === 'wishlist' && (
        <section className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWish()}
              placeholder="Khinkali, wine, a rug…"
            />
            <Button onClick={addWish} className="shrink-0 px-5">
              <Plus size={16} />
            </Button>
          </div>
          {wishes.length === 0 ? (
            <Empty icon="🛍️" title="Nothing on the wishlist yet" />
          ) : (
            <div className="space-y-2">
              {wishes.map((it) => (
                <Card key={it.id} className="flex items-center gap-3 px-4 py-3">
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
                      'min-w-0 flex-1 truncate font-display text-lg text-fg',
                      it.status === 'done' && 'text-muted line-through'
                    )}
                  >
                    {it.title}
                  </span>
                  <IconButton
                    label="Delete"
                    onClick={() =>
                      delItem.mutate({ id: it.id, tripId: trip.id })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'album' && (
        <section className="space-y-4">
          <div className="flex items-center justify-end">
            <Button size="sm" variant="ghost" onClick={() => setCam(true)}>
              <Camera size={16} /> Photo
            </Button>
          </div>
          {photos_.length === 0 ? (
            <Empty icon="📸" title="No postcards yet" />
          ) : (
            <div className="curtain-stagger grid grid-cols-3 gap-2.5">
              {photos_.map((p, i) => (
                <div
                  key={p.id}
                  className="group relative"
                  style={{ '--i': i } as CSSProperties}
                >
                  <div className="overflow-hidden rounded-lg bg-surface-2">
                    <GeorgiaPhoto
                      path={p.image_path}
                      className="aspect-square w-full"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Delete photo"
                    onClick={() =>
                      delPhoto.mutate({ id: p.id, tripId: trip.id })
                    }
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded bg-bg/70 font-sans text-sm text-fg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {cam && (
        <CameraCapture
          facingMode="environment"
          onCapture={onCapture}
          onCancel={() => setCam(false)}
        />
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a place">
        <div className="space-y-3">
          <Field label="What">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Gergeti Trinity Church"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value }))
                }
              >
                <option value="place">Place</option>
                <option value="todo">To-do</option>
                <option value="idea">Idea</option>
              </Select>
            </Field>
            <Field label="Day">
              <Select
                value={form.day}
                onChange={(e) =>
                  setForm((f) => ({ ...f, day: e.target.value }))
                }
              >
                <option value="">Unscheduled</option>
                {days.map((d) => (
                  <option key={d} value={d}>
                    {DateTime.fromISO(d).toFormat('EEE, LLL d')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lat (map)">
              <Input
                inputMode="decimal"
                value={form.lat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lat: e.target.value }))
                }
                placeholder="42.66"
              />
            </Field>
            <Field label="Lng (map)">
              <Input
                inputMode="decimal"
                value={form.lng}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lng: e.target.value }))
                }
                placeholder="44.62"
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
            />
          </Field>
          <Button full onClick={submitItem} disabled={addItem.isPending}>
            Add to plan
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/** Items grouped by day (scheduled days first, then unscheduled). */
function DayPlan({
  days,
  items,
  onToggle,
  onDelete,
}: {
  days: string[];
  items: TripItem[];
  onToggle: (it: TripItem) => void;
  onDelete: (it: TripItem) => void;
}) {
  const list = items;
  const byDay = new Map<string, TripItem[]>();
  for (const it of list) {
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
    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.key || 'none'} className="space-y-2">
          <p className="eyebrow flex items-center gap-2">
            {s.key && <MapPin className="h-3 w-3 text-copper" />}
            {s.label}
          </p>
          {(byDay.get(s.key) ?? []).map((it) => (
            <Card key={it.id} className="flex items-center gap-3 px-4 py-3">
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
                    'truncate font-display text-lg text-fg',
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
              {it.lat != null && (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-copper"
                  aria-label="on map"
                />
              )}
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
