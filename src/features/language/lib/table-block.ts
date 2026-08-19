import type { SupportLang, TableBlockData } from '../types';

/**
 * A table you can type on a phone.
 *
 * Nobody builds a six-case declension grid by tapping "add column" thirty
 * times. She writes it the way she would on paper — one row per line, columns
 * separated by a comma — and the first line is the headings:
 *
 *     , singular, plural
 *     nominative, стол, столы
 *     genitive, стола, столов
 *
 * Leading empty cell on the heading line is normal: the corner of the grid has
 * no title.
 */
export function parseTable(text: string, support: SupportLang): TableBlockData {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headings: [], rows: [] };

  const cells = (line: string) => line.split(',').map((c) => c.trim());
  const [first, ...rest] = lines;

  // A single line is data, not headings — otherwise typing one row shows an
  // empty table.
  if (!rest.length) return { headings: [], rows: [cells(first)] };

  const headings = cells(first).map((label) =>
    support === 'es' ? { es: label } : { en: label }
  );
  return { headings, rows: rest.map(cells) };
}

/** Turn a stored table back into the text she typed, so she can edit it. */
export function formatTable(
  data: TableBlockData,
  support: SupportLang
): string {
  const headings = data.headings ?? [];
  const rows = data.rows ?? [];
  const label = (h: { ru?: string; en?: string; es?: string }) =>
    (support === 'es' ? h.es : h.en) || h.en || h.es || h.ru || '';
  const lines = rows.map((r) => r.join(', '));
  if (headings.length) lines.unshift(headings.map(label).join(', '));
  return lines.join('\n');
}

/** How wide the widest row is — the grid is ragged until she finishes typing. */
export function columnCount(data: TableBlockData): number {
  return Math.max(
    data.headings?.length ?? 0,
    ...(data.rows ?? []).map((r) => r.length),
    0
  );
}
