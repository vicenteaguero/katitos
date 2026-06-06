import type { Tables } from '@kernel/supabase';

export type ChalkNote = Tables<'chalkboard_notes'>;

export const CHALK_COLORS = [
  '#ffffff',
  '#f4a6c0',
  '#a6c8ff',
  '#ffe9a6',
  '#b6f0c0',
] as const;
