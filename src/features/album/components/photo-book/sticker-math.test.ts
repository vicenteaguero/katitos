import { describe, expect, it } from 'vitest';
import {
  BASE_W,
  FILM_EDGE,
  MAX_SCALE,
  MIN_SCALE,
  angleOf,
  dropSpot,
  handleTransform,
  matFraction,
  needsNormalize,
  nextZBack,
  nextZFront,
  normalizeZ,
  orderStickers,
  shapeRatio,
  shapedWidth,
  snapAngle,
  stepOrder,
  stickerWidth,
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

/**
 * Four photos onto a page, four photos you can see.
 *
 * They all landed on the exact centre of the page, one hiding the next, which
 * from the outside is indistinguishable from "I added them and nothing
 * happened".
 */
describe('dropSpot', () => {
  it('does not put the second sticker on top of the first', () => {
    const a = dropSpot(0);
    const b = dropSpot(1);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.1);
  });

  it('keeps a whole page of stickers apart from each other', () => {
    const spots = Array.from({ length: 7 }, (_, i) => dropSpot(i));
    for (let i = 0; i < spots.length; i++) {
      for (let k = i + 1; k < spots.length; k++) {
        const d = Math.hypot(spots[i].x - spots[k].x, spots[i].y - spots[k].y);
        expect(d, `${i} vs ${k}`).toBeGreaterThan(0.08);
      }
    }
  });

  it('never lands half off the paper', () => {
    for (let i = 0; i < 40; i++) {
      const { x, y } = dropSpot(i);
      expect(x).toBeGreaterThanOrEqual(0.18);
      expect(x).toBeLessThanOrEqual(0.82);
      expect(y).toBeGreaterThanOrEqual(0.18);
      expect(y).toBeLessThanOrEqual(0.82);
    }
  });

  it('is the same on both phones', () => {
    expect(dropSpot(3)).toEqual(dropSpot(3));
  });

  it('leans them alternately, so it reads as a page and not a grid', () => {
    expect(dropSpot(0).rotation).toBeLessThan(0);
    expect(dropSpot(1).rotation).toBeGreaterThan(0);
  });

  it('starts in the middle when the page is empty', () => {
    expect(dropSpot(0).x).toBeCloseTo(0.5);
    expect(dropSpot(0).y).toBeCloseTo(0.5);
  });
});

/**
 * Two photos of different shapes should look like a pair, not a mismatch.
 *
 * Everything was 42% of the page wide whatever it was, so a portrait picture
 * towered over the landscape one next to it — same width, nearly twice the
 * height. Matching area instead is what makes a page look arranged.
 */
describe('stickerWidth', () => {
  const area = (r: number) => {
    const w = stickerWidth(r * 100, 100);
    return w * (w / r);
  };

  it('gives a wide photo and a tall one the same amount of paper', () => {
    expect(area(16 / 9)).toBeCloseTo(area(9 / 16), 3);
  });

  it('makes a wide photo wider and a tall one narrower', () => {
    expect(stickerWidth(1600, 900)).toBeGreaterThan(BASE_W);
    expect(stickerWidth(900, 1600)).toBeLessThan(BASE_W);
  });

  it('leaves a square photo at the base size', () => {
    expect(stickerWidth(800, 800)).toBeCloseTo(BASE_W, 5);
  });

  it('falls back to the base size when the shape is unknown', () => {
    expect(stickerWidth(null, null)).toBe(BASE_W);
    expect(stickerWidth(0, 0)).toBe(BASE_W);
  });

  it('never spans the whole page, however extreme the panorama', () => {
    expect(stickerWidth(4000, 200)).toBeLessThanOrEqual(0.72);
    expect(stickerWidth(200, 4000)).toBeGreaterThanOrEqual(0.22);
  });
});

describe('shapeRatio', () => {
  it('lets a natural photo keep its own proportions', () => {
    expect(shapeRatio('natural', 3000, 2000)).toBeCloseTo(1.5, 6);
    expect(shapeRatio('rounded', 2000, 3000)).toBeCloseTo(2 / 3, 6);
  });

  it('imposes its own on the shapes that have one', () => {
    for (const shape of ['square', 'circle', 'heart', 'torn'] as const) {
      expect(shapeRatio(shape, 3000, 2000)).toBe(1);
    }
    expect(shapeRatio('arch', 3000, 2000)).toBeCloseTo(0.75, 6);
  });

  it('falls back to square when the photo has never been measured', () => {
    expect(shapeRatio('natural', null, null)).toBe(1);
  });
});

