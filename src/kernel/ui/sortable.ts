/** A list with one item moved from `from` to `to`. Pure, and the same on both ends of a drag. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const n = list.length;
  if (n === 0) return [];
  const a = Math.max(0, Math.min(n - 1, from));
  const b = Math.max(0, Math.min(n - 1, to));
  if (a === b) return [...list];
  const out = [...list];
  const [item] = out.splice(a, 1);
  out.splice(b, 0, item);
  return out;
}

/**
 * Where a pointer at `y` would drop a row, given the rows' boxes.
 *
 * Crossing a row's midpoint is what moves it: above the midpoint of row i
 * means "before i", below means "after i".
 */
export function dropIndexAt(
  y: number,
  boxes: ReadonlyArray<{ top: number; bottom: number }>
): number {
  for (let i = 0; i < boxes.length; i++) {
    const { top, bottom } = boxes[i];
    if (y < top + (bottom - top) / 2) return i;
  }
  return Math.max(0, boxes.length - 1);
}
