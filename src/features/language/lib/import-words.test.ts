import { describe, expect, it } from 'vitest';
import { parseWordList, splitKnown } from './import-words';

describe('parseWordList', () => {
  it('reads a tab-separated column pair', () => {
    expect(parseWordList('стол\ttable\nстул\tchair')).toEqual([
      { term: 'стол', meaning: 'table', tags: [] },
      { term: 'стул', meaning: 'chair', tags: [] },
    ]);
  });

  it('reads "word = meaning", and keeps commas inside either side', () => {
    expect(parseWordList('мама, папа = mum, dad')).toEqual([
      { term: 'мама, папа', meaning: 'mum, dad', tags: [] },
    ]);
  });

  it('reads dashes, semicolons and colons too', () => {
    expect(
      parseWordList('окно - window\nдверь; door\nдом: house').map(
        (w) => w.meaning
      )
    ).toEqual(['window', 'door', 'house']);
  });

  it('takes a third column as the transliteration and #tags anywhere', () => {
    expect(parseWordList('спасибо\tthank you\tspasibo #polite #a1')).toEqual([
      {
        term: 'спасибо',
        meaning: 'thank you',
        transliteration: 'spasibo',
        tags: ['polite', 'a1'],
      },
    ]);
  });

  it('keeps a bare word and skips blank lines', () => {
    expect(parseWordList('\n\nда\n\n')).toEqual([
      { term: 'да', meaning: '', tags: [] },
    ]);
  });
});

describe('splitKnown', () => {
  it('sets aside the ones already there, whatever the case, and repeats', () => {
    const words = parseWordList('Стол = table\nстул = chair\nстол = desk');
    const { fresh, known } = splitKnown(words, ['стол']);
    expect(fresh.map((w) => w.term)).toEqual(['стул']);
    expect(known.map((w) => w.term)).toEqual(['Стол', 'стол']);
  });
});
