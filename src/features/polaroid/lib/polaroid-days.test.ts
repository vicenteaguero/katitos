import { describe, expect, it } from 'vitest';
import { DateTime } from '@kernel/lib';
import type { Polaroid } from '../types';
import {
  borrowedDay,
  dayKind,
  frontOf,
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
    expect(openDays(CURICO, NOVOSIBIRSK, ALIGNED)).toEqual(['2026-08-11']);
  });

  it('is newest-first so the picker leads with the most recent day', () => {
    expect(openDays(CURICO, NOVOSIBIRSK, SPLIT)).toEqual([
      '2026-08-12',
      '2026-08-11',
    ]);
  });

  it('shuts a day the moment it is over in both places - no grace', () => {
    // 04:30 UTC = 00:30 on the 12th in Curicó, 11:30 on the 12th in
    // Novosibirsk. The 11th is nobody's date any more, so it is NOT on offer:
    // this exact half hour used to hand back a day both of us had finished.
    const justAfterMidnight = DateTime.fromISO('2026-08-12T04:30:00Z', {
      zone: 'utc',
    });
    expect(localDay(CURICO, justAfterMidnight)).toBe('2026-08-12');
    expect(localDay(NOVOSIBIRSK, justAfterMidnight)).toBe('2026-08-12');
    expect(
      isDayOpen('2026-08-11', CURICO, NOVOSIBIRSK, justAfterMidnight)
    ).toBe(false);
    // …and with both of us in Curicó, where there is no second clock to
    // borrow from at all.
    expect(isDayOpen('2026-08-11', CURICO, CURICO, justAfterMidnight)).toBe(
      false
    );
  });

  it('offers a day right up to its last second somewhere', () => {
    // 03:59:59 UTC = 23:59:59 on the 11th in Curicó. Still hers to fill.
    const lastSecond = DateTime.fromISO('2026-08-12T03:59:59Z', {
      zone: 'utc',
    });
    expect(isDayOpen('2026-08-11', CURICO, NOVOSIBIRSK, lastSecond)).toBe(true);
  });

  it('is symmetric - both of us compute the same set', () => {
    expect(openDays(CURICO, NOVOSIBIRSK, SPLIT)).toEqual(
      openDays(NOVOSIBIRSK, CURICO, SPLIT)
    );
  });
});

describe('dayKind', () => {
  it('names whose day each open date is', () => {
    expect(dayKind('2026-08-11', CURICO, SPLIT)).toBe('mine');
    expect(dayKind('2026-08-12', CURICO, SPLIT)).toBe('theirs');
    // …and read from her side the same two dates swap owners.
    expect(dayKind('2026-08-12', NOVOSIBIRSK, SPLIT)).toBe('mine');
    expect(dayKind('2026-08-11', NOVOSIBIRSK, SPLIT)).toBe('theirs');
  });
});

describe('borrowedDay', () => {
  it('is the day she is about to lose, seen from her side', () => {
    // 20:00 UTC: the 12th in Novosibirsk, still the 11th in Curicó. Her 11th
    // survives only as long as his clock says so.
    expect(borrowedDay(NOVOSIBIRSK, CURICO, SPLIT)).toBe('2026-08-11');
  });

  it('is nothing from his side - his extra day is one he has yet to live', () => {
    // The 12th is open to him too, but it is coming, not going.
    expect(borrowedDay(CURICO, NOVOSIBIRSK, SPLIT)).toBeNull();
  });

  it('is nothing while we share a date', () => {
    expect(borrowedDay(CURICO, NOVOSIBIRSK, ALIGNED)).toBeNull();
    expect(borrowedDay(NOVOSIBIRSK, CURICO, ALIGNED)).toBeNull();
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
    // Signed out (selfId null) - nothing is "mine", but both must still show.
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

describe('frontOf', () => {
  const both = groupByDay(
    [
      row({ id: '1', day: '2026-08-11', user_id: A }),
      row({ id: '2', day: '2026-08-11', user_id: B }),
    ],
    A
  )[0];

  it('puts your love on top by default - that is what you opened it for', () => {
    expect(frontOf(both, 'theirs')).toBe('theirs');
  });

  it('brings yours forward when you ask for it', () => {
    expect(frontOf(both, 'mine')).toBe('mine');
  });

  it('never fronts a side with no photo', () => {
    const onlyMine = groupByDay(
      [row({ id: '1', day: '2026-08-11', user_id: A })],
      A
    )[0];
    expect(frontOf(onlyMine, 'theirs')).toBe('mine');

    const onlyTheirs = groupByDay(
      [row({ id: '2', day: '2026-08-11', user_id: B })],
      A
    )[0];
    expect(frontOf(onlyTheirs, 'mine')).toBe('theirs');
  });

  it('leaves the preference alone when neither side has a photo', () => {
    const empty = {
      day: '2026-08-11',
      shared: null,
      mine: null,
      theirs: null,
      extras: [],
      isLegacy: false,
    };
    expect(frontOf(empty, 'theirs')).toBe('theirs');
  });
});
