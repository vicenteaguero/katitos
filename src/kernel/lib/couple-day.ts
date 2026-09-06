import { DateTime } from 'luxon';

/**
 * The shared "couple day" - the EARLIER (MIN) of the two members' local civil
 * dates. Using MIN (not MAX) keeps both partners on the same day until it is
 * tomorrow for *both* of them, so neither is ever handed tomorrow's content
 * while still living today. The function is symmetric: both partners compute
 * the identical string from the same instant.
 *
 * This is a display/convenience helper only - server RPCs compute their own
 * authoritative day (see the `*_ensure_today` / `water_tree` functions). Use
 * this to render "today" and to detect a midnight rollover (the string change
 * is the trigger to re-fetch the server day).
 *
 * A null/unknown zone falls back to UTC - never the host zone, which would make
 * a server build (UTC) silently disagree with a phone.
 */
export function coupleDay(
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  const a = now.setZone(selfZone ?? 'UTC').toISODate();
  const b = now.setZone(partnerZone ?? 'UTC').toISODate();
  // toISODate() only returns null for an invalid DateTime; guard defensively.
  const da = a ?? now.toUTC().toISODate()!;
  const db = b ?? now.toUTC().toISODate()!;
  return da < db ? da : db;
}

/**
 * True iff civil-date string `b` is exactly the day after `a`. UTC-anchored so
 * it is immune to host-zone / DST drift (do NOT use Luxon's local-zone
 * daysBetween for this). Both args are 'YYYY-MM-DD'.
 */
export function isNextDay(a: string, b: string): boolean {
  return (
    Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`) === 86_400_000
  );
}
