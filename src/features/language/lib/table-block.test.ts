import { describe, expect, it } from 'vitest';
import { columnCount, formatTable, parseTable } from './table-block';

const DECLENSION = `, singular, plural
nominative, стол, столы
genitive, стола, столов`;

describe('parseTable', () => {
  it('reads the first line as the headings', () => {
    const t = parseTable(DECLENSION, 'en');
    expect(t.headings?.map((h) => h.en)).toEqual(['', 'singular', 'plural']);
  });

  it('keeps the corner of the grid empty, because it has no title', () => {
    expect(parseTable(DECLENSION, 'en').headings?.[0].en).toBe('');
  });

  it('reads each following line as a row', () => {
    expect(parseTable(DECLENSION, 'en').rows).toEqual([
      ['nominative', 'стол', 'столы'],
      ['genitive', 'стола', 'столов'],
    ]);
  });

  it('files the headings in the language she is writing in', () => {
    expect(parseTable(DECLENSION, 'es').headings?.[1].es).toBe('singular');
    expect(parseTable(DECLENSION, 'es').headings?.[1].en).toBeUndefined();
    // Russian is a language the headings can be written in, like the others.
    expect(parseTable(DECLENSION, 'ru').headings?.[1].ru).toBe('singular');
  });

  it('keeps the other languages when the headings are re-typed in one', () => {
    // Translating the headings into Spanish used to delete the English.
    const english = parseTable(DECLENSION, 'en');
    const both = parseTable(', singular, plural\nx, y, z', 'es', english);
    expect(both.headings?.[1]).toEqual({ en: 'singular', es: 'singular' });
    expect(both.headings?.[2]).toEqual({ en: 'plural', es: 'plural' });
  });

  it('treats a lone line as data, not as headings for an empty table', () => {
    const t = parseTable('стол, столы', 'en');
    expect(t.headings).toEqual([]);
    expect(t.rows).toEqual([['стол', 'столы']]);
  });

  it('ignores blank lines and stray spacing', () => {
    const t = parseTable('\n a , b \n\n c , d \n', 'en');
    expect(t.rows).toEqual([['c', 'd']]);
    expect(t.headings?.map((h) => h.en)).toEqual(['a', 'b']);
  });

  it('is empty, not broken, when nothing has been typed', () => {
    expect(parseTable('', 'en')).toEqual({ headings: [], rows: [] });
    expect(parseTable('   \n  ', 'en').rows).toEqual([]);
  });
});

describe('formatTable', () => {
  it('gives back what she typed, so a table can be edited', () => {
    const parsed = parseTable(DECLENSION, 'en');
    expect(formatTable(parsed, 'en')).toBe(
      ', singular, plural\nnominative, стол, столы\ngenitive, стола, столов'
    );
  });

  it('survives a round trip', () => {
    const once = parseTable(DECLENSION, 'en');
    const twice = parseTable(formatTable(once, 'en'), 'en');
    expect(twice).toEqual(once);
  });

  it('shows only the headings in the language being edited', () => {
    // Pre-filling from English meant the next blur saved English AS Spanish.
    const data = { headings: [{ en: 'singular' }], rows: [['стол']] };
    expect(formatTable(data, 'es')).toBe('\nстол');
    expect(formatTable(data, 'en')).toBe('singular\nстол');
  });
});

describe('columnCount', () => {
  it('measures the widest row', () => {
    expect(columnCount(parseTable(DECLENSION, 'en'))).toBe(3);
  });

  it('copes with a ragged table that is still being typed', () => {
    const t = parseTable('a, b, c\nx\ny, z', 'en');
    expect(columnCount(t)).toBe(3);
  });

  it('is zero for nothing at all', () => {
    expect(columnCount({})).toBe(0);
  });
});
