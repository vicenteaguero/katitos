import { describe, expect, it } from 'vitest';
import { DateTime } from '@kernel/lib';
import type { Polaroid } from '../types';
import {
  dayKind,
  groupByDay,
  isDayOpen,
  localDay,
  openDays,
} from './polaroid-days';

const CURICO = 'America/Santiago'; // UTC-4
const NOVOSIBIRSK = 'Asia/Novosibirsk'; // UTC+7

/** 2026-08-11 20:00 UTC → 16:00 the 11th in Curicó, 03:00 the 12th in Novosibirsk. */
const SPLIT = DateTime.fromISO('2026-08-11T20:00:00Z', { zone: 'utc' });
/** 2026-08-11 12:00 UTC → 08:00 the 11th in Curicó, 19:00 the 11th in Novosibirsk. */
const ALIGNED = DateTime.fromISO('2026-08-11T12:00:00Z', { zone: 'utc' });

const A = 'aaaa-1111';
const B = 'bbbb-2222';

function row(over: Partial<Polaroid> & { day: string; id: string }): Polaroid {
  return {
    caption: null,
    created_at: '2026-08-11T00:00:00Z',
    image_path: `${over.id}.jpg`,
    is_shared: false,
    taken_by: A,
    updated_at: '2026-08-11T00:00:00Z',
    user_id: A,
    ...over,
  } as Polaroid;
}

describe('localDay', () => {
  it('gives each zone its own civil date across the split', () => {
    expect(localDay(CURICO, SPLIT)).toBe('2026-08-11');
    expect(localDay(NOVOSIBIRSK, SPLIT)).toBe('2026-08-12');
  });

  it('falls back to UTC for an unknown zone, never the host zone', () => {
    expect(localDay(null, SPLIT)).toBe('2026-08-11');
    expect(localDay(undefined, SPLIT)).toBe('2026-08-11');
  });
});

describe('openDays', () => {
  it('keeps BOTH dates open while the two of us are on different days', () => {
    const open = openDays(CURICO, NOVOSIBIRSK, SPLIT);
    expect(open).toContain('2026-08-11'); // still today in Curicó
    expect(open).toContain('2026-08-12'); // already today in Novosibirsk
  });

  it('closes a day only once it is past for BOTH of us', () => {
    expect(isDayOpen('2026-08-10', CURICO, NOVOSIBIRSK, SPLIT)).toBe(false);
    expect(isDayOpen('2026-08-13', CURICO, NOVOSIBIRSK, SPLIT)).toBe(false);
  });

  it('collapses to one day when both of us are on the same date', () => {
    // 19:00 in Novosibirsk +2h grace still lands on the 11th.
    expect(openDays(CURICO, NOVOSIBIRSK, ALIGNED)).toEqual(['2026-08-11']);
  });

  it('is newest-first so the picker leads with the most recent day', () => {
    expect(openDays(CURICO, NOVOSIBIRSK, SPLIT)).toEqual([
      '2026-08-12',
      '2026-08-11',
    ]);
  });

  it('grants the ±2h grace that saves a photo taken at 23:59', () => {
    // 03:30 UTC = 23:30 on the 11th in Curicó. One hour later it is the 12th
    // there, but the 11th must stay writable while an upload lands.
    const justAfterMidnight = DateTime.fromISO('2026-08-12T04:30:00Z', {
      zone: 'utc',
    });
    expect(localDay(CURICO, justAfterMidnight)).toBe('2026-08-12');
    expect(isDayOpen('2026-08-11', CURICO, CURICO, justAfterMidnight)).toBe(
      true
    );
  });

  it('is symmetric — both of us compute the same set', () => {
    expect(openDays(CURICO, NOVOSIBIRSK, SPLIT)).toEqual(
      openDays(NOVOSIBIRSK, CURICO, SPLIT)
    );
  });
});

describe('dayKind', () => {
  it('names whose day each open date is', () => {
    expect(dayKind('2026-08-11', CURICO, NOVOSIBIRSK, SPLIT)).toBe('mine');
    expect(dayKind('2026-08-12', CURICO, NOVOSIBIRSK, SPLIT)).toBe('theirs');
    expect(dayKind('2026-08-09', CURICO, NOVOSIBIRSK, SPLIT)).toBe('grace');
  });
});

describe('groupByDay', () => {
  it('pairs our two photos on the same day', () => {
    const days = groupByDay(
      [
        row({ id: '1', day: '2026-08-11', user_id: A }),
        row({ id: '2', day: '2026-08-11', user_id: B }),
      ],
      A
    );
    expect(days).toHaveLength(1);
    expect(days[0].mine?.id).toBe('1');
    expect(days[0].theirs?.id).toBe('2');
    expect(days[0].isLegacy).toBe(false);
  });

  it('leaves a day with only one photo perfectly valid', () => {
    const days = groupByDay(
      [row({ id: '1', day: '2026-08-11', user_id: B })],
      A
    );
    expect(days[0].mine).toBeNull();
    expect(days[0].theirs?.id).toBe('1');
  });

  it('renders a legacy shared photo as a single plate', () => {
    const days = groupByDay(
      [row({ id: 'old', day: '2026-06-14', is_shared: true })],
      A
    );
    expect(days[0].isLegacy).toBe(true);
    expect(days[0].shared?.id).toBe('old');
    expect(days[0].mine).toBeNull();
    expect(days[0].theirs).toBeNull();
  });

  it('preserves newest-first day order from the query', () => {
    const days = groupByDay(
      [
        row({ id: '1', day: '2026-08-11' }),
        row({ id: '2', day: '2026-08-10' }),
        row({ id: '3', day: '2026-08-10' }),
      ],
      A
    );
    expect(days.map((d) => d.day)).toEqual(['2026-08-11', '2026-08-10']);
  });

  it('never drops a row it cannot classify', () => {
    // Signed out (selfId null) — nothing is "mine", but both must still show.
    const days = groupByDay(
      [
        row({ id: '1', day: '2026-08-11', user_id: A }),
        row({ id: '2', day: '2026-08-11', user_id: B }),
      ],
      null
    );
    const shown = [days[0].mine, days[0].theirs, ...days[0].extras].filter(
      Boolean
    );
    expect(shown).toHaveLength(2);
  });

  it('keeps a third unexpected row visible in extras', () => {
    const days = groupByDay(
      [
        row({ id: '1', day: '2026-08-11', user_id: A }),
        row({ id: '2', day: '2026-08-11', user_id: B }),
        row({ id: '3', day: '2026-08-11', user_id: 'cccc-3333' }),
      ],
      A
    );
    expect(days[0].extras.map((r) => r.id)).toEqual(['3']);
  });
});
