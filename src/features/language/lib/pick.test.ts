import { describe, expect, it } from 'vitest';
import { answerMatches } from './answer-match';
import { headword, isMissing, meaningOf, noteOf, pick, termOf } from './pick';

const row = {
  body_ru: 'Привет',
  body_en: 'Hello',
  body_es: 'Hola',
};

describe('pick', () => {
  it('gives the language that was asked for', () => {
    expect(pick(row, 'body', 'es')).toBe('Hola');
    expect(pick(row, 'body', 'en')).toBe('Hello');
  });

  it('falls back to English rather than blanking a Spanish reader', () => {
    expect(pick({ ...row, body_es: null }, 'body', 'es')).toBe('Hello');
  });

  it('falls back to Spanish for an English reader too', () => {
    expect(pick({ ...row, body_en: null }, 'body', 'en')).toBe('Hola');
  });

  it('shows the Russian rather than nothing at all', () => {
    expect(pick({ body_ru: 'Привет' }, 'body', 'es')).toBe('Привет');
  });

  it('treats whitespace as missing — a space is not a translation', () => {
    expect(pick({ ...row, body_es: '   ' }, 'body', 'es')).toBe('Hello');
  });

  it('is empty, never undefined, when there is nothing to show', () => {
    expect(pick({}, 'body', 'es')).toBe('');
    expect(pick(null, 'body', 'en')).toBe('');
  });
});

describe('meaningOf', () => {
  it('prefers the reader’s language and falls back to the other', () => {
    expect(meaningOf({ ru: 'вода', en: 'water', es: 'agua' }, 'es')).toBe(
      'agua'
    );
    expect(meaningOf({ ru: 'вода', en: 'water' }, 'es')).toBe('water');
  });

  it('never answers with the word itself — that explains nothing', () => {
    expect(meaningOf({ ru: 'вода' }, 'es')).toBe('');
  });
});

describe('isMissing', () => {
  it('flags a block that exists but has no Spanish yet', () => {
    expect(
      isMissing({ body_ru: 'Привет', body_en: 'Hello' }, 'body', 'es')
    ).toBe(true);
  });

  it('does not flag an empty block as needing translation', () => {
    expect(isMissing({}, 'body', 'es')).toBe(false);
  });

  it('does not flag one that is already translated', () => {
    expect(isMissing(row, 'body', 'es')).toBe(false);
  });
});

describe('headword', () => {
  it('shows the accented spelling when she has marked it', () => {
    expect(headword({ ru: 'страна', stress: 'стра́на' })).toBe('стра́на');
  });

  it('falls back to the plain spelling when she has not', () => {
    expect(headword({ ru: 'страна', stress: null })).toBe('страна');
    expect(headword({ ru: 'страна' })).toBe('страна');
    expect(headword({ ru: 'страна', stress: '   ' })).toBe('страна');
  });

  it('is still typeable without the accent', () => {
    // Stress is shown, never demanded: grading strips combining marks.
    expect(
      answerMatches('страна', headword({ ru: 'страна', stress: 'стра́на' }))
    ).toBe(true);
  });
});

/**
 * The other direction.
 *
 * Everything above is a Russian lesson read in Spanish. He teaches her Spanish
 * too, and that half was never exercised: the fallback chain ended in Russian
 * whatever the lesson was, the headword came out of the `ru` column whatever
 * the word was, and a Spanish card's "meaning" was the Spanish word itself.
 */
describe('a Spanish lesson, read in Russian', () => {
  const word = {
    term_lang: 'es',
    es: 'manzana',
    en: 'apple',
    ru: 'яблоко',
  };

  it('explains in Russian first, and never in the language being taught', () => {
    const row = { body_ru: 'яблоко', body_en: 'apple', body_es: 'manzana' };
    expect(pick(row, 'body', 'ru')).toBe('яблоко');
    // Spanish is the thing being learned, so it is the last resort — the same
    // rule that puts Russian last in a Russian lesson.
    expect(pick({ body_es: 'manzana' }, 'body', 'ru')).toBe('manzana');
    expect(pick({ body_es: 'manzana', body_en: 'apple' }, 'body', 'ru')).toBe(
      'apple'
    );
  });

  it('takes the headword from the column its language names', () => {
    expect(headword(word)).toBe('manzana');
    expect(termOf(word)).toBe('manzana');
  });

  it('never gives the word back as its own meaning', () => {
    expect(meaningOf(word, 'ru')).toBe('яблоко');
    expect(meaningOf(word, 'en')).toBe('apple');
    // Even asked in its own language, it answers with a translation.
    expect(meaningOf(word, 'es')).toBe('apple');
  });

  it('still reads correctly for Russian words', () => {
    const ru = { term_lang: 'ru', ru: 'спасибо', es: 'gracias', en: 'thanks' };
    expect(headword(ru)).toBe('спасибо');
    expect(meaningOf(ru, 'es')).toBe('gracias');
  });

  it('defaults to Russian when the row does not say', () => {
    // Every row written before term_lang existed is a Russian one.
    expect(headword({ ru: 'дом', en: 'house' })).toBe('дом');
  });
});

describe('headword vs termOf', () => {
  const stressed = { term_lang: 'ru', ru: 'спасибо', stress: 'спаси́бо' };

  it('shows the stress but does not make him type it', () => {
    expect(headword(stressed)).toBe('спаси́бо');
    expect(termOf(stressed)).toBe('спасибо');
  });

  it('ignores stress for a language that writes its own', () => {
    const es = { term_lang: 'es', es: 'está', stress: 'nonsense' };
    expect(headword(es)).toBe('está');
  });
});

describe('noteOf', () => {
  it('reads the note in the reader’s language', () => {
    const word = { notes_ru: 'по-русски', notes_en: 'in english' };
    expect(noteOf(word, 'ru')).toBe('по-русски');
    expect(noteOf(word, 'es')).toBe('in english');
  });

  it('is empty rather than wrong when there is no note', () => {
    expect(noteOf({}, 'es')).toBe('');
  });
});