describe('shapedWidth', () => {
  it('sizes a shaped sticker by the frame, not by the photograph', () => {
    // A wide photo forced into a circle is a circle: it must be sized like
    // one, or it comes out as wide as the landscape it used to be and then
    // cropped to a much smaller round window.
    expect(shapedWidth('circle', 3000, 2000)).toBeCloseTo(BASE_W, 6);
    expect(shapedWidth('natural', 3000, 2000)).toBeGreaterThan(BASE_W);
  });

  it('matches areas across shapes, which is what makes a page read as a page', () => {
    const area = (w: number, ratio: number) => w * (w / ratio);
    const a = shapedWidth('natural', 3000, 2000);
    const b = shapedWidth('natural', 2000, 3000);
    expect(area(a, 1.5)).toBeCloseTo(area(b, 2 / 3), 6);
  });
});

describe('stepOrder', () => {
  const page = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      z: i * 10, // sparse, the way real depths drift
      created_at: `2026-01-0${i + 1}`,
    }));

  it('moves one place, not all the way', () => {
    const list = page(5); // s0 at the back … s4 in front
    const rows = stepOrder(list, 's1', 1);
    const after = orderStickers(
      list.map((s) => ({ ...s, z: rows.find((r) => r.id === s.id)?.z ?? s.z }))
    ).map((s) => s.id);
    expect(after).toEqual(['s0', 's2', 's1', 's3', 's4']);
  });

  it('goes the other way too', () => {
    const list = page(5);
    const rows = stepOrder(list, 's3', -1);
    const after = orderStickers(
      list.map((s) => ({ ...s, z: rows.find((r) => r.id === s.id)?.z ?? s.z }))
    ).map((s) => s.id);
    expect(after).toEqual(['s0', 's1', 's3', 's2', 's4']);
  });

  it('can reach any arrangement, one press at a time', () => {
    let list = page(4);
    // Walk the back-most sticker all the way to the front.
    for (let i = 0; i < 3; i++) {
      const rows = stepOrder(list, 's0', 1);
      list = list.map((s) => ({
        ...s,
        z: rows.find((r) => r.id === s.id)?.z ?? s.z,
      }));
    }
    expect(orderStickers(list).map((s) => s.id)).toEqual([
      's1',
      's2',
      's3',
      's0',
    ]);
  });

  it('does nothing at the ends', () => {
    const list = page(3);
    expect(stepOrder(list, 's0', -1)).toEqual([]);
    expect(stepOrder(list, 's2', 1)).toEqual([]);
    expect(stepOrder(list, 'nope', 1)).toEqual([]);
  });

  it('tidies the sparse depths while it is there', () => {
    const rows = stepOrder(page(4), 's1', 1);
    for (const r of rows) expect(r.z).toBeLessThan(4);
  });
});

describe('matFraction', () => {
  it('grows with the thickness you asked for', () => {
    expect(matFraction('white', 'thin')).toBeLessThan(
      matFraction('white', 'medium')
    );
    expect(matFraction('white', 'medium')).toBeLessThan(
      matFraction('white', 'wide')
    );
  });

  it('is a FRACTION, so the card grows with the photograph', () => {
    // The old band was a fixed 5px: at scale 0.3 the sticker was nearly all
    // card, at scale 3 it was a hairline. Every value here is well under 1,
    // i.e. a share of the sticker's own width.
    for (const w of ['thin', 'medium', 'wide'] as const) {
      expect(matFraction('white', w)).toBeGreaterThan(0);
      expect(matFraction('white', w)).toBeLessThan(0.2);
    }
  });

  it('gives each mount only as much card as it wants', () => {
    expect(matFraction('none', 'wide')).toBe(0);
    expect(matFraction('tape', 'wide')).toBe(0);
    expect(matFraction('gilt', 'wide')).toBeLessThan(
      matFraction('white', 'wide')
    );
    expect(matFraction('shadow', 'wide')).toBeLessThan(
      matFraction('white', 'wide')
    );
  });

  it('lets instant film keep its own proportions', () => {
    // Film is film — the thickness control does not apply to it.
    for (const w of ['thin', 'medium', 'wide'] as const) {
      expect(matFraction('polaroid', w)).toBe(FILM_EDGE);
    }
  });

  it('falls back rather than producing NaN for anything unexpected', () => {
    expect(matFraction(null, null)).toBeGreaterThan(0);
    expect(Number.isFinite(matFraction('nonsense', 'nonsense'))).toBe(true);
  });
});
