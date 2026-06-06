import type { Tables } from '@kernel/supabase';

export type Flower = Tables<'flowers'>;

/** Today's date as 'YYYY-MM-DD' (local time). */
export function todayDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
