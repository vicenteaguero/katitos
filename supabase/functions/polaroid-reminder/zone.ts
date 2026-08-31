/**
 * Civil time in someone else's country, with no library.
 *
 * The whole feature is "three hours left in YOUR day", so every number here has
 * to be the number on that person's wall clock — not the server's, and not a
 * fixed offset. `Intl` already knows every rule there is, including the two
 * nights a year when Curicó's day is 23 or 25 hours long; these helpers just
 * ask it the right questions.
 */

const PARTS = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let f = PARTS.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    PARTS.set(zone, f);
  }
  return f;
}

interface Civil {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function civil(zone: string, at: Date): Civil {
  const parts = formatter(zone).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  // Some ICU builds render midnight as hour 24 under hour12:false.
  const hour = get('hour') % 24;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/** That zone's civil date right now, as 'YYYY-MM-DD'. */
export function localDay(zone: string, at: Date): string {
  const c = civil(zone, at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${c.year}-${pad(c.month)}-${pad(c.day)}`;
}

/**
 * The first instant of `isoDay` in `zone`.
 *
 * Found by bisection, not by arithmetic, and that is deliberate. Chile changes
 * its clocks AT midnight: on 6 September 2026 the time 00:00 simply does not
 * exist there — it goes 23:59:59 straight to 01:00. Every "take midnight UTC
 * and subtract the offset" trick lands an hour on the wrong side of that one
 * boundary, and an hour wrong is the whole difference between "one hour left"
 * and "gone".
 *
 * So we ask the only question that is always well defined — "is it `isoDay`
 * there yet?" — and close in on the moment the answer changes. Correct for
 * every zone and every rule, including the ones nobody has written yet.
 */
export function startOfDay(zone: string, isoDay: string): Date {
  const midnightUtc = Date.parse(`${isoDay}T00:00:00Z`);
  // No zone is more than 14h from UTC, so 15h either side brackets the
  // boundary with room to spare.
  let before = midnightUtc - 15 * 3_600_000; // certainly the day before
  let after = midnightUtc + 15 * 3_600_000; // certainly isoDay or later

  while (after - before > 1) {
    const mid = before + Math.floor((after - before) / 2);
    if (localDay(zone, new Date(mid)) < isoDay) before = mid;
    else after = mid;
  }
  return new Date(after);
}

/** The day after an ISO date, as 'YYYY-MM-DD'. */
export function nextDay(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * When `isoDay` stops being the date on that zone's clock — i.e. its midnight.
 * A day is gone for everyone at the LATEST of these across our two zones.
 */
export function endOfDay(zone: string, isoDay: string): Date {
  return startOfDay(zone, nextDay(isoDay));
}
