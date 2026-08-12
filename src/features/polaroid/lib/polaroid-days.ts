import { DateTime } from '@kernel/lib';
import type { Polaroid } from '../types';

/**
 * Which days you may still post a photo for, and how a day's rows pair up.
 *
 * Pure functions, no React, no Supabase — this is the half of the Double
 * Polaroid that has to be *exactly* right across an 11-hour gap, so it's kept
 * testable. The database enforces the same rule independently
 * (`polaroid_day_open`); this mirrors it so the UI never offers a day the
 * server will reject, and never hides one it would accept.
 */

/** The ±2h slack `polaroid_day_open()` uses. Mirrored here on purpose. */
const GRACE_HOURS = 2;

/** The civil date in a zone right now, as 'YYYY-MM-DD'. */
export function localDay(
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  // An unknown zone falls back to UTC, never the host zone — a build running in
  // UTC must not silently disagree with a phone.
  return now.setZone(zone ?? 'UTC').toISODate() ?? now.toUTC().toISODate()!;
}

/**
 * Every date that is still "today" for at least one of us, newest first.
 *
 * This is the whole rule. While it's the 12th in Novosibirsk and still the
 * 11th in Curicó, BOTH are open — so she can still post her 11th and he can
 * already post the 12th. Once it's the 12th in both, the 11th closes for good.
 *
 * The grace hours are included because the DB includes them: at 00:30 her
 * yesterday is still writable server-side, and it would be cruel to grey it out
 * in the UI while the server would happily take it.
 */
export function openDays(
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): string[] {
  const days = new Set<string>();
  for (const zone of [selfZone, partnerZone]) {
    for (const shift of [-GRACE_HOURS, 0, GRACE_HOURS]) {
      days.add(localDay(zone, now.plus({ hours: shift })));
    }
  }
  return [...days].sort((a, b) => (a < b ? 1 : -1));
}

/** Is this day still writable for either of us? */
export function isDayOpen(
  day: string,
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): boolean {
  return openDays(selfZone, partnerZone, now).includes(day);
}

/**
 * Why a given open day is on offer — so the picker can say "Aug 12 — already
 * today in Novosibirsk" instead of dumping bare dates on someone at midnight.
 */
export type DayKind = 'mine' | 'theirs' | 'grace';

export function dayKind(
  day: string,
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): DayKind {
  if (day === localDay(selfZone, now)) return 'mine';
  if (day === localDay(partnerZone, now)) return 'theirs';
  return 'grace';
}

/** One calendar day, with each of us on our own side of it. */
export interface PolaroidDay {
  day: string;
  /** A legacy pre-split photo: one plate, both of us. */
  shared: Polaroid | null;
  mine: Polaroid | null;
  theirs: Polaroid | null;
  /** Anything that fits nowhere. Rendered anyway — never lose a photo. */
  extras: Polaroid[];
  /** True when this day predates the split and shows as a single plate. */
  isLegacy: boolean;
}

/**
 * Fold flat rows into days. Rows arrive newest-first and stay that way.
 *
 * `extras` exists so that a row we didn't anticipate (a third member some day,
 * a hand-inserted fix) still reaches the screen. Silently dropping one of their
 * photos because it didn't match a shape would be the worst bug this file
 * could have.
 */
export function groupByDay(
  rows: Polaroid[],
  selfId: string | null
): PolaroidDay[] {
  const order: string[] = [];
  const byDay = new Map<string, Polaroid[]>();

  for (const row of rows) {
    const bucket = byDay.get(row.day);
    if (bucket) bucket.push(row);
    else {
      byDay.set(row.day, [row]);
      order.push(row.day);
    }
  }

  return order.map((day) => {
    const bucket = byDay.get(day)!;
    const shared = bucket.find((r) => r.is_shared) ?? null;
    const mine =
      bucket.find((r) => !r.is_shared && r.user_id === selfId) ?? null;
    const theirs =
      bucket.find(
        (r) => !r.is_shared && selfId != null && r.user_id !== selfId
      ) ?? null;
    const claimed = new Set(
      [shared, mine, theirs].filter(Boolean).map((r) => r!.id)
    );
    return {
      day,
      shared,
      mine,
      theirs,
      extras: bucket.filter((r) => !claimed.has(r.id)),
      isLegacy: shared != null,
    };
  });
}

/**
 * Which plate is in front. There is no third "neither" state: one of the two
 * is always on top, so a tap always means something and the caption below
 * always belongs to a photo.
 */
export type Focus = 'mine' | 'theirs';

/**
 * Whose photo is actually in front, given what exists.
 *
 * Your love's sits on top by default — the point of opening the app is to see
 * their day. A side with no photo can never be the front one, so the caption
 * editor never ends up pointing at nothing.
 */
export function frontOf(day: PolaroidDay, preferred: Focus): Focus {
  if (preferred === 'mine' && !day.mine && day.theirs) return 'theirs';
  if (preferred === 'theirs' && !day.theirs && day.mine) return 'mine';
  return preferred;
}
