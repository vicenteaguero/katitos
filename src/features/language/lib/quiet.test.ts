import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { clockIn, isAsleep } from './quiet';

const at = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' });

describe('isAsleep', () => {
  it('is night between 23:00 and 08:00 in their zone', () => {
    // 23:30 UTC is 02:30 in Moscow.
    expect(isAsleep('Europe/Moscow', at('2026-08-30T23:30:00'))).toBe(true);
    // 12:00 UTC is 15:00 in Moscow.
    expect(isAsleep('Europe/Moscow', at('2026-08-30T12:00:00'))).toBe(false);
  });

  it('treats the edges the way a person would', () => {
    // 05:00 UTC = 08:00 Moscow — up.
    expect(isAsleep('Europe/Moscow', at('2026-08-30T05:00:00'))).toBe(false);
    // 20:00 UTC = 23:00 Moscow — asleep.
    expect(isAsleep('Europe/Moscow', at('2026-08-30T20:00:00'))).toBe(true);
  });

  it('never holds a push back when the zone is unknown or nonsense', () => {
    expect(isAsleep(null, at('2026-08-30T01:00:00'))).toBe(false);
    expect(isAsleep('Mars/Olympus', at('2026-08-30T01:00:00'))).toBe(false);
  });
});

describe('clockIn', () => {
  it('reads their clock', () => {
    // Santiago is UTC−4 in August.
    expect(clockIn('America/Santiago', at('2026-08-30T12:00:00'))).toBe(
      '08:00'
    );
    expect(clockIn(null)).toBeNull();
    expect(clockIn('Mars/Olympus', at('2026-08-30T12:00:00'))).toBeNull();
  });
});
