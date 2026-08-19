import { describe, expect, it } from 'vitest';
import {
  angleOf,
  handleTransform,
  MAX_SCALE,
  MIN_SCALE,
  needsNormalize,
  nextZBack,
  nextZFront,
  normalizeZ,
  orderStickers,
  snapAngle,
} from './sticker-math';

const s = (id: string, z: number, created_at = '2026-01-01T00:00:00Z') => ({
  id,
  z,
  created_at,
});

describe('orderStickers', () => {
  it('sorts back to front by depth', () => {
    const out = orderStickers([s('c', 5), s('a', -2), s('b', 0)]);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks a tie by age, then by id — never at random', () => {
    const out = orderStickers([
      s('y', 0, '2026-05-02T00:00:00Z'),
      s('x', 0, '2026-05-01T00:00:00Z'),
      s('a', 0, '2026-05-02T00:00:00Z'),
    ]);
    expect(out.map((x) => x.id)).toEqual(['x', 'a', 'y']);
  });

  it('leaves the caller’s array alone', () => {
    const input = [s('b', 2), s('a', 1)];
    orderStickers(input);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('z depths', () => {
  it('brings a sticker in front of everything', () => {
    expect(nextZFront([0, 3, -1])).toBe(4);
  });

  it('tucks a sticker behind everything', () => {
    expect(nextZBack([0, 3, -1])).toBe(-2);
  });

  it('starts at zero on an empty page', () => {
    expect(nextZFront([])).toBe(0);
    expect(nextZBack([])).toBe(0);
  });

  it('front, then back, then front again keeps moving in the right direction', () => {
    // The old version asserted `max([...zs, front]) === front`, which holds
    // for any implementation returning at least the maximum — including one
    // that forgets to add 1.
    let zs = [0, 1, 2];
    const a = nextZFront(zs);
    expect(a).toBe(3);
    zs = [...zs, a];
    const b = nextZBack(zs);
    expect(b).toBe(-1);
    zs = [...zs, b];
    expect(nextZFront(zs)).toBe(4);
  });
});

describe('normalize', () => {
  it('only bothers once the depths get silly', () => {
    expect(needsNormalize([0, 5, -5])).toBe(false);
    expect(needsNormalize([0, 10_001])).toBe(true);
  });

  it('re-numbers without moving anything', () => {
    const list = [s('c', 90_000), s('a', -90_000), s('b', 0)];
    expect(normalizeZ(list)).toEqual([
      { id: 'a', z: 0 },
      { id: 'b', z: 1 },
      { id: 'c', z: 2 },
    ]);
  });
});

describe('the corner handle', () => {
  const centre = { x: 100, y: 100 };
  const base = { scale: 1, rotation: 0, radius: 50, angle: 0 };

  it('grows the sticker as the finger moves away from the centre', () => {
    const { scale } = handleTransform(centre, { x: 200, y: 100 }, base);
    expect(scale).toBeCloseTo(2);
  });

  it('shrinks it as the finger comes in', () => {
    const { scale } = handleTransform(centre, { x: 125, y: 100 }, base);
    expect(scale).toBeCloseTo(0.5);
  });

  it('refuses to go past the size limits', () => {
    expect(handleTransform(centre, { x: 10_000, y: 100 }, base).scale).toBe(
      MAX_SCALE
    );
    expect(handleTransform(centre, { x: 100.5, y: 100 }, base).scale).toBe(
      MIN_SCALE
    );
  });

  it('turns the sticker by the angle the finger swept', () => {
    const { rotation } = handleTransform(
      centre,
      { x: 100, y: 150 },
      { ...base, rotation: 0 }
    );
    expect(rotation).toBeCloseTo(90);
  });

  it('turns by the CHANGE in angle, not by where the finger happens to be', () => {
    // Grabbing the handle at 45° and dragging to 90° is a 45° turn. Every
    // other rotation test starts at 0°, where forgetting to subtract the grab
    // angle makes no difference at all — so this is the one that catches it.
    const { rotation } = handleTransform(
      centre,
      { x: 100, y: 150 },
      {
        scale: 1,
        rotation: 10,
        radius: 50,
        angle: 45,
      }
    );
    expect(rotation).toBeCloseTo(55);
  });

  it('does not divide by a grab that started on the centre', () => {
    const { scale } = handleTransform(
      centre,
      { x: 180, y: 100 },
      { ...base, radius: 0 }
    );
    expect(scale).toBe(1);
  });

  it('snaps to straight angles, so a photo can sit level', () => {
    expect(snapAngle(2)).toBe(0);
    expect(snapAngle(88)).toBe(90);
    expect(snapAngle(-179)).toBe(-180);
    expect(snapAngle(45)).toBe(45);
  });

  it('measures angles the way CSS rotate does', () => {
    expect(angleOf(centre, { x: 200, y: 100 })).toBeCloseTo(0);
    expect(angleOf(centre, { x: 100, y: 200 })).toBeCloseTo(90);
  });
});
