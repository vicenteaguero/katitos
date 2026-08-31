/**
 * Whole days from today to a due date, on the calendar.
 *
 * The old sums divided "midnight of the due day minus right now" by a day and
 * rounded — so from noon on the due day the homework read "1 day late", and
 * at ten to midnight the night before it was already "today". Days are
 * counted between two midnights, in the phone's own zone: a date is a
 * calendar thing, not a number of hours.
 */
export function daysUntil(dueOn: string, now: Date = new Date()): number {
  const due = new Date(`${dueOn}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** "today" · "tomorrow" · "in 3 days" · "2 days late" — a date you can act on. */
export function dueLabel(dueOn: string, now: Date = new Date()): string {
  const days = daysUntil(dueOn, now);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return '1 day late';
  return `${Math.abs(days)} days late`;
}
