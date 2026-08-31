/**
 * The three marks a paragraph in a lesson can carry.
 *
 *     **bold**   *italic*   ==highlighted==
 *
 * That is the whole language. A teacher's page needs an ending stressed, a
 * word set off, a rule lit up — not headings, links and tables, which the
 * blocks already are. Unclosed marks stay as typed; nothing ever disappears.
 */
export type InlineKind = 'text' | 'bold' | 'italic' | 'mark';
export interface Inline {
  kind: InlineKind;
  text: string;
}

const MARKS: [string, InlineKind][] = [
  ['**', 'bold'],
  ['==', 'mark'],
  ['*', 'italic'],
];

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  let i = 0;
  const flush = () => {
    if (text) out.push({ kind: 'text', text });
    text = '';
  };
  while (i < src.length) {
    let matched = false;
    for (const [mark, kind] of MARKS) {
      if (!src.startsWith(mark, i)) continue;
      // The closing mark must exist and enclose something that is not blank.
      const close = src.indexOf(mark, i + mark.length);
      const inner = close > 0 ? src.slice(i + mark.length, close) : '';
      if (close < 0 || !inner.trim() || inner.includes('\n')) continue;
      // A single * inside a ** pair is the pair, not italics.
      if (mark === '*' && (src.startsWith('**', i) || inner.startsWith('*')))
        continue;
      flush();
      out.push({ kind, text: inner });
      i = close + mark.length;
      matched = true;
      break;
    }
    if (!matched) {
      text += src[i];
      i++;
    }
  }
  flush();
  return out;
}

/** True when the text carries any mark worth rendering. */
export function hasInlineMarks(src: string): boolean {
  return parseInline(src).some((t) => t.kind !== 'text');
}
