import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Camera, Plus, Trash2, Trophy } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { useTableSync } from '@kernel/realtime';
import { qk } from '@kernel/query';
import { countdownTo, DateTime, cn } from '@kernel/lib';
import {
  Badge,
  Button,
  CameraCapture,
  Card,
  Empty,
  Field,
  IconButton,
  Input,
  LoadingScreen,
  PageHeader,
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
import { georgiaKeys } from '../types';

export function GeorgiaRoute() {
  const { data: trip, isLoading } = useGeorgiaTrip();
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
  const now = useNow(1000);

  const [cam, setCam] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    title: '',
    kind: 'idea',
    description: '',
  });

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
    if (!itemForm.title.trim()) return;
    addItem.mutate(
      {
        tripId: trip.id,
        kind: itemForm.kind,
        title: itemForm.title.trim(),
        description: itemForm.description || null,
      },
      {
        onSuccess: () => {
          setAddingItem(false);
          setItemForm({ title: '', kind: 'idea', description: '' });
        },
      }
    );
  };

  const items_ = items ?? [];
  const photos_ = photos ?? [];
  const doneCount = items_.filter((it) => it.status === 'done').length;

  return (
    <div className="curtain-reveal space-y-12">
      <PageHeader
        title={trip.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className="text-copper">✦</span>
            {trip.destination ?? 'Tbilisi · the Caucasus'}
          </span>
        }
      />

      {/* The passport postcard — a marble "lit stage" hero stamped like a travel page. */}
      <section className="footlight">
        <div className="gilt-hairline relative overflow-hidden shadow-loge">
          {/* Lapis inner mat behind the marble — the imperial-blue voyage. */}
          <div className="bg-lapis p-2">
            <div className="marble relative px-8 py-10 text-center">
              <span className="eyebrow mb-5 text-accent before:bg-accent after:bg-accent">
                {c?.isPast ? 'The Voyage' : 'Departure'}
              </span>
              <p className="font-display text-2xl italic leading-snug text-accent/90">
                {c?.isPast
                  ? 'We are there.'
                  : 'Counting the leagues to the Caucasus.'}
              </p>
              {c && (
                <p className="mt-6 font-display text-6xl font-semibold tabular-nums tracking-tight text-accent">
                  {c.isPast ? '🇬🇪' : `${c.days}`}
                  {!c.isPast && (
                    <span className="ml-2 align-baseline text-2xl font-medium not-italic text-accent/60">
                      days · {c.hours}h
                    </span>
                  )}
                </p>
              )}
              {trip.start_date && (
                <p className="mt-5 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-accent/70">
                  {DateTime.fromISO(trip.start_date).toFormat('LLL d')}
                  {trip.end_date
                    ? ` — ${DateTime.fromISO(trip.end_date).toFormat('LLL d, yyyy')}`
                    : ''}
                </p>
              )}
              {/* Two-color seam: her velvet flowing into his warmth, the journey as one stitched line. */}
              <hr className="seam mt-8" />
            </div>
          </div>
        </div>
      </section>

      <Link to="/scavenger" className="block">
        <Button full variant="secondary">
          <Trophy size={16} /> Play the date cards
        </Button>
      </Link>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow justify-start text-copper before:hidden after:bg-copper">
              Itinerary
            </span>
            {items_.length > 0 && (
              <p className="mt-2 font-sans text-xs font-medium tabular-nums text-muted">
                {doneCount} of {items_.length} marked
              </p>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAddingItem(true)}>
            <Plus size={16} /> Add
          </Button>
        </div>
        {items_.length === 0 ? (
          <Empty icon="🗺️" title="The itinerary is blank" />
        ) : (
          <div className="space-y-3">
            {items_.map((it) => (
              <Card key={it.id} className="flex items-center gap-3 px-5 py-4">
                <button
                  type="button"
                  aria-label="Toggle done"
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
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate font-display text-lg tracking-tight text-fg',
                      it.status === 'done' && 'text-muted line-through'
                    )}
                  >
                    {it.title}
                  </p>
                  {it.description && (
                    <p className="truncate font-sans text-xs leading-relaxed text-muted">
                      {it.description}
                    </p>
                  )}
                </div>
                <Badge tone="neutral">{it.kind}</Badge>
                <IconButton
                  label="Delete"
                  onClick={() => delItem.mutate({ id: it.id, tripId: trip.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <span className="eyebrow justify-start text-copper before:hidden after:bg-copper">
            Postcards
          </span>
          <Button size="sm" variant="ghost" onClick={() => setCam(true)}>
            <Camera size={16} /> Photo
          </Button>
        </div>
        {photos_.length === 0 ? (
          <Empty icon="📸" title="No postcards sent yet" />
        ) : (
          <div className="curtain-stagger grid grid-cols-3 gap-2.5">
            {photos_.map((p, i) => (
              <div
                key={p.id}
                className="group relative"
                style={{ '--i': i } as CSSProperties}
              >
                <div className="gilt-hairline-flat overflow-hidden shadow-loge">
                  <GeorgiaPhoto
                    path={p.image_path}
                    className="aspect-square w-full"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => {
                    if (confirm('Delete photo?'))
                      delPhoto.mutate({ id: p.id, tripId: trip.id });
                  }}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-none bg-bg/70 font-sans text-sm text-fg opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {cam && (
        <CameraCapture
          facingMode="environment"
          onCapture={onCapture}
          onCancel={() => setCam(false)}
        />
      )}

      <Sheet
        open={addingItem}
        onClose={() => setAddingItem(false)}
        title="Add to planner"
      >
        <div className="space-y-3">
          <Field label="What">
            <Input
              value={itemForm.title}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </Field>
          <Field label="Type">
            <Select
              value={itemForm.kind}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, kind: e.target.value }))
              }
            >
              <option value="idea">Idea</option>
              <option value="place">Place</option>
              <option value="todo">To-do</option>
              <option value="game">Game</option>
              <option value="tracker">Tracker</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea
              value={itemForm.description}
              onChange={(e) =>
                setItemForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Field>
          <Button full onClick={submitItem}>
            Add
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
