import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { Tables } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from './use-session';

export type Member = Tables<'couple_members'>;

async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('couple_members')
    .select('*')
    .order('role', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useMembers() {
  const userId = useUserId();
  return useQuery({
    queryKey: qk.couple.members(),
    // Wait for the session. Every row here is behind `is_member()`, so firing
    // this before the token exists returns an empty list - which then sits in
    // the cache looking like "there is no couple", and the whole app renders
    // as though nobody is signed in until it goes stale.
    enabled: !!userId,
    queryFn: fetchMembers,
  });
}

export interface PartnerInfo {
  self: Member | null;
  partner: Member | null;
  isLoading: boolean;
}

/** Resolve "me" and "the other one" from the members list. */
export function usePartner(): PartnerInfo {
  const userId = useUserId();
  const { data, isLoading } = useMembers();
  const members = data ?? [];
  const self = members.find((m) => m.user_id === userId) ?? null;
  const partner = members.find((m) => m.user_id !== userId) ?? null;
  return { self, partner, isLoading };
}
