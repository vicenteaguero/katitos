import type { Tables } from '@kernel/supabase';

export type DateLog = Tables<'dates'>;
export type DateRating = Tables<'date_ratings'>;
export type DatePhoto = Tables<'date_photos'>;

export type DateStatus = 'idea' | 'scheduled' | 'done' | 'cancelled';

/** A date row joined with every partner's rating. */
export type DateWithRatings = DateLog & {
  date_ratings: Tables<'date_ratings'>[];
};

export const STATUS_LABELS: Record<DateStatus, string> = {
  idea: 'Idea',
  scheduled: 'Scheduled',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const STATUS_TONES: Record<
  DateStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'danger'
> = {
  idea: 'accent',
  scheduled: 'warning',
  done: 'success',
  cancelled: 'danger',
};

/** Coerce the free-text DB status into the known union (defaults to 'idea'). */
export function asDateStatus(value: string | null | undefined): DateStatus {
  return value === 'scheduled' ||
    value === 'done' ||
    value === 'cancelled' ||
    value === 'idea'
    ? value
    : 'idea';
}

/** Mean of the non-null star ratings, or null when there are none. */
export function averageStars(ratings: DateRating[]): number | null {
  const stars = ratings
    .map((r) => r.stars)
    .filter((s): s is number => typeof s === 'number');
  if (stars.length === 0) return null;
  return stars.reduce((a, b) => a + b, 0) / stars.length;
}
