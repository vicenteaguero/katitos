import { describe, expect, it } from 'vitest';
import {
  choicesFor,
  expectedForms,
  loadSession,
  missMessage,
  modeFor,
  nearMiss,
  saveSession,
  suggestGrade,
} from './study';
import type { ReviewState } from './srs';
import type { Vocab } from '../types';

const word = (id: string, ru: string, extra: Partial<Vocab> = {}): Vocab =>
  ({
    id,
    term_lang: 'ru',
    ru,
    en: `${ru}-en`,
    es: null,
    stress: null,
    transliteration: null,
    audio_path: null,
    part_of_speech: null,
    tags: [],
    ...extra,
  }) as unknown as Vocab;

const review = (over: Partial<ReviewState>): ReviewState => ({
  ease: 2.5,
  interval_days: 0,
  due_on: '2026-08-30',
  reps: 0,
  lapses: 0,
  ...over,
});

describe('choicesFor', () => {
  const deck = Array.from({ length: 13 }, (_, k) => word(`w${k}`, `слово${k}`));

  it('gives three distinct distractors at thirteen words', () => {
    const out = choicesFor(deck[0], deck, 0);
    expect(out).toHaveLength(4);
    expect(new Set(out.map((w) => w.id)).size).toBe(4);
    expect(out.some((w) => w.id === 'w0')).toBe(true);
  });

  it('never offers the answer spelled the same way as a distractor', () => {
    const twin = word('twin', 'Слово0');
    const out = choicesFor(deck[0], [...deck, twin], 3);
    expect(out.filter((w) => w.ru?.toLowerCase() === 'слово0')).toHaveLength(1);
  });

  it('is stable for a card and moves the right answer around', () => {
    const a = choicesFor(deck[1], deck, 5);
    const b = choicesFor(deck[1], deck, 5);
    expect(a.map((w) => w.id)).toEqual(b.map((w) => w.id));
    const slots = new Set(
      deck.map((c, i) => choicesFor(c, deck, i).findIndex((w) => w.id === c.id))
    );
    expect(slots.size).toBeGreaterThan(1);
  });

  it('prefers the same kind of word', () => {
    const verbs = [
      word('v1', 'идти', { part_of_speech: 'verb' }),
      word('v2', 'бежать', { part_of_speech: 'verb' }),
      word('v3', 'спать', { part_of_speech: 'verb' }),
      word('v4', 'есть', { part_of_speech: 'verb' }),
    ];
    const nouns = deck.map((w) => ({ ...w, part_of_speech: 'noun' }));
    const out = choicesFor(verbs[0], [...nouns, ...verbs], 1);
    expect(out.filter((w) => w.part_of_speech === 'verb')).toHaveLength(4);
  });
});

describe('modeFor', () => {
  const card = word('a', 'дом', { audio_path: 'a.mp4' });

  it('shows a new word before it asks it', () => {
    expect(modeFor(card, null, 0)).toBe('recall');
  });

  it('makes a known word be produced', () => {
    const known = review({ reps: 5, interval_days: 14 });
    expect(['type', 'listen']).toContain(modeFor(card, known, 0));
    expect(['type', 'listen']).toContain(modeFor(card, known, 1));
  });

  it('never asks by ear without a recording', () => {
    const known = review({ reps: 5, interval_days: 14 });
    expect(modeFor(word('b', 'дом'), known, 1)).toBe('type');
  });
});

describe('nearMiss', () => {
  it('knows an accent from a wrong word', () => {
    expect(nearMiss('esta', ['está'])).toBe('accent');
    expect(nearMiss('está', ['está'])).toBe('exact');
    expect(nearMiss('perro', ['está'])).toBe('wrong');
  });

  it('knows the words were run together', () => {
    expect(nearMiss('нехочу', ['не хочу'])).toBe('spaces');
  });

  it('knows a single letter off', () => {
    expect(nearMiss('спасибa', ['спасибо'])).toBe('typo');
    expect(nearMiss('дон', ['дом'])).toBe('wrong');
  });

  it('accepts the stressed spelling as a form of the word', () => {
    const forms = expectedForms(word('c', 'спасибо', { stress: 'спаси́бо' }));
    expect(nearMiss('спасибо', forms)).toBe('exact');
  });

  it('suggests a grade and says why', () => {
    expect(suggestGrade('exact')).toBe(2);
    expect(suggestGrade('accent')).toBe(1);
    expect(suggestGrade('wrong')).toBe(0);
    expect(missMessage('accent', 'esta', 'está')).toContain('accent');
  });
});

describe('a saved session', () => {
  it('comes back the same day and not the next', () => {
    saveSession('t', {
      day: '2026-08-30',
      ids: ['a', 'b'],
      i: 1,
      score: { right: 1, total: 1 },
      missed: [],
    });
    expect(loadSession('t', '2026-08-30')?.i).toBe(1);
    expect(loadSession('t', '2026-08-31')).toBeNull();
  });
});
