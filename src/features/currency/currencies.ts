// ── The bench ──────────────────────────────────────────────────────────────
// RUB and CLP lead (our everyday pair), then GEL for Georgia, USD the anchor,
// TRY for Turkey. Order here is the order the picker shows. Adding a currency
// is one row — every surface (picker, chips, widget, Settings) reads this list.
export const CURRENCIES = [
  { code: 'RUB', flag: '🇷🇺', name: 'Ruble' },
  { code: 'CLP', flag: '🇨🇱', name: 'Peso' },
  { code: 'GEL', flag: '🇬🇪', name: 'Lari' },
  { code: 'USD', flag: '🇺🇸', name: 'Dollar' },
  { code: 'TRY', flag: '🇹🇷', name: 'Lira' },
] as const;

export type Code = (typeof CURRENCIES)[number]['code'];

/** A currency's flag + name, falling back to the first if the code is unknown. */
export const meta = (code: string) =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

/** Narrow an arbitrary value (a stored or preferred code) to a known Code. */
export const isCode = (v: unknown): v is Code =>
  typeof v === 'string' && CURRENCIES.some((c) => c.code === v);
