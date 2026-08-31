import { describe, expect, it } from 'vitest';
import { homeworkFrom } from './homework';
import type { Vocab } from '../types';

const word = (id: string, ru: string, en: string, audio?: string): Vocab =>
  ({
    id,
    term_lang: 'ru',
    ru,
    en,
    es: null,
    audio_path: audio ?? null,
    stress: null,
    transliteration: null,
    tags: [],
  }) as unknown as Vocab;

const WORDS = [
  word('1', 'стол', 'table', '1.m4a'),
  word('2', 'стул', 'chair'),
  word('3', 'окно', 'window'),
  word('4', 'дверь', 'door'),
  word('5', 'дом', 'house', '5.m4a'),
];

describe('homeworkFrom', () => {
  const hw = homeworkFrom(WORDS, { support: 'en', target: 'ru' });

  it('asks each word three ways where it can', () => {
    expect(hw.filter((q) => q.kind === 'choice')).toHaveLength(5);
    expect(hw.filter((q) => q.kind === 'type')).toHaveLength(5);
    // Only the two with her recording can be heard.
    expect(hw.filter((q) => q.kind === 'listen')).toHaveLength(2);
  });

  it('never offers the right meaning twice, and does not always put it first', () => {
    const choices = hw.filter((q) => q.kind === 'choice');
    const positions = new Set<number>();
    for (const q of choices) {
      const options = (q.payload as { options: { id: string; en: string }[] })
        .options;
      const texts = options.map((o) => o.en);
      expect(new Set(texts).size).toBe(texts.length);
      positions.add(options.findIndex((o) => o.id === q.answer));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('writes the prompts in the language she explains in', () => {
    expect(hw[0].prompt).toBe('What does «стол» mean?');
    const es = homeworkFrom(WORDS, { support: 'es', target: 'ru' });
    expect(es[0].prompt).toBe('¿Qué significa «стол»?');
  });

  it('is the same homework every time', () => {
    expect(homeworkFrom(WORDS, { support: 'en', target: 'ru' })).toEqual(hw);
  });

  it('leaves out a word it cannot ask about', () => {
    const silent = homeworkFrom([word('9', 'x', '')], {
      support: 'en',
      target: 'ru',
    });
    expect(silent).toEqual([]);
  });
});
