import type { Tables } from '@kernel/supabase';

export type KnowMeQuestion = Tables<'know_me_questions'>;
/** One of the exactly-four choices on a question. */
export interface KnowMeOption {
  id: string;
  label: string;
  imagePath?: string;
}

/** A row from the `know_me_reveal` RPC (partner choices NULL until both submit). */
export interface RevealRow {
  user_id: string;
  is_self: boolean;
  own_choice: string | null;
  guess_choice: string | null;
  reaction_path: string | null;
}

/** Today's day row joined to its question, options parsed into a typed array. */
export interface QuestionWithDay {
  dayId: string;
  coupleDay: string;
  question: KnowMeQuestion;
  options: KnowMeOption[];
}

/** The `options` jsonb is stored as an array of 4 KnowMeOption objects. */
export function parseOptions(
  options: KnowMeQuestion['options']
): KnowMeOption[] {
  if (!Array.isArray(options)) return [];
  return options as unknown as KnowMeOption[];
}
