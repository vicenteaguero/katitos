import { describe, expect, it } from 'vitest';
import { EMPTY_POTS, money, splitDay, unplaced } from './money';

/** Her habits on a day, five of them, with the first `n` held. */
const day = (held: number, total = 5) =>
  Array.from({ length: total }, (_, i) => ({
    habitId: `h${i + 1}`,
    held: i < held,
  }));

describe('a day, to each pot', () => {
  it('pays a dollar a habit and burns three a miss', () => {
    const s = splitDay({ habits: day(3) });
    expect(s.held).toHaveLength(3);
    expect(s.missed).toEqual(['h4', 'h5']);
    expect(s.giftCents).toBe(300);
    expect(s.betCents).toBe(600);
  });

  it('gives her the lot for a perfect day, and burns nothing', () => {
    const s = splitDay({ habits: day(5) });
    expect(s.giftCents).toBe(500);
    expect(s.betCents).toBe(0);
    expect(s.missed).toEqual([]);
  });

  it('burns fifteen on a day she did not open the app', () => {
    const s = splitDay({ habits: day(0) });
    expect(s.giftCents).toBe(0);
    expect(s.betCents).toBe(1500);
  });

  it('follows however many habits he has given her', () => {
    // Three habits, two held: the arithmetic is the habits, not a fixed five.
    const s = splitDay({ habits: day(2, 3) });
    expect(s.giftCents).toBe(200);
    expect(s.betCents).toBe(300);
  });

  it('is a quiet zero on a day she has no habits at all', () => {
    const s = splitDay({ habits: [] });
    expect(s.giftCents).toBe(0);
    expect(s.betCents).toBe(0);
  });

  it('keeps what she held on a hard day, and burns none of the rest', () => {
    // The valve must not have a price on it: pressing it used to cost her the
    // dollars she had already earned, on the day she could least afford it.
    const s = splitDay({ habits: day(2), hardDay: true });
    expect(s.forgiven).toBe(true);
    expect(s.giftCents).toBe(200);
    expect(s.betCents).toBe(0);
  });

  it('moves nothing at all while she has it switched off', () => {
    const s = splitDay({ habits: day(1), paused: true });
    expect(s.free).toBe(true);
    expect(s.forgiven).toBe(true);
    expect(s.giftCents).toBe(0);
    expect(s.betCents).toBe(0);
  });

  it('honours retuned stakes', () => {
    const s = splitDay({
      habits: day(1),
      stakes: { giftCents: 200, betCents: 500 },
    });
    expect(s.giftCents).toBe(200);
    expect(s.betCents).toBe(2000);
  });
});

describe('money, said out loud', () => {
  it('drops the cents when there are none', () => {
    expect(money(300)).toBe('$3');
    expect(money(1500)).toBe('$15');
    expect(money(0)).toBe('$0');
  });

  it('keeps them when they are real', () => {
    expect(money(1250)).toBe('$12.50');
  });

  it('groups the thousands, because one day it will need to', () => {
    expect(money(123400)).toBe('$1,234');
  });
});

describe('what he still owes the bookmaker', () => {
  it('is the condemned money he has not placed yet', () => {
    expect(unplaced({ ...EMPTY_POTS, betCents: 4500, stakedCents: 3000 })).toBe(
      1500
    );
  });

  it('never goes negative when he overstakes', () => {
    expect(unplaced({ ...EMPTY_POTS, betCents: 300, stakedCents: 900 })).toBe(
      0
    );
  });
});
