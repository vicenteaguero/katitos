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
  onDelete,
}: {
  trip: Trip;
  onDelete: (trip: Trip) => void;
}) {
  const range = dateRange(trip.start_date, trip.end_date);

  return (
    <Card className="flex items-center justify-between gap-3">
      <Link to={`/travel/${trip.id}`} className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{trip.name}</h3>
        <div className="mt-1 space-y-0.5 text-sm text-muted">
          {trip.destination && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{trip.destination}</span>
            </p>
          )}
          {range && (
            <p className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{range}</span>
            </p>
          )}
          {trip.budget_amount != null && (
            <p className="flex items-center gap-1.5 text-accent">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
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
