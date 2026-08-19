import { describe, expect, it } from 'vitest';
import { isMissing, meaningOf, pick } from './pick';

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
