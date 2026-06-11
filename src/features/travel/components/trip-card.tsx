import { Link } from 'react-router';
import { CalendarDays, MapPin, Trash2, Wallet } from 'lucide-react';
import { DateTime, formatMoney } from '@kernel/lib';
import { Card, IconButton } from '@kernel/ui';
import type { Trip } from '../types';

function dateRange(start: string | null, end: string | null): string | null {
  const fmt = (v: string) => DateTime.fromISO(v).toFormat('LLL d, yyyy');
  if (start && end) {
    const s = DateTime.fromISO(start);
    const e = DateTime.fromISO(end);
    // Same year → trim the year off the start side for a tidy range.
    if (s.year === e.year) {
      return `${s.toFormat('LLL d')} – ${e.toFormat('LLL d, yyyy')}`;
    }
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (start) return fmt(start);
  if (end) return fmt(end);
  return null;
}

export function TripCard({
  trip,
  index = 0,
  onDelete,
}: {
  trip: Trip;
  index?: number;
  onDelete: (trip: Trip) => void;
}) {
  const range = dateRange(trip.start_date, trip.end_date);

  return (
    <Card
      className="relative flex items-center justify-between gap-3"
      style={{ '--i': index } as React.CSSProperties}
    >
      {/* Postcard stamp — the folio's signature, struck in Andes Copper */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 select-none font-display text-lg leading-none text-copper/70"
      >
        ✈
      </span>
      <Link
        to={`/travel/${trip.id}`}
        className="lift-press min-w-0 flex-1 pr-6"
      >
        <h3 className="truncate font-display text-2xl font-semibold tracking-tight text-fg">
          {trip.name}
        </h3>
        <hr className="seam my-3 opacity-60" aria-hidden="true" />
        <div className="space-y-1 font-sans text-sm text-muted">
          {trip.destination && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-copper" />
              <span className="truncate">{trip.destination}</span>
            </p>
          )}
          {range && (
            <p className="flex items-center gap-1.5 tabular-nums">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="truncate">{range}</span>
            </p>
          )}
          {trip.budget_amount != null && (
            <p className="flex items-center gap-1.5 tabular-nums text-fg">
              <Wallet className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="truncate">
                {formatMoney(trip.budget_amount, trip.budget_currency ?? 'USD')}
              </span>
            </p>
          )}
        </div>
      </Link>
      <IconButton label="Delete trip" onClick={() => onDelete(trip)}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </Card>
  );
}
