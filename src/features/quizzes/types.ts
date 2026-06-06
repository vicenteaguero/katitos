import type { DeckMode, DeckRow } from '@kernel/engines/deck';

export type Deck = DeckRow;

export const DECK_KINDS = [
  {
    kind: 'image-quiz',
    label: 'Image quiz',
    mode: 'quiz' as DeckMode,
    emoji: '🖼️',
  },
  {
    kind: 'audio-quiz',
    label: 'Audio quiz',
    mode: 'quiz' as DeckMode,
    emoji: '🔊',
  },
  {
    kind: 'this-or-that',
    label: 'This or That',
    mode: 'compare' as DeckMode,
    emoji: '⚖️',
  },
  {
    kind: 'would-you-rather',
    label: 'Would You Rather',
    mode: 'compare' as DeckMode,
    emoji: '🤔',
  },
  {
    kind: 'qotd',
    label: 'Question of the Day',
    mode: 'compare' as DeckMode,
    emoji: '💬',
  },
] as const;

export type DeckKind = (typeof DECK_KINDS)[number]['kind'];
