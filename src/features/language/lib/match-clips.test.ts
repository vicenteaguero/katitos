import { describe, expect, it } from 'vitest';
import { matchClips } from './match-clips';
import type { Vocab } from '../types';

const word = (
  id: string,
  ru: string,
  translit?: string,
  stress?: string
): Vocab =>
  ({
    id,
    term_lang: 'ru',
    ru,
    en: null,
    es: null,
    transliteration: translit ?? null,
    stress: stress ?? null,
  }) as unknown as Vocab;

const file = (name: string) => new File(['x'], name, { type: 'audio/mp4' });

describe('matchClips', () => {
  const words = [
    word('aaa', 'спасибо', 'spasibo', 'спаси́бо'),
    word('bbb', 'да'),
  ];

  it('matches by the word, the transliteration, the stressed form or the id', () => {
    const got = matchClips(
      [
        file('спасибо.m4a'),
        file('SPASIBO.mp3'),
        file('спаси́бо.webm'),
        file('bbb.m4a'),
      ],
      words
    );
    expect(got.map((m) => m.word?.id)).toEqual(['aaa', 'aaa', 'aaa', 'bbb']);
  });

  it('leaves a stranger unmatched rather than guessing', () => {
    expect(matchClips([file('hello.m4a')], words)[0].word).toBeNull();
  });
});
