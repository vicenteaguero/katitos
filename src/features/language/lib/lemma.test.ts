import { describe, expect, it } from 'vitest';
import { findWord, lemmaCandidates } from './lemma';

describe('lemmaCandidates', () => {
  it('gets a declined noun back to its dictionary form', () => {
    expect(lemmaCandidates('городе', 'ru')).toContain('город');
    expect(lemmaCandidates('столы', 'ru')).toContain('стол');
    expect(lemmaCandidates('книгу', 'ru')).toContain('книга');
  });

  it('gets a conjugated verb back to its infinitive', () => {
    expect(lemmaCandidates('говорю', 'ru')).toContain('говорить');
    expect(lemmaCandidates('читаем', 'ru')).toContain('читать');
  });

  it('does the same for Spanish', () => {
    expect(lemmaCandidates('casas', 'es')).toContain('casa');
    expect(lemmaCandidates('hablando', 'es')).toContain('hablar');
    expect(lemmaCandidates('comí', 'es')).toContain('comer');
  });

  it('starts with the word itself', () => {
    expect(lemmaCandidates('Дом', 'ru')[0]).toBe('дом');
  });
});

describe('findWord', () => {
  const rows = [
    { id: '1', ru: 'город' },
    { id: '2', ru: 'говорить' },
    { id: '3', ru: 'Ёлка' },
  ];
  const head = (r: { ru: string }) => r.ru;

  it('finds the row behind an inflected form', () => {
    expect(findWord('городе', 'ru', rows, head)?.id).toBe('1');
    expect(findWord('говорим', 'ru', rows, head)?.id).toBe('2');
  });

  it('forgives ё and capitals', () => {
    expect(findWord('елку', 'ru', rows, head)?.id).toBe('3');
  });

  it('gives up honestly', () => {
    expect(findWord('собака', 'ru', rows, head)).toBeNull();
  });
});
