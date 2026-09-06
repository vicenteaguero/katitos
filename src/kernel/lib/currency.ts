export type CurrencyCode = 'USD' | 'CLP' | 'RUB' | 'GEL' | string;

// ── The bench ──────────────────────────────────────────────────────────────
// RUB and CLP lead (our everyday pair), then the dollar and the euro, then the
// two from the trip. Order here is the order every picker shows. Adding a
// currency is one row - the converter, Settings and the wishlists all read it.
// It lives in the kernel because more than one feature needs it, and features
// are not allowed to import each other.
export const CURRENCIES = [
  { code: 'RUB', flag: '🇷🇺', name: 'Ruble' },
  { code: 'CLP', flag: '🇨🇱', name: 'Peso' },
  { code: 'USD', flag: '🇺🇸', name: 'Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GEL', flag: '🇬🇪', name: 'Lari' },
  { code: 'TRY', flag: '🇹🇷', name: 'Lira' },
] as const;

export type Code = (typeof CURRENCIES)[number]['code'];

/**
 * The two we actually think in. Whatever pair is on screen, an amount is also
 * shown small in whichever of these isn't already involved - because half the
 * time the point of converting is to tell the other one the number.
 */
export const ANCHORS = ['CLP', 'RUB'] as const;

/** A currency's flag + name, falling back to the first if the code is unknown. */
export const currencyMeta = (code: string) =>
  CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

/** Narrow an arbitrary value (a stored or preferred code) to a known Code. */
export const isCurrencyCode = (v: unknown): v is Code =>
  typeof v === 'string' && CURRENCIES.some((c) => c.code === v);

export interface Rate {
  base: string;
  quote: string;
  rate: number;
}

/** Build a quick lookup map from a flat list of rates. */
export function indexRates(rates: Rate[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rates) map.set(`${r.base}/${r.quote}`, r.rate);
  return map;
}

/**
 * Convert an amount between currencies using a rate map. Tries the direct
 * pair, then the inverse, then triangulates through USD. Returns null if it
 * cannot be computed.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Map<string, number>
): number | null {
  if (from === to) return amount;
  // Zero needs no rate. Without this the converter opens reading "-" until the
  // rates land - which looks like it is broken, not like it is empty.
  if (amount === 0) return 0;
  const direct = rates.get(`${from}/${to}`);
  if (direct != null) return amount * direct;

  const inverse = rates.get(`${to}/${from}`);
  if (inverse != null && inverse !== 0) return amount / inverse;

  // Triangulate via USD.
  const fromUsd = rates.get(`${from}/USD`) ?? inverseOf(rates, 'USD', from);
  const usdTo = rates.get(`USD/${to}`) ?? inverseOf(rates, to, 'USD');
  if (fromUsd != null && usdTo != null) return amount * fromUsd * usdTo;

  return null;
}

function inverseOf(
  rates: Map<string, number>,
  base: string,
  quote: string
): number | null {
  const v = rates.get(`${base}/${quote}`);
  return v != null && v !== 0 ? 1 / v : null;
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      // Always exactly one decimal - even CLP/RUB (the converter defaults).
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${amount.toFixed(1)} ${currency}`;
  }
}

/**
 * How many decimals a currency is actually spoken in.
 *
 * Nobody says "one thousand two hundred point four pesos" - CLP and RUB are
 * counted whole. The others carry cents.
 */
const DECIMALS: Record<string, number> = {
  CLP: 0,
  RUB: 0,
  USD: 2,
  EUR: 2,
  GEL: 2,
  TRY: 2,
};

/**
 * Just the number, grouped and rounded the way that currency is spoken -
 * no symbol, no code.
 *
 * `formatMoney` uses Intl's `style: 'currency'`, which PREFIXES the code
 * ("CLP 1.234,5"). Every screen then appended the code again, which is where
 * "CLP 123.4 CLP" came from. Callers pair this with their own code label so
 * the code appears exactly once, after the figure.
 *
 * `formatMoney` is deliberately left alone: locked features still compile
 * against it, and this release does not touch them.
 */
export function formatAmount(amount: number, currency: CurrencyCode): string {
  const digits = DECIMALS[currency] ?? 2;
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return amount.toFixed(digits);
  }
}
