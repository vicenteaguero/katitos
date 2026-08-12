import { describe, expect, it } from 'vitest';
import { parseBulk } from '../api/decks.mutations';

describe('parseBulk', () => {
  it('reads word | meaning | sounds-like', () => {
    expect(parseBulk('спасибо | thank you | spasiba')).toEqual([
      { text: 'спасибо', translation: 'thank you', transliteration: 'spasiba' },
    ]);
  });

  it('accepts a bare word with no translation', () => {
    expect(parseBulk('привет')).toEqual([
      { text: 'привет', translation: null, transliteration: null },
    ]);
  });

  it('takes a whole pasted lesson at once', () => {
    const rows = parseBulk(`
      привет | hello | privyet
      пока | bye | paka
      спасибо | thank you
    `);
    expect(rows).toHaveLength(3);
    expect(rows[2].transliteration).toBeNull();
  });

  it('ignores blank lines and stray whitespace', () => {
    expect(parseBulk('\n\n  да | yes  \n\n')).toEqual([
      { text: 'да', translation: 'yes', transliteration: null },
    ]);
  });

  it('returns nothing for an empty paste rather than a bad row', () => {
    expect(parseBulk('   \n  \n')).toEqual([]);
    expect(parseBulk('')).toEqual([]);
  });

  it('drops a line that is only separators', () => {
    expect(parseBulk('| | |')).toEqual([]);
  });
});
