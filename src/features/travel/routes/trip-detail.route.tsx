import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Trash2,
  Wallet,
} from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { DateTime, cn, formatMoney } from '@kernel/lib';
import {
  Badge,
  Card,
  Empty,
  TopBarAdd,
  IconButton,
  LoadingScreen,
  Sheet,
  toast,
} from '@kernel/ui';
import { useTrip, useTripItems } from '../api/travel.queries';
import { useDeleteTripItem, useToggleTripItem } from '../api/travel.mutations';
import { TripItemForm } from '../components/trip-item-form';
import { tripItemMeta, type Trip, type TripItem } from '../types';

const fmtDate = (v: string) => DateTime.fromISO(v).toFormat('LLL d, yyyy');

function dateRange(start: string | null, end: string | null): string | null {
  if (start && end) {
    const s = DateTime.fromISO(start);
    const e = DateTime.fromISO(end);
    if (s.year === e.year) {
      return `${s.toFormat('LLL d')} – ${e.toFormat('LLL d, yyyy')}`;
    }
    return `${fmtDate(start)} – ${fmtDate(end)}`;
  }
  if (start) return fmtDate(start);
  if (end) return fmtDate(end);
  return null;
}

function TripHeader({ trip }: { trip: Trip }) {
  const range = dateRange(trip.start_date, trip.end_date);
  return (
    <div className="space-y-4">
      <p className="eyebrow">Our Itinerary</p>
      {/* The lit-stage postcard — a marble panel with wine serif, the folio's
          one texture moment. */}
      <div className="marble gilt-hairline relative px-stage py-8 shadow-loge">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-accent">
          {trip.name}
        </h1>
        {trip.destination && (
          <p className="mt-2 flex items-center gap-1.5 font-display text-xl italic tracking-tight text-brown">
            <MapPin className="h-4 w-4 shrink-0 text-copper" />
            {trip.destination}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-sans text-sm font-medium text-brown">
          {range && (
            <span className="flex items-center gap-1.5 tabular-nums">
              <CalendarDays className="h-4 w-4 text-copper" /> {range}
            </span>
          )}
          {trip.budget_amount != null && (
            <span className="flex items-center gap-1.5 tabular-nums text-accent">
              <Wallet className="h-4 w-4" />
              {formatMoney(trip.budget_amount, trip.budget_currency ?? 'USD')}
            </span>
          )}
        </div>
        {trip.notes && (
          <p className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-brown/90">
            {trip.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function TripItemRow({ item, index = 0 }: { item: TripItem; index?: number }) {
  const toggle = useToggleTripItem();
  const del = useDeleteTripItem();
  const meta = tripItemMeta(item.kind);
  const done = item.status === 'done';

  const handleToggle = () =>
    toggle.mutate(
      {
        id: item.id,
        tripId: item.trip_id,
        status: done ? 'open' : 'done',
      },
      { onError: (e) => toast.error(e.message) }
    );

  const handleDelete = () => {
    if (confirm(`Delete "${item.title}"?`)) {
      del.mutate(
        { id: item.id, tripId: item.trip_id },
        {
          onSuccess: () => toast.success('Deleted'),
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  return (
    <Card
      className="flex items-start gap-3"
      style={{ '--i': index } as React.CSSProperties}
    >
      <button
        type="button"
        aria-label={done ? 'Mark as open' : 'Mark as done'}
        aria-pressed={done}
        onClick={handleToggle}
        disabled={toggle.isPending}
        className={cn(
          'lift-press mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-none border transition',
          done
            ? 'border-success bg-success text-accent-fg'
            : 'border-border bg-surface-2 text-transparent'
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'truncate font-display text-lg font-medium tracking-tight text-fg',
              done && 'text-muted line-through'
            )}
          >
            {item.title}
          </p>
          <Badge tone="accent" className="shrink-0">
            {meta.emoji} {meta.label}
          </Badge>
        </div>
        {item.description && (
          <p className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
            {item.description}
          </p>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-sans text-sm text-copper"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="truncate">{item.link}</span>
          </a>
        )}
      </div>

      <IconButton label="Delete item" onClick={handleDelete}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </Card>
  );
}

export function TripDetailRoute() {
  const { tripId } = useParams<{ tripId: string }>();
  useTableSync('trip_items', qk.trips.items(tripId ?? ''), {
    enabled: !!tripId,
  });
  const trip = useTrip(tripId);
  const items = useTripItems(tripId);
  const [adding, setAdding] = useState(false);

  const back = (
    <Link
      to="/travel"
      className="inline-flex items-center gap-1 text-sm text-muted"
    >
      <ChevronLeft size={16} /> All trips
    </Link>
  );

  if (!tripId) {
    return (
      <div className="space-y-4">
        {back}
        <Empty icon="🧭" title="No trip selected" />
      </div>
    );
  }

  if (trip.isLoading) {
    return (
      <div className="space-y-4">
        {back}
        <LoadingScreen />
      </div>
    );
  }

  if (trip.isError || !trip.data) {
    return (
      <div className="space-y-4">
        {back}
        <Empty
          icon="⚠️"
          title="Trip not found"
          hint="It may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="curtain-reveal space-y-act">
      {back}
      <TripHeader trip={trip.data} />

      {items.isLoading ? (
        <LoadingScreen />
      ) : items.isError ? (
        <Empty icon="⚠️" title="Couldn't load items" hint="Try again." />
      ) : !items.data || items.data.length === 0 ? (
        <Empty
          icon="🗒️"
          title="Nothing planned yet"
          hint="Tap + to add ideas, places, or to-dos."
        />
      ) : (
        <div className="curtain-stagger space-y-5">
          {items.data.map((item, i) => (
            <TripItemRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      <TopBarAdd label="Add item" onClick={() => setAdding(true)} />

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add item">
        <TripItemForm tripId={tripId} onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}
