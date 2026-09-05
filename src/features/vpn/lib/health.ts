import type { VpnServer } from '../types';

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

/**
 * One sentence for the whole fleet, which is the only thing the home screen
 * has room for.
 *
 * The order is deliberate: a live main server is the answer, and a live spare
 * is still an answer. Everything dark is the only case worth a warning, and
 * even then the honest wording is "cannot reach", not "down" — a box can be
 * perfectly healthy and simply unable to reach Supabase.
 */
export function fleetSummary(servers: VpnServer[]): {
  tone: 'good' | 'warn' | 'bad';
  line: string;
} {
  if (servers.length === 0) {
    return { tone: 'warn', line: 'No servers set up yet' };
  }
  const live = servers.filter((s) => s.alive);
  if (live.length === 0) {
    return { tone: 'bad', line: 'No server has reported in' };
  }
  const main = live.find((s) => s.role === 'primary');
  const spare = live.length - 1;
  const where = (main ?? live[0]).label;
  return {
    tone: main ? 'good' : 'warn',
    line: main
      ? `${where} is up${spare > 0 ? ` · ${spare} spare${spare > 1 ? 's' : ''} ready` : ''}`
      : `${where} is up — the main one is quiet`,
  };
}
