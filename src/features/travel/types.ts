import type { Tables } from '@kernel/supabase';

export type Trip = Tables<'trips'>;
export type TripItem = Tables<'trip_items'>;

export type TripItemKind =
  | 'idea'
  | 'place'
  | 'todo'
  | 'game'
  | 'tracker'
  | 'note';

export const TRIP_ITEM_KINDS: {
  kind: TripItemKind;
  label: string;
  emoji: string;
}[] = [
  { kind: 'idea', label: 'Idea', emoji: '💡' },
  { kind: 'place', label: 'Place', emoji: '📍' },
  { kind: 'todo', label: 'To-do', emoji: '✅' },
  { kind: 'game', label: 'Game', emoji: '🎲' },
  { kind: 'tracker', label: 'Tracker', emoji: '📊' },
  { kind: 'note', label: 'Note', emoji: '📝' },
];

export function tripItemMeta(kind: string): { label: string; emoji: string } {
  const found = TRIP_ITEM_KINDS.find((k) => k.kind === kind);
  return found ?? { label: kind, emoji: '📝' };
}
