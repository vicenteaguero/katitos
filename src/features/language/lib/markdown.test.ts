import { describe, expect, it } from 'vitest';
import { hasInlineMarks, parseInline } from './markdown';

describe('parseInline', () => {
  it('leaves plain text alone', () => {
    expect(parseInline('Я живу в Москве')).toEqual([
      { kind: 'text', text: 'Я живу в Москве' },
    ]);
  });

  it('reads bold, italic and a highlight', () => {
    expect(parseInline('в **Москве** — *в* ==предложном==')).toEqual([
      { kind: 'text', text: 'в ' },
      { kind: 'bold', text: 'Москве' },
      { kind: 'text', text: ' — ' },
      { kind: 'italic', text: 'в' },
      { kind: 'text', text: ' ' },
      { kind: 'mark', text: 'предложном' },
    ]);
  });

  it('never loses an unclosed or empty mark', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([
      { kind: 'text', text: '2 * 3 = 6' },
    ]);
    expect(parseInline('**oops')).toEqual([{ kind: 'text', text: '**oops' }]);
    expect(parseInline('a ** ** b')).toEqual([
      { kind: 'text', text: 'a ** ** b' },
    ]);
  });

  it('does not let a mark cross a line', () => {
    expect(parseInline('*a\nb*')).toEqual([{ kind: 'text', text: '*a\nb*' }]);
  });

  it('knows when there is nothing to render', () => {
    expect(hasInlineMarks('plain')).toBe(false);
    expect(hasInlineMarks('==plain==')).toBe(true);
  });
});
