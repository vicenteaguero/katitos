import type { Tables } from '@kernel/supabase';

export type ScavengerCard = Tables<'scavenger_cards'>;
export type ScavengerClaim = Tables<'scavenger_claims'>;

/** A date card with its single completion/rating row (claim.card_id is the PK). */
export type ScavengerCardFull = ScavengerCard & {
  scavenger_claims: ScavengerClaim | null;
};

/** The shared star pot - both rate from it; nobody scores their own deck. */
export const STAR_POT = 40;
