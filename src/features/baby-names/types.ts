import type { Tables, TablesInsert } from '@kernel/supabase';

export type BabyName = Tables<'baby_names'>;
export type BabyNameVote = Tables<'baby_name_votes'>;

export type Gender = 'girl' | 'boy' | 'any';
export type VoteValue = 1 | -1;

export type BabyNameInput = Pick<
  TablesInsert<'baby_names'>,
  'name' | 'gender' | 'meaning' | 'origin' | 'notes'
>;

export type BabyNameWithVotes = BabyName & {
  baby_name_votes: Tables<'baby_name_votes'>[];
};
