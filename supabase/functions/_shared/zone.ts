/**
 * Civil time in someone else's country, with no library.
 *
 * The whole feature is "three hours left in YOUR day", so every number here has
 * to be the number on that person's wall clock - not the server's, and not a
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
 * exist there - it goes 23:59:59 straight to 01:00. Every "take midnight UTC
 * and subtract the offset" trick lands an hour on the wrong side of that one
 * boundary, and an hour wrong is the whole difference between "one hour left"
 * and "gone".
 *
 * So we ask the only question that is always well defined - "is it `isoDay`
 * there yet?" - and close in on the moment the answer changes. Correct for
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
 * When `isoDay` stops being the date on that zone's clock - i.e. its midnight.
 * A day is gone for everyone at the LATEST of these across our two zones.
 */
export function endOfDay(zone: string, isoDay: string): Date {
  return startOfDay(zone, nextDay(isoDay));
}

/**
 * The instant it is `hour` o'clock on `isoDay`, on that zone's wall clock.
 *
 * Not `startOfDay + hour hours`. The Five closes a day at 3AM her time, and on
 * the night a zone moves its clocks those two are an hour apart: Chile skips
 * midnight, so adding 27 hours to the start of 5 September lands at 04:00 and
 * not 03:00. The database and the app both ask the wall-clock question, so this
 * is the one that has to agree with them - an hour of disagreement here is an
 * hour in which one side says a day is still hers and the other has already
 * charged her for it.
 *
 * Found the same way `startOfDay` finds midnight, by bisection on a question
 * that is always well defined, so no rule anyone writes later can break it. If
 * the hour does not exist at all in that zone, the first instant after it is
 * returned, which errs long - in her favour.
 */
export function atLocalHour(zone: string, isoDay: string, hour: number): Date {
  const target = String(hour).padStart(2, '0');
  let before = startOfDay(zone, isoDay).getTime() - 3_600_000;
  let after = startOfDay(zone, nextDay(isoDay)).getTime() + 3 * 3_600_000;

  const reached = (at: number) => {
    const d = new Date(at);
    if (localDay(zone, d) > isoDay) return true;
    if (localDay(zone, d) < isoDay) return false;
    return hourIn(zone, d) >= Number(target);
  };

  while (after - before > 1) {
    const mid = before + Math.floor((after - before) / 2);
    if (reached(mid)) after = mid;
    else before = mid;
  }
  return new Date(after);
}

/** The hour on that zone's clock, 0 to 23. */
function hourIn(zone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(at);
  return Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
}
