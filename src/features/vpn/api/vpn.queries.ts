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
 * Refetched every half minute while the tab is open — the beats land once a
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
 * My own subscription row — the URL her client polls for an updated list.
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
