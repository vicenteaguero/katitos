/** How long ago it reported in, in her words. */
export function lastSeen(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never';
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

/** 0.9931 → "99.3%". Under a full window it is a floor, never a promise. */
export function uptimeText(v: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(v > 0.99 ? 1 : 0)}%`;
}
