import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { VpnClient, VpnServer } from '../types';

/**
 * The fleet and its health, in one round trip.
 *
 * `vpn_status()` does the windowing in Postgres on purpose: the alternative is
 * pulling a week of per-minute rows over the very connection this page exists
 * to worry about.
 *
 * Refetched every half minute while the tab is open - the beats land once a
 * minute, so anything faster is asking a question whose answer cannot have
 * changed. And no polling in the background: this is a page you look at, not a
 * monitor she should pay for in battery.
 */
export function useVpnStatus() {
  return useQuery({
    queryKey: qk.vpn.status(),
    queryFn: async (): Promise<VpnServer[]> => {
      const { data, error } = await supabase.rpc('vpn_status');
      if (error) throw error;
      return (data ?? []) as VpnServer[];
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * My own subscription row - the URL her client polls for an updated list.
 *
 * RLS makes this exactly one row or none: hers is not mine to read. `null` is
 * the normal state for whoever has not been issued a config yet, not an error.
 */
export function useMyVpnClient() {
  return useQuery({
    queryKey: qk.vpn.client(),
    queryFn: async (): Promise<VpnClient | null> => {
      const { data, error } = await supabase
        .from('vpn_clients')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return (data as VpnClient | null) ?? null;
    },
  });
}

/** What `vpn-where` answers: a place, or a no. Never an address. */
export interface Where {
  on_tunnel: boolean;
  label?: string | null;
  city?: string | null;
  country?: string | null;
}

/**
 * Is this phone, right now, coming out through one of our servers?
 *
 * The comparison happens in the edge function, against a table no client can
 * read. All that comes back is a name - which is the only part she needs and
 * the only part safe to hand over.
 *
 * `retry: false` because the interesting failure (offline, or the tunnel just
 * dropped) is not one a retry fixes, and the honest answer to "I can't tell"
 * is to say so rather than spin.
 */
export function useWhereAmI() {
  return useQuery({
    queryKey: qk.vpn.where(),
    queryFn: async (): Promise<Where> => {
      const { data, error } =
        await supabase.functions.invoke<Where>('vpn-where');
      if (error) throw error;
      return data ?? { on_tunnel: false };
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}
