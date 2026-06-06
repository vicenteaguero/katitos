import { useState } from 'react';
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
  CardTitle,
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
        hint="It should be seeded."
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={trip.name}
        subtitle={trip.destination ?? 'Georgia 2026'}
      />

      {c && (
        <Card className="text-center">
          <CardTitle>{c.isPast ? 'Happening now! 🎉' : 'Countdown'}</CardTitle>
          <p className="text-3xl font-bold tabular-nums text-accent">
            {c.isPast ? '🇬🇪' : `${c.days}d ${c.hours}h`}
          </p>
          {trip.start_date && (
            <p className="text-xs text-muted">
              {DateTime.fromISO(trip.start_date).toFormat('LLL d')}
              {trip.end_date
                ? ` – ${DateTime.fromISO(trip.end_date).toFormat('LLL d, yyyy')}`
                : ''}
            </p>
          )}
        </Card>
      )}

      <Link to="/scavenger">
        <Button full variant="secondary">
          <Trophy size={16} /> Play the date cards
        </Button>
      </Link>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Planner</h2>
          <Button size="sm" variant="ghost" onClick={() => setAddingItem(true)}>
            <Plus size={16} /> Add
          </Button>
        </div>
        {(items ?? []).length === 0 ? (
          <Empty icon="🗒️" title="Nothing planned yet" />
        ) : (
          <div className="space-y-2">
            {(items ?? []).map((it) => (
              <Card key={it.id} className="flex items-center gap-2 py-2">
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
                      'truncate text-sm',
                      it.status === 'done' && 'text-muted line-through'
                    )}
                  >
                    {it.title}
                  </p>
                  {it.description && (
                    <p className="truncate text-xs text-muted">
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Album</h2>
          <Button size="sm" variant="ghost" onClick={() => setCam(true)}>
            <Camera size={16} /> Photo
          </Button>
        </div>
        {(photos ?? []).length === 0 ? (
          <Empty icon="📸" title="No photos yet" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(photos ?? []).map((p) => (
              <div key={p.id} className="relative">
                <GeorgiaPhoto
                  path={p.image_path}
                  className="aspect-square w-full rounded object-cover"
                />
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => {
                    if (confirm('Delete photo?'))
                      delPhoto.mutate({ id: p.id, tripId: trip.id });
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
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
