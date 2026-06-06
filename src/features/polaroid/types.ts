import type { Tables } from '@kernel/supabase';

export type Polaroid = Tables<'polaroids'>;

/** Today's date as the canonical polaroid key (local time). */
export function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
