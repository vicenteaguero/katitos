import type { DuoHalf } from '../types';

/**
 * Resolve which duo half belongs to the current user. Prefer the explicit
 * `couple_members.role` ('a'/'b'); fall back to deterministic sorted-user_id
 * ordering when role is null (it's nullable + only set in seed), so duo halves
 * are always well-defined in prod.
 */
export function resolveSelfHalf(
  selfUserId: string | null | undefined,
  selfRole: string | null | undefined,
  partnerUserId: string | null | undefined,
  partnerRole: string | null | undefined
): DuoHalf {
  if (selfRole === 'a' || selfRole === 'b') return selfRole;
  if (partnerRole === 'a' || partnerRole === 'b') {
    return partnerRole === 'a' ? 'b' : 'a';
  }
  // Deterministic fallback: lower sorted user_id is 'a'.
  if (selfUserId && partnerUserId) {
    return selfUserId < partnerUserId ? 'a' : 'b';
  }
  return 'a';
}

export const otherHalf = (h: DuoHalf): DuoHalf => (h === 'a' ? 'b' : 'a');
