import type { Lang, TableBlockData } from '../types';

/**
 * A table you can type on a phone.
 *
 * Nobody builds a six-case declension grid by tapping "add column" thirty
 * times. She writes it the way she would on paper - one row per line, columns
 * separated by a comma - and the first line is the headings:
 *
 *     , singular, plural
 *     nominative, стол, столы
 *     genitive, стола, столов
 *
 * Leading empty cell on the heading line is normal: the corner of the grid has
 * no title.
 */
export function parseTable(
  text: string,
  support: Lang,
  previous?: TableBlockData
): TableBlockData {
  const before = previous?.headings ?? [];
  const raw = text.split('\n').map((l) => l.trim());
  while (raw.length && !raw[raw.length - 1]) raw.pop();
  // A table that already has headings may open with a BLANK first line -
  // "not translated into this language yet" (see `formatTable`). That line
  // is still the heading line; dropping it promoted the first row to the
  // headings and lost it.
  const lines = before.length ? raw : raw.filter(Boolean);
  if (!lines.length) return { headings: [], rows: [] };

  const cells = (line: string) => line.split(',').map((c) => c.trim());
  const [first, ...rest] = lines;

  // A single line is data, not headings - otherwise typing one row shows an
  // empty table.
  if (!rest.length && !before.length)
    return { headings: [], rows: [cells(first)] };

  // Each heading is filed under the language she is writing in, ON TOP of
  // whatever the other languages already said. Rebuilding the row from
  // scratch meant translating the headings into Spanish deleted the English.
  // A wholly blank heading line is the untranslated case: nothing is filed.
  const headings = first
    ? cells(first).map((label, i) => ({
        ...(before[i] ?? {}),
        [support]: label,
      }))
    : before.map((h) => ({ ...h }));
  return { headings, rows: rest.filter(Boolean).map(cells) };
}

/**
 * Turn a stored table back into the text she typed, so she can edit it.
 *
 * Only the headings in THIS language. Filling the box from another language
 * looked helpful, but the next blur saved that text under the language being
 * edited - the English headings quietly became the Spanish ones. An empty
 * heading cell now honestly means "not translated yet".
 */
export function formatTable(data: TableBlockData, support: Lang): string {
  const headings = data.headings ?? [];
  const rows = data.rows ?? [];
  const label = (h: { ru?: string; en?: string; es?: string }) =>
    h[support] ?? '';
  const lines = rows.map((r) => r.join(', '));
  if (headings.length) lines.unshift(headings.map(label).join(', '));
  return lines.join('\n');
}

/** How wide the widest row is - the grid is ragged until she finishes typing. */
export function columnCount(data: TableBlockData): number {
  return Math.max(
    data.headings?.length ?? 0,
    ...(data.rows ?? []).map((r) => r.length),
    0
  );
}
