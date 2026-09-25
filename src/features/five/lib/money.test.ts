import { describe, expect, it } from 'vitest';
import { EMPTY_POTS, money, splitDay, unplaced } from './money';

describe('a day, to each pot', () => {
  it('pays a dollar a goal and burns three a miss', () => {
    const s = splitDay({ done: ['sleep', 'work', 'eat'] });
    expect(s.done).toEqual(['sleep', 'work', 'eat']);
    expect(s.missed).toEqual(['study', 'move']);
    expect(s.giftCents).toBe(300);
    expect(s.betCents).toBe(600);
  });

  it('gives her five dollars for a perfect day, and burns nothing', () => {
    const s = splitDay({ done: ['sleep', 'work', 'study', 'eat', 'move'] });
    expect(s.giftCents).toBe(500);
    expect(s.betCents).toBe(0);
    expect(s.missed).toEqual([]);
  });

  it('burns fifteen on a day she did not open the app', () => {
    const s = splitDay({ done: [] });
    expect(s.giftCents).toBe(0);
    expect(s.betCents).toBe(1500);
  });

  it('keeps what she held on a hard day, and burns none of the rest', () => {
    // The valve must not have a price on it: on the day she can least afford
    // it, pressing it used to cost her the two dollars she had already earned.
    const s = splitDay({ done: ['sleep', 'work'], hardDay: true });
    expect(s.forgiven).toBe(true);
    expect(s.giftCents).toBe(200);
    expect(s.betCents).toBe(0);
    expect(s.done).toEqual(['sleep', 'work']);
  });

  it('moves nothing at all while she has it switched off', () => {
    const s = splitDay({ done: ['sleep'], paused: true });
    expect(s.free).toBe(true);
    expect(s.forgiven).toBe(true);
    expect(s.giftCents).toBe(0);
    expect(s.betCents).toBe(0);
  });

  it('honours retuned stakes', () => {
    const s = splitDay({
      done: ['sleep'],
      stakes: { giftCents: 200, betCents: 500 },
    });
    expect(s.giftCents).toBe(200);
    expect(s.betCents).toBe(2000);
  });

  it('ignores a goal id that is not one of the five', () => {
    const s = splitDay({ done: ['sleep', 'yoga'] });
    expect(s.done).toEqual(['sleep']);
    expect(s.missed).toHaveLength(4);
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
