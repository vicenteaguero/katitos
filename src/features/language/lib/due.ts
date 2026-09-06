import { DateTime } from 'luxon';

/**
 * Whole days from today to a due date, on the calendar.
 *
 * `today` is a date, not a moment - the old sums divided "midnight of the
 * due day minus right now" by a day and rounded, so from noon on the due
 * day the homework read "1 day late". Callers pass the couple's shared day
 * (see `useToday`): eleven hours apart, "due Friday" was a different Friday
 * for each of us.
 */
export function daysUntil(
  dueOn: string,
  today: string = DateTime.now().toISODate()!
): number {
  return Math.round(
    (Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000
  );
}

/** "today" - "tomorrow" - "in 3 days" - "2 days late" - a date you can act on. */
export function dueLabel(dueOn: string, today?: string): string {
  const days = daysUntil(dueOn, today);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return '1 day late';
  return `${Math.abs(days)} days late`;
}

/** "just now" - "40 min ago" - "3 hrs ago" - "Tue 14:02" - when he did it. */
export function agoLabel(iso: string, now: DateTime = DateTime.now()): string {
  const t = DateTime.fromISO(iso);
  if (!t.isValid) return '';
  const m = Math.floor(now.diff(t, 'minutes').minutes);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  return t.toFormat('ccc HH:mm');
}

/** "due today" - "due in 3 days" - "2 days late" - for a line under a title. */
export function dueSentence(dueOn: string, today?: string): string {
  const label = dueLabel(dueOn, today);
  return label.endsWith('late') ? label : `due ${label}`;
}
