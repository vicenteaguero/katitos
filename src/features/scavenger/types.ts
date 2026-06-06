import type { Tables } from '@kernel/supabase';

export type ScavengerCard = Tables<'scavenger_cards'>;
export type ScavengerClaim = Tables<'scavenger_claims'>;
export type ScavengerArgument = Tables<'scavenger_arguments'>;

export type ScavengerCardFull = ScavengerCard & {
  // 1:1 (claim.card_id is the PK) → PostgREST returns an object or null.
  scavenger_claims: ScavengerClaim | null;
  scavenger_arguments: ScavengerArgument[];
};
