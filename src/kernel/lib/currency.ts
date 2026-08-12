export type CurrencyCode = 'USD' | 'CLP' | 'RUB' | 'GEL' | string;

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
      // Always exactly one decimal — even CLP/RUB (the converter defaults).
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
 * Nobody says "one thousand two hundred point four pesos" — CLP and RUB are
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
 * Just the number, grouped and rounded the way that currency is spoken —
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
