import { describe, expect, it } from 'vitest';
import { answerMatches } from './answer-match';

describe('what a typed answer forgives', () => {
  it('forgives capitals and punctuation', () => {
    expect(answerMatches(' Спасибо! ', 'спасибо')).toBe(true);
  });

  it('forgives ё written as е, which nobody types', () => {
    expect(answerMatches('еще', 'ещё')).toBe(true);
  });

  it('forgives the stress mark she writes and he cannot', () => {
    expect(answerMatches('страна', 'стра́на')).toBe(true);
  });

  it('forgives a hyphen written as a space', () => {
    expect(answerMatches('по русски', 'по-русски')).toBe(true);
    expect(answerMatches('по-русски', 'по русски')).toBe(true);
  });
});

describe('what it must NOT forgive', () => {
  it('does not accept words run together', () => {
    // Writing не and the prepositions separately is one of the first things a
    // Russian learner gets wrong; accepting it teaches the mistake.
    expect(answerMatches('нехочу', 'не хочу')).toBe(false);
    expect(answerMatches('вдоме', 'в доме')).toBe(false);
    expect(answerMatches('небольшой', 'не большой')).toBe(false);
  });

  it('still accepts the same words spaced normally', () => {
    expect(answerMatches('не хочу', 'не хочу')).toBe(true);
    expect(answerMatches('  не   хочу  ', 'не хочу')).toBe(true);
  });

  it('says no to a different word', () => {
    expect(answerMatches('пожалуйста', 'спасибо')).toBe(false);
  });

  it('says no to nothing at all', () => {
    expect(answerMatches('', 'спасибо')).toBe(false);
    expect(answerMatches('   ', 'спасибо')).toBe(false);
    expect(answerMatches('!!!', 'спасибо')).toBe(false);
  });
});

describe('when ё is the lesson', () => {
  it('keeps все and всё apart on request', () => {
    // Different words, not a typing slip.
    expect(answerMatches('все', 'всё', { strictYo: true })).toBe(false);
    expect(answerMatches('всё', 'всё', { strictYo: true })).toBe(true);
  });

  it('is still forgiving by default', () => {
    expect(answerMatches('все', 'всё')).toBe(true);
  });
});

describe('answerMatches across Unicode forms', () => {
  it('treats a decomposed accent and a precomposed one as the same letter', () => {
    // "está" with the acute as a separate combining mark, vs baked in.
    expect(answerMatches('esta\u0301', 'est\u00e1')).toBe(true);
    expect(answerMatches('est\u00e1', 'esta\u0301')).toBe(true);
  });

  it('keeps й whole when it arrives decomposed', () => {
    // и + combining breve is й; stripping the breve turned it into и.
    expect(answerMatches('мо\u0438\u0306', 'мой')).toBe(true);
    expect(answerMatches('мои', 'мой')).toBe(false);
  });

  it('still forgives the stress mark she writes on a vowel', () => {
    expect(answerMatches('спасибо', 'спаси\u0301бо')).toBe(true);
  });
});
