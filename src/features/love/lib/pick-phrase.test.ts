import { describe, expect, it } from 'vitest';
import type { LovePhrase } from './pick-phrase';
import {
  eligiblePhrases,
  loveNoteFor,
  pickPhrase,
  renderPhrase,
} from './pick-phrase';

function phrase(over: Partial<LovePhrase> & { text: string }): LovePhrase {
  return {
    id: over.text,
    gender: 'any',
    weight: 1,
    enabled: true,
    position: 0,
    created_at: '2026-08-11T00:00:00Z',
    updated_at: '2026-08-11T00:00:00Z',
    ...over,
  } as LovePhrase;
}

const POOL: LovePhrase[] = [
  phrase({ text: 'любимая 🤍', gender: 'f' }),
  phrase({ text: 'любимый 🤍', gender: 'm' }),
  phrase({ text: 'Liubimonkeykaya 🥰', gender: 'f' }),
  phrase({ text: 'My polar bear 🐻‍❄️', gender: 'f' }),
  phrase({ text: 'Katitos forever', gender: 'any' }),
  phrase({ text: 'I love you, {name} 💕', gender: 'any' }),
  phrase({ text: 'retired line', gender: 'any', enabled: false }),
];

describe('eligiblePhrases', () => {
  it('never offers a feminine phrase for him — the bug this exists to fix', () => {
    const forHim = eligiblePhrases(POOL, 'm').map((p) => p.text);
    expect(forHim).not.toContain('любимая 🤍');
    expect(forHim).not.toContain('Liubimonkeykaya 🥰');
    expect(forHim).not.toContain('My polar bear 🐻‍❄️');
  });

  it('never offers a masculine phrase for her', () => {
    const forHer = eligiblePhrases(POOL, 'f').map((p) => p.text);
    expect(forHer).not.toContain('любимый 🤍');
  });

  it('offers the gender-neutral ones to both', () => {
    for (const g of ['m', 'f'] as const) {
      expect(eligiblePhrases(POOL, g).map((p) => p.text)).toContain(
        'Katitos forever'
      );
    }
  });

  it('leaves disabled phrases out entirely', () => {
    expect(eligiblePhrases(POOL, 'f').map((p) => p.text)).not.toContain(
      'retired line'
    );
  });
});

describe('pickPhrase', () => {
  it('only ever returns something addressed to the recipient', () => {
    // Sweep the whole random range rather than trusting one sample.
    for (let i = 0; i < 200; i++) {
      const picked = pickPhrase(POOL, 'm', () => i / 200);
      expect(picked).not.toBeNull();
      expect(['m', 'any']).toContain(picked!.gender);
    }
  });

  it('respects weight — a heavier phrase comes up more often', () => {
    const weighted = [
      phrase({ text: 'rare', weight: 1 }),
      phrase({ text: 'common', weight: 9 }),
    ];
    let common = 0;
    for (let i = 0; i < 100; i++) {
      if (pickPhrase(weighted, 'f', () => i / 100)?.text === 'common') common++;
    }
    expect(common).toBeGreaterThan(80);
  });

  it('returns null rather than throwing when nothing fits', () => {
    expect(pickPhrase([], 'f')).toBeNull();
    expect(pickPhrase([phrase({ text: 'x', gender: 'm' })], 'f')).toBeNull();
  });

  it('handles a random() of exactly 1 without falling off the end', () => {
    expect(pickPhrase(POOL, 'f', () => 1)).not.toBeNull();
  });
});

describe('renderPhrase', () => {
  it('fills in the pet name', () => {
    expect(renderPhrase('I love you, {name} 💕', 'Katita')).toBe(
      'I love you, Katita 💕'
    );
  });

  it('leaves a phrase with no token alone', () => {
    expect(renderPhrase('Katitos forever', 'Katito')).toBe('Katitos forever');
  });
});

describe('loveNoteFor', () => {
  it('produces a ready-to-send note for the right person', () => {
    const note = loveNoteFor(POOL, 'f', 'Katita', () => 0.99);
    expect(note).toBeTruthy();
    expect(note).not.toContain('{name}');
    expect(note).not.toContain('любимый');
  });

  it('is null-safe when the pool is empty', () => {
    expect(loveNoteFor([], 'f', 'Katita')).toBeNull();
  });
});
