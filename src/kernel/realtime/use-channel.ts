import { useEffect, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from '@supabase/supabase-js';

type PgEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionOptions {
  table: string;
  event?: PgEvent;
  schema?: string;
  filter?: string;
  /** Re-subscribe when any of these change. */
  enabled?: boolean;
}

/**
 * Subscribe to Postgres changes on a table and run a callback for each event.
 * Cleans up on unmount. The channel name is derived to be unique per table.
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  {
    table,
    event = '*',
    schema = 'public',
    filter,
    enabled = true,
  }: SubscriptionOptions,
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void
): void {
  // Unique per hook instance so two components subscribing to the same table
  // don't collide on a shared channel topic (which makes supabase throw
  // "cannot add postgres_changes callbacks after subscribe()").
  const instanceId = useId();
  useEffect(() => {
    if (!enabled) return;
    const channel: RealtimeChannel = supabase
      .channel(`rt:${table}:${filter ?? 'all'}:${instanceId}`)
      .on(
        'postgres_changes',
        { event, schema, table, filter },
        (payload: RealtimePostgresChangesPayload<T>) => onChange(payload)
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // onChange intentionally excluded — callers pass stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, schema, filter, enabled, instanceId]);
}

/**
 * Keep a TanStack query fresh by invalidating it whenever a table changes.
 * The simplest realtime pattern for list-backed features.
 */
export function useTableSync(
  table: string,
  queryKey: readonly unknown[],
  opts: { filter?: string; enabled?: boolean } = {}
): void {
  const qc = useQueryClient();
  useRealtimeSubscription(
    { table, filter: opts.filter, enabled: opts.enabled },
    () => {
      void qc.invalidateQueries({ queryKey });
    }
  );
}
