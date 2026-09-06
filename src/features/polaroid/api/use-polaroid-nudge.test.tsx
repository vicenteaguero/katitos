import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Polaroid } from '../types';

const partner = vi.hoisted(() => ({ value: {} as unknown }));
const openRows = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('@kernel/auth', () => ({
  usePartner: () => partner.value,
}));
vi.mock('./polaroid.queries', () => ({
  useOpenDayPolaroids: () => ({ data: openRows.value, isLoading: false }),
}));

const { usePolaroidNudge } = await import('./use-polaroid-nudge');

const CURICO = 'America/Santiago';
const NOVOSIBIRSK = 'Asia/Novosibirsk';
const HIM = 'aaaa-1111';
const HER = 'bbbb-2222';

/** 20:00 UTC on the 11th → the 11th in Curicó, already the 12th for her. */
const SPLIT = new Date('2026-08-11T20:00:00Z');

function row(day: string, user_id: string, is_shared = false): Polaroid {
  return {
    id: `${day}-${user_id}`,
    day,
    user_id,
    taken_by: user_id,
    is_shared,
    image_path: 'x.jpg',
    caption: null,
    created_at: day,
    updated_at: day,
  } as Polaroid;
}

/** Look at the world from one person's chair. */
function as(self: { id: string; zone: string }, theirZone: string) {
  partner.value = {
    self: { user_id: self.id, timezone: self.zone },
    partner: { user_id: self.id === HIM ? HER : HIM, timezone: theirZone },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SPLIT);
  openRows.value = [];
});
afterEach(() => vi.useRealTimers());

describe('usePolaroidNudge', () => {
  it('asks for a photo when your own day is empty', () => {
    as({ id: HIM, zone: CURICO }, NOVOSIBIRSK);
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('shoot');
    expect(result.current.today).toBe('2026-08-11');
    expect(result.current.rescueDay).toBeNull();
  });

  it('goes quiet once his day is in - the day ahead is not his to lose', () => {
    // The 12th is open to him too (it is already her date), but it is a day he
    // has yet to live. Nothing is running out, so the button rests.
    as({ id: HIM, zone: CURICO }, NOVOSIBIRSK);
    openRows.value = [row('2026-08-11', HIM)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('done');
    expect(result.current.rescueDay).toBeNull();
  });

  it('points her at the day she is about to lose', () => {
    // Her today (the 12th) is done; her 11th is empty and lives only while
    // Curicó is still on the 11th.
    as({ id: HER, zone: NOVOSIBIRSK }, CURICO);
    openRows.value = [row('2026-08-12', HER)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('rescue');
    expect(result.current.rescueDay).toBe('2026-08-11');
  });

  it('rests once she has filled both', () => {
    as({ id: HER, zone: NOVOSIBIRSK }, CURICO);
    openRows.value = [row('2026-08-12', HER), row('2026-08-11', HER)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('done');
  });

  it('still asks for today even when the borrowed day is filled', () => {
    // Today always wins the button: it is the habit, and the borrowed day is
    // reachable from the Polaroid screen either way.
    as({ id: HER, zone: NOVOSIBIRSK }, CURICO);
    openRows.value = [row('2026-08-11', HER)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('shoot');
  });

  it('never nags for a second photo on a day we shared one', () => {
    // Legacy pre-split rows belong to the couple, not to one of us.
    as({ id: HIM, zone: CURICO }, NOVOSIBIRSK);
    openRows.value = [row('2026-08-11', HER, true)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('done');
  });

  it("ignores your love's photo when deciding whether YOURS is in", () => {
    as({ id: HIM, zone: CURICO }, NOVOSIBIRSK);
    openRows.value = [row('2026-08-11', HER)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('shoot');
  });

  it('rests for both of us while we share a date', () => {
    // 12:00 UTC → the 11th in both places. There is no borrowed day at all.
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));
    as({ id: HER, zone: NOVOSIBIRSK }, CURICO);
    openRows.value = [row('2026-08-11', HER)];
    const { result } = renderHook(() => usePolaroidNudge());
    expect(result.current.state).toBe('done');
    expect(result.current.today).toBe('2026-08-11');
  });
});
